# BeamDrop by Kriosity

Send a file of any size from one device to another, browser to browser. Nothing is uploaded, so there is no size limit and nothing is stored.

```
 sender browser ══════ WebRTC data channel (encrypted) ══════ receiver browser
        ╲                                                        ╱
         ╲___ signaling server (WebSocket, introductions only) _╱
```

A tiny signaling server introduces the two browsers (a short code → a room → SDP/ICE relay). As soon as the data channel opens, the signaling socket is closed and the room is deleted. The file then streams in 64 KiB chunks, with backpressure on both ends, and is written to disk as it arrives.

## Run it locally

```bash
npm install
npm run dev          # web on :5173, signaling on :8787 (proxied under /ws)
```

Open <http://localhost:5173/app> in two browser windows: **Send** in one, **Receive** in the other.

Phones need a secure context for the download service worker, so to try a real phone-to-computer transfer, deploy a preview (see below) rather than opening `http://<your-lan-ip>:5173`.

| Command | What it does |
| --- | --- |
| `npm run dev` | web + signaling together |
| `npm run build` | typecheck and production build into `dist/` |
| `npm run test:e2e` | real signaling server + real WebRTC (libdatachannel) transfer tests |
| `npm run start:signal` | signaling server only (production entry point) |

## Deploy

**Frontend** (static): Vercel works as-is, `vercel.json` handles SPA routing and the service worker headers. Set `VITE_SIGNALING_URL` to your signaling server, for example `wss://signal.example.com/ws`.

**Signaling server on Render (free):** `render.yaml` is a ready Blueprint (Singapore region, free plan). New → Blueprint → pick this repo. After the site is on Vercel, add `ALLOWED_ORIGINS` in Render's Environment tab. Free services sleep after 15 idle minutes and take about a minute to wake, so the app pings `/health` when it opens and the UI explains a slow first connection.

**Signaling server** (`server/index.js`): needs a host that keeps WebSocket connections open, so not Vercel serverless. Fly.io, Railway, Render or any small VPS is fine. Set:

- `ALLOWED_ORIGINS` — your site origin(s), comma separated, e.g. `https://beamdrop.vercel.app` (trailing slash is ignored; `*.vercel.app` wildcards work; rejected origins are logged)
- `TRUST_PROXY=1` — when behind a platform proxy, so rate limiting sees real client IPs
- `PORT` — default 8787

Everything is in memory. It needs no database.

**TURN relay** (optional, recommended before real users): about 20–30% of connections cannot go direct (strict corporate Wi-Fi, some mobile carriers). Run [coturn](https://github.com/coturn/coturn) with `use-auth-secret` and set `TURN_URLS` and `TURN_SECRET` on the signaling server. It then hands each session short-lived relay credentials, so no long-lived secret ships to browsers. Relayed transfers use your bandwidth, so watch the bill.

## How the pieces fit

```
server/index.js            signaling: rooms, rate limits, TURN credentials
public/beamdrop-sw.js      download worker: streams received bytes to the browser's download manager
src/lib/link.ts            one WebRTC data channel via signaling
src/lib/protocol.ts        wire format, limits, filename sanitising
src/lib/session.ts         SendSession / ReceiveSession (chunking, backpressure, accept flow)
src/lib/sink.ts            where bytes land: File System Access API, service worker stream, or memory
src/lib/hooks.ts           React bindings, wake lock, "leave page?" guard
src/pages/                 marketing home, app, help, terms, privacy, acceptable use, cookies, contact
src/legal.config.ts        operator name, contact emails, governing courts
test/e2e.ts                end-to-end tests
```

**Saving large files.** Desktop Chrome/Edge use the File System Access API (the person picks the location). Phones, Firefox and Safari use the service worker to stream into the browser's normal download. A last-resort in-memory path is capped at 512 MiB and the UI refuses larger files rather than crashing the tab.

**Flow control.** The sender stops when 8 MiB is buffered in the data channel. The receiver tells the sender to pause when more than 32 MiB of received data is waiting to be written, and to resume below 8 MiB, so a slow disk never balloons memory.

## Before you launch

1. **Legal pages are a careful first draft, not legal advice.** Set the registered entity in `src/legal.config.ts` (`legalName`, `address`), then have a lawyer review the Terms and Privacy pages. Choices worth a second opinion: the ₹1,000 liability floor, Gautam Buddh Nagar jurisdiction, and the 18+ age line.
2. **Add TURN** (above), or expect some connections to fail.
3. **Social preview.** Icons and a 1200×630 preview image are in `public/`. The preview URL is made absolute at build time from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`; set `SITE_URL` to use a custom domain instead.
4. **Receiver-only consent today.** The sender sees who connected and can cancel, and nothing is sent until the receiver accepts, but a stranger who guesses a live code (6 characters, rate limited) would see the file name and size. Adding a "Allow this device?" step on the sender side closes that gap.

## Known limits

- One file per transfer, one receiver per code.
- No resume after a dropped connection.
- Files are verified by byte count; the transport already authenticates every message. There is no end-to-end file hash because Web Crypto cannot hash incrementally.
- The File System Access path (desktop Chrome/Edge save dialog) is not covered by the automated tests, since headless browsers cannot answer a save dialog. The service-worker path and the core transfer engine are.

## Ideas, roughly in order

Per-upload links (`/r/CODE`), sender-side approval, resume, folder send (streamed zip), paid tier / higher relay allowance, analytics (with consent).

---

BeamDrop is a product of Kriosity.
