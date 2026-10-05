// Sinks: where received bytes go. A 10 GB file can never be held in memory, so
// each sink writes to disk as data arrives.
//
//  filesystem  File System Access API (desktop Chrome/Edge). The user picks the
//              save location and the browser writes straight to that file.
//  stream      Service-worker download (phones, Firefox, Safari). The page feeds
//              bytes to a worker that streams them to the browser's download
//              manager, which saves to the Downloads folder.
//  memory      Last resort for browsers with neither. Capped, because it holds
//              the whole file in RAM.

import { MiB } from './protocol';

export interface SaveTarget {
  name: string;
  size: number;
  mime: string;
}

export interface Sink {
  kind: 'filesystem' | 'stream' | 'memory';
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
  /** Called if the person cancels the download from the browser's own download UI. */
  onCancel?: () => void;
}

export class SaveCancelled extends Error {
  constructor() {
    super('Save cancelled');
    this.name = 'SaveCancelled';
  }
}

/** Largest file the in-memory fallback will accept. */
export const MEMORY_LIMIT = 512 * MiB;

type SinkKind = Sink['kind'];

// Loose typing for browser APIs that aren't in every TypeScript lib version.
type AnyGlobal = {
  showSaveFilePicker?: (options: unknown) => Promise<{
    createWritable: () => Promise<{
      write: (data: Uint8Array) => Promise<void>;
      close: () => Promise<void>;
      abort: () => Promise<void>;
    }>;
  }>;
  isSecureContext?: boolean;
  navigator?: Navigator & { userAgentData?: { mobile?: boolean } };
};

const g = globalThis as unknown as AnyGlobal;

function isLikelyMobile(): boolean {
  const nav = g.navigator;
  if (!nav) return false;
  if (nav.userAgentData?.mobile !== undefined) return nav.userAgentData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);
}

function pickKind(): SinkKind {
  if (typeof g.showSaveFilePicker === 'function' && !isLikelyMobile()) return 'filesystem';
  if (g.navigator && 'serviceWorker' in g.navigator && g.isSecureContext) return 'stream';
  return 'memory';
}

/** Can this browser save a file of this size? Used to warn before the person accepts. */
export function saveSupport(size: number): { ok: true; kind: SinkKind } | { ok: false } {
  const kind = pickKind();
  if (kind === 'memory' && size > MEMORY_LIMIT) return { ok: false };
  return { ok: true, kind };
}

/** Must be called from a click handler: the file picker needs a user gesture. */
export async function createSink(target: SaveTarget): Promise<Sink> {
  const kind = pickKind();
  if (kind === 'filesystem') return createFileSystemSink(target);
  if (kind === 'stream') {
    try {
      return await createStreamSink(target);
    } catch {
      if (target.size > MEMORY_LIMIT) throw new Error('No way to save a file this large');
      return createMemorySink(target);
    }
  }
  if (target.size > MEMORY_LIMIT) throw new Error('No way to save a file this large');
  return createMemorySink(target);
}

// ---------------------------------------------------------------- filesystem

async function createFileSystemSink(target: SaveTarget): Promise<Sink> {
  let writable: Awaited<
    ReturnType<NonNullable<Awaited<ReturnType<NonNullable<AnyGlobal['showSaveFilePicker']>>>['createWritable']>>
  >;
  try {
    const handle = await g.showSaveFilePicker!({ suggestedName: target.name });
    writable = await handle.createWritable();
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') throw new SaveCancelled();
    throw error;
  }
  return {
    kind: 'filesystem',
    write: (data) => writable.write(data),
    close: () => writable.close(),
    abort: () => writable.abort().catch(() => undefined),
  };
}

// ------------------------------------------------------------------- stream

const WORKER_URL = '/beamdrop-sw.js';
/** Unacknowledged bytes allowed in flight to the worker before the page waits. */
const STREAM_MAX_OUTSTANDING = 8 * MiB;

export async function registerDownloadWorker(): Promise<void> {
  if (!g.navigator || !('serviceWorker' in g.navigator) || !g.isSecureContext) return;
  try {
    await g.navigator.serviceWorker.register(WORKER_URL, { scope: '/' });
  } catch {
    /* streaming downloads fall back to the memory sink */
  }
}

async function activeWorker(): Promise<ServiceWorker> {
  const container = g.navigator!.serviceWorker;
  let registration = await container.getRegistration('/');
  if (!registration) registration = await container.register(WORKER_URL, { scope: '/' });
  const ready = await Promise.race([
    container.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('worker timeout')), 4000)),
  ]);
  const worker = ready.active ?? registration.active;
  if (!worker) throw new Error('no active worker');
  return worker;
}

async function createStreamSink(target: SaveTarget): Promise<Sink> {
  const worker = await activeWorker();
  const id = crypto.randomUUID();
  const channel = new MessageChannel();
  const port = channel.port1;

  let outstanding = 0;
  let waiter: (() => void) | null = null;
  let finished = false;

  const sink: Sink = {
    kind: 'stream',
    async write(data) {
      // The worker needs a buffer it can own; give it an exact-size one.
      const exact =
        data.byteOffset === 0 && data.byteLength === data.buffer.byteLength ? data : data.slice();
      outstanding += exact.byteLength;
      port.postMessage({ type: 'chunk', data: exact.buffer }, [exact.buffer as ArrayBuffer]);
      while (outstanding > STREAM_MAX_OUTSTANDING && !finished) {
        await new Promise<void>((resolve) => {
          waiter = resolve;
        });
      }
    },
    async close() {
      finished = true;
      port.postMessage({ type: 'end' });
      stopKeepAlive();
    },
    async abort() {
      finished = true;
      port.postMessage({ type: 'abort' });
      stopKeepAlive();
      waiter?.();
    },
  };

  port.onmessage = (event: MessageEvent) => {
    const msg = event.data as { type: string; bytes?: number };
    if (msg.type === 'consumed') {
      outstanding = Math.max(0, outstanding - (msg.bytes ?? 0));
      if (outstanding <= STREAM_MAX_OUTSTANDING / 2) {
        const resolve = waiter;
        waiter = null;
        resolve?.();
      }
    } else if (msg.type === 'cancelled' && !finished) {
      finished = true;
      stopKeepAlive();
      waiter?.();
      sink.onCancel?.();
    }
  };

  // Browsers stop idle workers after ~30 s; a ping keeps it alive during long transfers.
  const keepAlive = setInterval(() => port.postMessage({ type: 'ping' }), 10_000);
  function stopKeepAlive() {
    clearInterval(keepAlive);
  }

  // Wait until the worker has registered the stream before triggering the download.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not respond')), 4000);
    const previous = port.onmessage;
    port.onmessage = (event: MessageEvent) => {
      if ((event.data as { type: string }).type === 'ready') {
        clearTimeout(timer);
        port.onmessage = previous;
        resolve();
      }
    };
    worker.postMessage({ type: 'init', id, name: target.name, size: target.size }, [channel.port2]);
  }).catch((error) => {
    stopKeepAlive();
    throw error;
  });

  // Navigating a hidden frame to the worker's URL starts the browser download.
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.src = `/__beamdrop/${id}/${encodeURIComponent(target.name)}`;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 60_000);

  return sink;
}

// ------------------------------------------------------------------- memory

function createMemorySink(target: SaveTarget): Sink {
  const parts: BlobPart[] = [];
  return {
    kind: 'memory',
    async write(data) {
      parts.push(data.slice() as BlobPart);
    },
    async close() {
      const blob = new Blob(parts, { type: target.mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = target.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    async abort() {
      parts.length = 0;
    },
  };
}
