// Sender and receiver sessions. Each owns one Link (the direct connection) and
// walks through the transfer protocol in protocol.ts. They are plain classes
// with no React or DOM dependency, so the same code runs in the browser and in
// the Node end-to-end test.

import { makeError, type ErrorCode, type SessionError } from './errors';
import { Link, type LinkFailure } from './link';
import {
  CHUNK_FALLBACK,
  CHUNK_MAX,
  READ_BLOCK,
  RECEIVE_QUEUE_HIGH,
  RECEIVE_QUEUE_LOW,
  SEND_BUFFER_HIGH,
  SEND_BUFFER_LOW,
  WRITE_BLOCK,
  parseControl,
  validateOffer,
  type ControlMessage,
  type FileOffer,
} from './protocol';
import { SaveCancelled, createSink, type SaveTarget, type Sink } from './sink';

export interface SessionOptions {
  signalingUrl: string;
  /** Human-readable name of this device, shown to the other side. */
  device: string;
  iceServers?: RTCIceServer[];
  connectTimeoutMs?: number;
  WebSocketImpl?: typeof WebSocket;
  RTCPeerConnectionImpl?: typeof RTCPeerConnection;
}

const SPEED_WINDOW_MS = 3000;
const EMIT_INTERVAL_MS = 120;
/** Give the final control message time to leave before tearing the connection down. */
const CLOSE_DELAY_MS = 1200;

class Speedometer {
  private samples: { t: number; bytes: number }[] = [];

  reset(): void {
    this.samples = [];
  }

  sample(bytes: number): number {
    const now = Date.now();
    this.samples.push({ t: now, bytes });
    while (this.samples.length > 2 && now - this.samples[0].t > SPEED_WINDOW_MS) this.samples.shift();
    const first = this.samples[0];
    const elapsed = (now - first.t) / 1000;
    return elapsed > 0 ? Math.max(0, (bytes - first.bytes) / elapsed) : 0;
  }
}

function sendControl(channel: RTCDataChannel | null, message: ControlMessage): void {
  if (channel && channel.readyState === 'open') {
    try {
      channel.send(JSON.stringify(message));
    } catch {
      /* channel closing */
    }
  }
}

// ======================================================================= send

export type SendStatus =
  | 'starting'
  | 'waiting' // code is ready, nobody has joined
  | 'connecting' // someone joined, direct connection being set up
  | 'awaiting-accept' // connected, waiting for them to accept the file
  | 'sending'
  | 'finishing' // everything sent, waiting for the other side to confirm it saved
  | 'done'
  | 'cancelled'
  | 'failed';

export interface SendSnapshot {
  status: SendStatus;
  code: string | null;
  peerDevice: string | null;
  name: string;
  size: number;
  sent: number;
  speed: number;
  error: SessionError | null;
}

class AbortedError extends Error {}

export class SendSession {
  private snap: SendSnapshot;
  private link: Link | null = null;
  private channel: RTCDataChannel | null = null;
  private handedOver = 0; // bytes passed to the channel (some may still be buffered)
  private remotePaused = false;
  private aborted = false;
  private wake: (() => void) | null = null;
  private sampler: ReturnType<typeof setInterval> | null = null;
  private speedometer = new Speedometer();
  private lastEmit = 0;

  constructor(
    private readonly file: File,
    private readonly options: SessionOptions,
    private readonly onUpdate: (snapshot: SendSnapshot) => void,
  ) {
    this.snap = {
      status: 'starting',
      code: null,
      peerDevice: null,
      name: file.name,
      size: file.size,
      sent: 0,
      speed: 0,
      error: null,
    };
  }

  get snapshot(): SendSnapshot {
    return { ...this.snap };
  }

  start(): void {
    this.emit(true);
    this.link = new Link(
      {
        role: 'host',
        signalingUrl: this.options.signalingUrl,
        iceServers: this.options.iceServers,
        connectTimeoutMs: this.options.connectTimeoutMs,
        WebSocketImpl: this.options.WebSocketImpl,
        RTCPeerConnectionImpl: this.options.RTCPeerConnectionImpl,
      },
      {
        onCode: (code) => this.patch({ status: 'waiting', code }),
        onPeerJoined: () => this.patch({ status: 'connecting' }),
        onOpen: (channel) => this.handleOpen(channel),
        onFail: (reason) => this.handleFail(reason),
      },
    );
    this.link.start();
  }

  cancel(): void {
    if (this.isFinished()) return;
    this.aborted = true;
    sendControl(this.channel, { t: 'cancel' });
    this.patch({ status: 'cancelled' });
    this.teardown(true);
  }

  private isFinished(): boolean {
    const s = this.snap.status;
    return s === 'done' || s === 'cancelled' || s === 'failed';
  }

  private patch(change: Partial<SendSnapshot>, force = true): void {
    this.snap = { ...this.snap, ...change };
    this.emit(force);
  }

  private emit(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.lastEmit < EMIT_INTERVAL_MS) return;
    this.lastEmit = now;
    this.onUpdate({ ...this.snap });
  }

  private fail(code: ErrorCode): void {
    if (this.isFinished()) return;
    this.aborted = true;
    this.patch({ status: 'failed', error: makeError(code) });
    this.teardown(true);
  }

  private handleFail(reason: LinkFailure): void {
    if (this.isFinished()) return;
    const opened = this.link?.opened ?? false;
    if (opened) {
      this.fail(this.snap.status === 'finishing' ? 'unconfirmed' : 'connection_lost');
    } else {
      this.fail(reason);
    }
  }

  private teardown(immediate: boolean): void {
    if (this.sampler) clearInterval(this.sampler);
    this.sampler = null;
    this.wake?.();
    const link = this.link;
    if (!link) return;
    if (immediate) link.close();
    else setTimeout(() => link.close(), CLOSE_DELAY_MS);
  }

  private handleOpen(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.bufferedAmountLowThreshold = SEND_BUFFER_LOW;
    channel.onbufferedamountlow = () => this.wake?.();
    channel.onmessage = (event) => {
      if (typeof event.data === 'string') this.handleControl(event.data);
    };

    sendControl(channel, {
      t: 'meta',
      name: this.file.name,
      size: this.file.size,
      mime: this.file.type || 'application/octet-stream',
      device: this.options.device,
    });
    this.patch({ status: 'awaiting-accept' });
  }

  private handleControl(raw: string): void {
    const msg = parseControl(raw);
    if (!msg || this.isFinished()) return;

    switch (msg.t) {
      case 'hello':
        if (typeof msg.device === 'string') this.patch({ peerDevice: msg.device.slice(0, 60) });
        break;
      case 'accept':
        if (this.snap.status === 'awaiting-accept') {
          this.patch({ status: 'sending' });
          void this.stream();
        }
        break;
      case 'decline':
        this.fail('declined');
        break;
      case 'pause':
        this.remotePaused = true;
        break;
      case 'resume':
        this.remotePaused = false;
        this.wake?.();
        break;
      case 'done':
        this.patch({ status: 'done', sent: this.file.size, speed: 0 });
        this.teardown(false);
        break;
      case 'cancel':
        this.fail('peer_cancelled');
        break;
    }
  }

  private bytesDelivered(): number {
    const buffered = this.channel?.bufferedAmount ?? 0;
    return Math.max(0, Math.min(this.file.size, this.handedOver - buffered));
  }

  private async waitForRoom(channel: RTCDataChannel): Promise<void> {
    for (;;) {
      if (this.aborted) throw new AbortedError();
      if (channel.readyState !== 'open') throw new Error('channel closed');
      if (!this.remotePaused && channel.bufferedAmount <= SEND_BUFFER_HIGH) return;
      await new Promise<void>((resolve) => {
        this.wake = resolve;
        // Not every browser fires bufferedamountlow reliably, so poll as a backstop.
        setTimeout(resolve, 100);
      });
    }
  }

  private async stream(): Promise<void> {
    const channel = this.channel;
    if (!channel) return;

    const negotiated = this.link?.maxMessageSize;
    const chunk = Math.max(1024, Math.min(CHUNK_MAX, negotiated ?? CHUNK_FALLBACK));

    this.speedometer.reset();
    this.sampler = setInterval(() => {
      if (this.snap.status !== 'sending') return;
      const sent = this.bytesDelivered();
      this.patch({ sent, speed: this.speedometer.sample(sent) }, false);
    }, 250);

    try {
      let offset = 0;
      while (offset < this.file.size) {
        const end = Math.min(offset + READ_BLOCK, this.file.size);
        const block = await this.file.slice(offset, end).arrayBuffer();
        for (let i = 0; i < block.byteLength; i += chunk) {
          await this.waitForRoom(channel);
          const length = Math.min(chunk, block.byteLength - i);
          channel.send(new Uint8Array(block, i, length));
          this.handedOver += length;
        }
        offset = end;
      }
      await this.waitForRoom(channel);
      sendControl(channel, { t: 'end', size: this.file.size });
      if (!this.isFinished()) {
        this.patch({ status: 'finishing', sent: this.file.size, speed: 0 });
      }
    } catch (error) {
      if (error instanceof AbortedError) return;
      this.fail('connection_lost');
    }
  }
}

// ===================================================================== receive

export type ReceiveStatus =
  | 'connecting'
  | 'offer' // connected, the sender is offering a file
  | 'receiving'
  | 'finishing' // all bytes in, closing the file
  | 'done'
  | 'cancelled'
  | 'failed';

export interface ReceiveSnapshot {
  status: ReceiveStatus;
  offer: FileOffer | null;
  received: number;
  speed: number;
  error: SessionError | null;
  /** Set when the person dismissed the save dialog and can try again. */
  saveDismissed: boolean;
}

export interface ReceiveOptions extends SessionOptions {
  /** Test hook: replaces the browser's save mechanism. */
  sinkFactory?: (target: SaveTarget) => Promise<Sink>;
}

export class ReceiveSession {
  private snap: ReceiveSnapshot = {
    status: 'connecting',
    offer: null,
    received: 0,
    speed: 0,
    error: null,
    saveDismissed: false,
  };
  private link: Link | null = null;
  private channel: RTCDataChannel | null = null;
  private sink: Sink | null = null;

  private received = 0; // bytes arrived over the network
  private block: Uint8Array | null = null;
  private fill = 0;
  private queue: Uint8Array[] = [];
  private queuedBytes = 0;
  private written = 0;
  private pumping = false;
  private pausedSender = false;
  private endReceived = false;
  private finalizing = false;

  private sampler: ReturnType<typeof setInterval> | null = null;
  private speedometer = new Speedometer();
  private lastEmit = 0;

  constructor(
    private readonly code: string,
    private readonly options: ReceiveOptions,
    private readonly onUpdate: (snapshot: ReceiveSnapshot) => void,
  ) {}

  get snapshot(): ReceiveSnapshot {
    return { ...this.snap };
  }

  start(): void {
    this.emit(true);
    this.link = new Link(
      {
        role: 'guest',
        code: this.code,
        signalingUrl: this.options.signalingUrl,
        iceServers: this.options.iceServers,
        connectTimeoutMs: this.options.connectTimeoutMs,
        WebSocketImpl: this.options.WebSocketImpl,
        RTCPeerConnectionImpl: this.options.RTCPeerConnectionImpl,
      },
      {
        onOpen: (channel) => this.handleOpen(channel),
        onFail: (reason) => this.handleFail(reason),
      },
    );
    this.link.start();
  }

  /** Call from a click handler: saving may need to open a file picker. */
  async accept(): Promise<void> {
    const offer = this.snap.offer;
    if (this.snap.status !== 'offer' || !offer) return;

    let sink: Sink;
    try {
      const factory = this.options.sinkFactory ?? createSink;
      sink = await factory({ name: offer.name, size: offer.size, mime: offer.mime });
    } catch (error) {
      if (error instanceof SaveCancelled) {
        this.patch({ saveDismissed: true });
      } else {
        this.fail('sink_failed');
      }
      return;
    }
    if (this.snap.status !== 'offer') {
      // Cancelled or failed while the picker was open.
      void sink.abort();
      return;
    }

    this.sink = sink;
    sink.onCancel = () => this.cancel();
    this.speedometer.reset();
    this.sampler = setInterval(() => {
      if (this.snap.status !== 'receiving') return;
      this.patch(
        { received: this.received, speed: this.speedometer.sample(this.received) },
        false,
      );
    }, 250);
    this.patch({ status: 'receiving', saveDismissed: false });
    sendControl(this.channel, { t: 'accept' });
  }

  decline(): void {
    if (this.snap.status !== 'offer') return;
    sendControl(this.channel, { t: 'decline' });
    this.patch({ status: 'cancelled' });
    this.teardown(false);
  }

  cancel(): void {
    if (this.isFinished()) return;
    sendControl(this.channel, { t: 'cancel' });
    void this.sink?.abort();
    this.patch({ status: 'cancelled' });
    this.teardown(false);
  }

  private isFinished(): boolean {
    const s = this.snap.status;
    return s === 'done' || s === 'cancelled' || s === 'failed';
  }

  private patch(change: Partial<ReceiveSnapshot>, force = true): void {
    this.snap = { ...this.snap, ...change };
    this.emit(force);
  }

  private emit(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.lastEmit < EMIT_INTERVAL_MS) return;
    this.lastEmit = now;
    this.onUpdate({ ...this.snap });
  }

  private fail(code: ErrorCode): void {
    if (this.isFinished()) return;
    void this.sink?.abort();
    this.queue = [];
    this.block = null;
    this.patch({ status: 'failed', error: makeError(code) });
    this.teardown(true);
  }

  private handleFail(reason: LinkFailure): void {
    if (this.isFinished()) return;
    const opened = this.link?.opened ?? false;
    this.fail(opened ? 'connection_lost' : reason);
  }

  private teardown(immediate: boolean): void {
    if (this.sampler) clearInterval(this.sampler);
    this.sampler = null;
    const link = this.link;
    if (!link) return;
    if (immediate) link.close();
    else setTimeout(() => link.close(), CLOSE_DELAY_MS);
  }

  private handleOpen(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.onmessage = (event) => {
      const data = event.data as unknown;
      if (typeof data === 'string') this.handleControl(data);
      else if (data instanceof ArrayBuffer) this.handleChunk(new Uint8Array(data));
      else if (ArrayBuffer.isView(data)) {
        this.handleChunk(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      }
    };
    sendControl(channel, { t: 'hello', device: this.options.device });
  }

  private handleControl(raw: string): void {
    const msg = parseControl(raw);
    if (!msg || this.isFinished()) return;

    switch (msg.t) {
      case 'meta': {
        if (this.snap.status !== 'connecting') return;
        const offer = validateOffer(msg);
        if (!offer) {
          this.fail('bad_offer');
          return;
        }
        this.patch({ status: 'offer', offer });
        break;
      }
      case 'end':
        this.flushPartialBlock();
        this.endReceived = true;
        void this.maybeFinalize();
        break;
      case 'cancel':
        void this.sink?.abort();
        this.fail('peer_cancelled');
        break;
    }
  }

  private handleChunk(chunk: Uint8Array): void {
    const offer = this.snap.offer;
    if (this.snap.status !== 'receiving' || !offer) return;

    this.received += chunk.byteLength;
    if (this.received > offer.size) {
      this.fail('size_mismatch');
      return;
    }

    let position = 0;
    while (position < chunk.length) {
      if (!this.block) {
        this.block = new Uint8Array(WRITE_BLOCK);
        this.fill = 0;
      }
      const n = Math.min(this.block.length - this.fill, chunk.length - position);
      this.block.set(chunk.subarray(position, position + n), this.fill);
      this.fill += n;
      position += n;
      if (this.fill === this.block.length) {
        this.pushBlock(this.block);
        this.block = null;
        this.fill = 0;
      }
    }
  }

  private flushPartialBlock(): void {
    if (this.block && this.fill > 0) this.pushBlock(this.block.subarray(0, this.fill));
    this.block = null;
    this.fill = 0;
  }

  private pushBlock(block: Uint8Array): void {
    this.queue.push(block);
    this.queuedBytes += block.length;
    if (!this.pausedSender && this.queuedBytes > RECEIVE_QUEUE_HIGH) {
      this.pausedSender = true;
      sendControl(this.channel, { t: 'pause' });
    }
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.pumping || !this.sink) return;
    this.pumping = true;
    try {
      while (this.queue.length) {
        const block = this.queue.shift()!;
        const length = block.length; // a sink may take ownership of the buffer
        await this.sink.write(block);
        this.written += length;
        this.queuedBytes -= length;
        if (this.pausedSender && this.queuedBytes < RECEIVE_QUEUE_LOW) {
          this.pausedSender = false;
          sendControl(this.channel, { t: 'resume' });
        }
      }
    } catch {
      this.pumping = false;
      this.fail('sink_failed');
      return;
    }
    this.pumping = false;
    void this.maybeFinalize();
  }

  private async maybeFinalize(): Promise<void> {
    const offer = this.snap.offer;
    if (!this.endReceived || this.queue.length || this.pumping || this.finalizing) return;
    if (!offer || !this.sink || this.isFinished()) return;
    this.finalizing = true;

    if (this.received !== offer.size || this.written !== offer.size) {
      this.fail('size_mismatch');
      return;
    }

    this.patch({ status: 'finishing', received: offer.size, speed: 0 });
    try {
      await this.sink.close();
    } catch {
      this.fail('sink_failed');
      return;
    }
    sendControl(this.channel, { t: 'done', size: offer.size });
    this.patch({ status: 'done', received: offer.size });
    this.teardown(false);
  }
}
