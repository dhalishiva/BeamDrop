// BeamDrop download worker.
//
// While a file is being received, the page hands bytes to this worker over a
// MessageChannel and the worker streams them to the browser's download manager.
// That lets a phone save a multi-gigabyte file straight to Downloads without
// ever holding it in memory. Nothing is stored or sent anywhere else.

const streams = new Map();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'init' || !event.ports[0]) return;

  const { id, name, size } = data;
  const port = event.ports[0];
  const queue = [];
  let wake = null;
  let ended = false;
  let aborted = false;

  const notify = () => {
    if (wake) {
      const resolve = wake;
      wake = null;
      resolve();
    }
  };

  port.onmessage = (message) => {
    const m = message.data;
    if (m.type === 'chunk') queue.push(m.data);
    else if (m.type === 'end') ended = true;
    else if (m.type === 'abort') aborted = true;
    // 'ping' only exists to keep this worker alive.
    notify();
  };

  // Pull-based: the browser asks for data as fast as it can write it to disk,
  // and each pull acknowledges one chunk so the page can throttle itself.
  const stream = new ReadableStream(
    {
      async pull(controller) {
        for (;;) {
          if (aborted) {
            controller.error(new Error('Transfer cancelled'));
            return;
          }
          if (queue.length) {
            const buffer = queue.shift();
            controller.enqueue(new Uint8Array(buffer));
            port.postMessage({ type: 'consumed', bytes: buffer.byteLength });
            return;
          }
          if (ended) {
            controller.close();
            return;
          }
          await new Promise((resolve) => {
            wake = resolve;
          });
        }
      },
      cancel() {
        queue.length = 0;
        port.postMessage({ type: 'cancelled' });
      },
    },
    new CountQueuingStrategy({ highWaterMark: 1 }),
  );

  streams.set(id, { stream, name, size });
  port.postMessage({ type: 'ready' });
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/__beamdrop/')) return;

  const id = url.pathname.split('/')[2];
  const entry = streams.get(id);
  if (!entry) {
    event.respondWith(new Response('This download is no longer available.', { status: 404 }));
    return;
  }
  streams.delete(id);

  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(entry.name).replace(
      /['()*]/g,
      (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
    )}`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (Number.isSafeInteger(entry.size) && entry.size > 0) {
    headers.set('Content-Length', String(entry.size));
  }

  event.respondWith(new Response(entry.stream, { headers }));
});
