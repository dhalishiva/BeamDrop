// BeamDrop signaling server.
//
// Its only job is to introduce two browsers: it relays the connection details
// (SDP offers/answers and ICE candidates) between the two peers in a room.
// File data never touches this server.
//
// Everything lives in memory. Nothing is written to disk.

import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
// Accepts "https://site.com", "site.com", trailing slashes, or a wildcard like "*.vercel.app".
function normalizeOrigin(value) {
  return value.trim().toLowerCase().replace(/\/+$/, '');
}
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

function originAllowed(origin) {
  if (!ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes('*')) return true;
  if (!origin) return false;
  const o = normalizeOrigin(origin);
  let host = o;
  try {
    host = new URL(o).host;
  } catch {
    /* keep raw */
  }
  return ALLOWED_ORIGINS.some((rule) => {
    if (rule === o || rule === host) return true;
    if (rule.includes('*')) {
      const re = new RegExp(
        '^' + rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]*(?:\\.[^.]*)*') + '$',
      );
      return re.test(o) || re.test(host);
    }
    return false;
  });
}
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const TURN_URLS = (process.env.TURN_URLS || '').split(',').map((s) => s.trim()).filter(Boolean);
const TURN_SECRET = process.env.TURN_SECRET || '';

// Room codes avoid look-alike characters (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const ROOM_WAIT_MS = 15 * 60 * 1000; // a room with no receiver expires after 15 minutes
const ROOM_MAX_MS = 24 * 60 * 60 * 1000; // hard cap on any room's lifetime
const MAX_ROOMS = 5000;
const MAX_MESSAGE_BYTES = 64 * 1024;

// Abuse limits (per client IP).
const MSG_LIMIT = { windowMs: 60_000, max: 300 };
const BAD_JOIN_LIMIT = { windowMs: 60_000, max: 10 };
const CREATE_LIMIT = { windowMs: 60_000, max: 30 };

/** @type {Map<string, {code: string, host: any, guest: any|null, createdAt: number}>} */
const rooms = new Map();
/** @type {Map<string, {count: number, resetAt: number}>} */
const counters = new Map();

function hit(key, { windowMs, max }) {
  const now = Date.now();
  let entry = counters.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    counters.set(key, entry);
  }
  entry.count += 1;
  return entry.count <= max;
}

function peek(key) {
  const entry = counters.get(key);
  return entry && entry.resetAt > Date.now() ? entry.count : 0;
}

function newCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
  return null;
}

function iceServers() {
  if (!TURN_URLS.length || !TURN_SECRET) return [];
  // coturn "use-auth-secret": username is an expiry timestamp, credential is an HMAC of it.
  const username = String(Math.floor(Date.now() / 1000) + 6 * 60 * 60);
  const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
  return [{ urls: TURN_URLS, username, credential }];
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function clientIp(req) {
  if (TRUST_PROXY) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function closeRoom(room, reason) {
  rooms.delete(room.code);
  for (const peer of [room.host, room.guest]) {
    if (!peer) continue;
    peer.room = null;
    if (reason) send(peer, { type: 'peer-left', reason });
  }
}

function leave(ws) {
  const room = ws.room;
  if (!room) return;
  ws.room = null;
  const other = room.host === ws ? room.guest : room.host;
  rooms.delete(room.code);
  if (other) {
    other.room = null;
    send(other, { type: 'peer-left', reason: 'closed' });
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('BeamDrop signaling server');
});

const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: MAX_MESSAGE_BYTES,
  verifyClient: ({ origin }, done) => {
    if (originAllowed(origin)) return done(true);
    console.warn(`rejected origin "${origin || '(none)'}"; ALLOWED_ORIGINS = ${ALLOWED_ORIGINS.join(', ')}`);
    done(false, 403, 'Origin not allowed');
  },
});

wss.on('connection', (ws, req) => {
  const ip = clientIp(req);
  ws.room = null;
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    if (!hit(`msg:${ip}`, MSG_LIMIT)) {
      send(ws, { type: 'error', reason: 'rate_limited' });
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', reason: 'bad_message' });
      return;
    }
    if (!msg || typeof msg.type !== 'string') {
      send(ws, { type: 'error', reason: 'bad_message' });
      return;
    }

    switch (msg.type) {
      case 'create': {
        if (ws.room) return;
        if (!hit(`create:${ip}`, CREATE_LIMIT) || rooms.size >= MAX_ROOMS) {
          send(ws, { type: 'error', reason: 'rate_limited' });
          return;
        }
        const code = newCode();
        if (!code) {
          send(ws, { type: 'error', reason: 'busy' });
          return;
        }
        const room = { code, host: ws, guest: null, createdAt: Date.now() };
        rooms.set(code, room);
        ws.room = room;
        send(ws, { type: 'created', code, iceServers: iceServers() });
        return;
      }

      case 'join': {
        if (ws.room) return;
        if (peek(`badjoin:${ip}`) >= BAD_JOIN_LIMIT.max) {
          send(ws, { type: 'error', reason: 'rate_limited' });
          return;
        }
        const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) {
          hit(`badjoin:${ip}`, BAD_JOIN_LIMIT);
          send(ws, { type: 'error', reason: 'not_found' });
          return;
        }
        if (room.guest) {
          hit(`badjoin:${ip}`, BAD_JOIN_LIMIT);
          send(ws, { type: 'error', reason: 'full' });
          return;
        }
        room.guest = ws;
        ws.room = room;
        send(ws, { type: 'joined', iceServers: iceServers() });
        send(room.host, { type: 'peer-joined' });
        return;
      }

      case 'signal': {
        const room = ws.room;
        if (!room || !room.guest) return;
        const other = room.host === ws ? room.guest : room.host;
        send(other, { type: 'signal', data: msg.data });
        return;
      }

      case 'leave': {
        leave(ws);
        return;
      }

      case 'ping': {
        // Clients ping while waiting so idle-sleeping hosts see activity on the socket.
        send(ws, { type: 'pong' });
        return;
      }

      default:
        send(ws, { type: 'error', reason: 'bad_message' });
    }
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

// Drop dead sockets and expire stale rooms and counters.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }

  const now = Date.now();
  for (const room of rooms.values()) {
    const waitedTooLong = !room.guest && now - room.createdAt > ROOM_WAIT_MS;
    const livedTooLong = now - room.createdAt > ROOM_MAX_MS;
    if (waitedTooLong || livedTooLong) {
      const reason = waitedTooLong ? 'expired' : 'timeout';
      const sockets = [room.host, room.guest];
      closeRoom(room, reason);
      for (const peer of sockets) peer?.close(1000, reason);
    }
  }
  for (const [key, entry] of counters) if (entry.resetAt <= now) counters.delete(key);
}, 30_000).unref();

server.listen(PORT, () => {
  console.log(`BeamDrop signaling listening on :${PORT} (path /ws)`);
});

export { server, wss };
