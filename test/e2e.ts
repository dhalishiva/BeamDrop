// End-to-end test: real signaling server + real WebRTC data channels (libdatachannel
// via node-datachannel's browser-compatible polyfill) + the real session code.
//
//   npm run test:e2e
//
// Covers: large transfer with hash check, slow-disk backpressure (pause/resume),
// empty file, decline, cancel mid-transfer, bad code, and filename sanitising.

import crypto from 'node:crypto';
import nodeDataChannel from 'node-datachannel';
import { RTCPeerConnection } from 'node-datachannel/polyfill';

process.env.PORT = '18787';
const { server } = await import('../server/index.js');

import { sanitizeFileName, MiB } from '../src/lib/protocol.ts';
import {
  ReceiveSession,
  SendSession,
  type ReceiveSnapshot,
  type SendSnapshot,
} from '../src/lib/session.ts';
import type { Sink } from '../src/lib/sink.ts';

const SIGNALING = 'ws://127.0.0.1:18787/ws';
const baseOptions = {
  signalingUrl: SIGNALING,
  iceServers: [] as RTCIceServer[],
  connectTimeoutMs: 15_000,
  RTCPeerConnectionImpl: RTCPeerConnection as unknown as typeof globalThis.RTCPeerConnection,
};

let failures = 0;
function check(name: string, condition: boolean, detail = ''): void {
  if (condition) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

function waitFor<T>(label: string, poll: () => T | undefined | false, ms = 60_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const value = poll();
      if (value) {
        clearInterval(timer);
        resolve(value as T);
      } else if (Date.now() - started > ms) {
        clearInterval(timer);
        reject(new Error(`timed out waiting for ${label}`));
      }
    }, 20);
  });
}

/** Deterministic, non-repeating content so reordering or loss changes the hash. */
function makeFile(sizeBytes: number, name: string): { file: File; sha256: string } {
  const hash = crypto.createHash('sha256');
  const parts: Uint8Array[] = [];
  let seed = 0x9e3779b9;
  for (let offset = 0; offset < sizeBytes; offset += MiB) {
    const length = Math.min(MiB, sizeBytes - offset);
    const buf = new Uint8Array(length);
    for (let i = 0; i < length; i += 4) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const v = seed >>> 0;
      buf[i] = v;
      if (i + 1 < length) buf[i + 1] = v >>> 8;
      if (i + 2 < length) buf[i + 2] = v >>> 16;
      if (i + 3 < length) buf[i + 3] = v >>> 24;
    }
    hash.update(buf);
    parts.push(buf);
  }
  return { file: new File(parts as BlobPart[], name, { type: 'application/octet-stream' }), sha256: hash.digest('hex') };
}

class HashSink implements Sink {
  kind = 'memory' as const;
  hash = crypto.createHash('sha256');
  bytes = 0;
  closed = false;
  aborted = false;
  maxQueued = 0;
  sawPause = false;
  constructor(
    private readonly delayMs: number,
    private readonly probe: () => { queued: number; paused: boolean },
  ) {}
  async write(data: Uint8Array): Promise<void> {
    const { queued, paused } = this.probe();
    this.maxQueued = Math.max(this.maxQueued, queued);
    if (paused) this.sawPause = true;
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    this.hash.update(data);
    this.bytes += data.byteLength;
  }
  async close(): Promise<void> {
    this.closed = true;
  }
  async abort(): Promise<void> {
    this.aborted = true;
  }
}

interface Run {
  sender: SendSession;
  receiver: ReceiveSession;
  tx: () => SendSnapshot;
  rx: () => ReceiveSnapshot;
  sink: () => HashSink | null;
}

let current: Run | null = null;

async function pair(file: File, sinkDelayMs: number): Promise<Run> {
  let tx!: SendSnapshot;
  let rx!: ReceiveSnapshot;
  let sink: HashSink | null = null;

  const sender = new SendSession(file, { ...baseOptions, device: 'Test sender' }, (s) => (tx = s));
  sender.start();
  const code = await waitFor('room code', () => tx?.code);

  const receiver: ReceiveSession = new ReceiveSession(
    code,
    {
      ...baseOptions,
      device: 'Test receiver',
      sinkFactory: async () => {
        sink = new HashSink(sinkDelayMs, () => {
          const r = receiver as unknown as { queuedBytes: number; pausedSender: boolean };
          return { queued: r.queuedBytes, paused: r.pausedSender };
        });
        return sink;
      },
    },
    (s) => (rx = s),
  );
  receiver.start();

  current = { sender, receiver, tx: () => tx, rx: () => rx, sink: () => sink };
  return current;
}

async function main(): Promise<void> {
  console.log('filename sanitising');
  check('strips path separators', !/[\\/]/.test(sanitizeFileName('../../etc/passwd')));
  check('strips leading dots', !sanitizeFileName('.bashrc').startsWith('.'));
  check('strips RTL override', !/‮/.test(sanitizeFileName('invoice‮gpj.exe')));
  check('never empty', sanitizeFileName('///') !== '');
  check('length capped', sanitizeFileName('a'.repeat(500)).length <= 180);

  console.log('large transfer, fast disk (192 MiB)');
  {
    const { file, sha256 } = makeFile(192 * MiB, 'big.bin');
    const run = await pair(file, 0);
    const offer = await waitFor('offer', () => run.rx()?.status === 'offer' && run.rx().offer);
    check('offer carries name and size', offer.name === 'big.bin' && offer.size === file.size);
    check('sender sees receiver device', (await waitFor('device', () => run.tx().peerDevice)) === 'Test receiver');
    check('sender is awaiting accept', run.tx().status === 'awaiting-accept');

    const started = Date.now();
    await run.receiver.accept();
    await waitFor('receiver done', () => run.rx().status === 'done', 120_000);
    await waitFor('sender done', () => run.tx().status === 'done');
    const seconds = (Date.now() - started) / 1000;

    const sink = run.sink()!;
    check('all bytes written', sink.bytes === file.size, `${sink.bytes} vs ${file.size}`);
    check('sha-256 matches', sink.hash.digest('hex') === sha256);
    check('sink closed cleanly', sink.closed && !sink.aborted);
    console.log(`        ${(file.size / MiB / seconds).toFixed(0)} MiB/s over loopback in ${seconds.toFixed(1)} s`);
  }

  console.log('slow disk triggers pause/resume (160 MiB, 40 ms per 1 MiB write)');
  {
    const { file, sha256 } = makeFile(160 * MiB, 'slow.bin');
    const run = await pair(file, 40);
    await waitFor('offer', () => run.rx()?.status === 'offer');
    await run.receiver.accept();
    await waitFor('receiver done', () => run.rx().status === 'done', 180_000);
    await waitFor('sender done', () => run.tx().status === 'done');
    const sink = run.sink()!;
    check('sha-256 matches', sink.hash.digest('hex') === sha256);
    check('receiver asked the sender to pause', sink.sawPause);
    check(
      'receive queue stayed bounded',
      sink.maxQueued < 64 * MiB,
      `peak queue ${(sink.maxQueued / MiB).toFixed(1)} MiB`,
    );
    console.log(`        peak unwritten queue ${(sink.maxQueued / MiB).toFixed(1)} MiB`);
  }

  console.log('empty file');
  {
    const run = await pair(new File([], 'empty.txt'), 0);
    await waitFor('offer', () => run.rx()?.status === 'offer');
    await run.receiver.accept();
    await waitFor('receiver done', () => run.rx().status === 'done');
    await waitFor('sender done', () => run.tx().status === 'done');
    check('zero bytes written', run.sink()!.bytes === 0 && run.sink()!.closed);
  }

  console.log('receiver declines');
  {
    const run = await pair(makeFile(MiB, 'no.bin').file, 0);
    await waitFor('offer', () => run.rx()?.status === 'offer');
    run.receiver.decline();
    await waitFor('sender failed', () => run.tx().status === 'failed');
    check('sender told it was declined', run.tx().error?.code === 'declined');
  }

  console.log('receiver cancels mid-transfer (96 MiB, slow disk)');
  {
    const run = await pair(makeFile(96 * MiB, 'cancel.bin').file, 15);
    await waitFor('offer', () => run.rx()?.status === 'offer');
    await run.receiver.accept();
    await waitFor('some progress', () => run.rx().received > 8 * MiB);
    run.receiver.cancel();
    await waitFor('sender failed', () => run.tx().status === 'failed');
    check('sender told it was cancelled', run.tx().error?.code === 'peer_cancelled');
    check('sink was aborted', run.sink()!.aborted === true);
  }

  console.log('sender cancels while waiting');
  {
    let tx!: SendSnapshot;
    const sender = new SendSession(makeFile(MiB, 'w.bin').file, { ...baseOptions, device: 'S' }, (s) => (tx = s));
    sender.start();
    await waitFor('code', () => tx?.code);
    sender.cancel();
    check('status is cancelled', tx.status === 'cancelled');
  }

  console.log('wrong code');
  {
    let rx!: ReceiveSnapshot;
    const receiver = new ReceiveSession('ZZZZZZ', { ...baseOptions, device: 'R' }, (s) => (rx = s));
    receiver.start();
    await waitFor('failure', () => rx?.status === 'failed');
    check('not_found error', rx.error?.code === 'not_found');
  }

  console.log('second receiver is turned away');
  {
    const run = await pair(makeFile(MiB, 'one.bin').file, 0);
    await waitFor('offer', () => run.rx()?.status === 'offer');
    let rx2!: ReceiveSnapshot;
    const code = run.tx().code!;
    const intruder = new ReceiveSession(code, { ...baseOptions, device: 'Intruder' }, (s) => (rx2 = s));
    intruder.start();
    await waitFor('failure', () => rx2?.status === 'failed');
    check('room is single-use once connected', ['not_found', 'full'].includes(rx2.error?.code ?? ''));
    run.sender.cancel();
  }
}

try {
  await main();
} catch (error) {
  failures++;
  console.error('  FAIL ', (error as Error).message);
  if (current) {
    console.error('  sender  :', JSON.stringify(current.tx()));
    console.error('  receiver:', JSON.stringify(current.rx()));
  }
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
nodeDataChannel.cleanup();
server.close();
process.exit(failures === 0 ? 0 : 1);
