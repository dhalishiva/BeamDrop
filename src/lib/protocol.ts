// Wire protocol between the two browsers, spoken over one RTCDataChannel.
//
// Control messages are JSON strings. File data travels as binary messages.
// The channel is ordered and reliable, so every binary message that arrives
// before an `end` message belongs to the file.

export const KiB = 1024;
export const MiB = 1024 * KiB;
export const GiB = 1024 * MiB;

/** Largest single binary message we send (capped further by the negotiated SCTP limit). */
export const CHUNK_MAX = 64 * KiB;
/** Used when the browser doesn't report a negotiated message-size limit. */
export const CHUNK_FALLBACK = 16 * KiB;

/** Sender: how much it reads from disk at a time. */
export const READ_BLOCK = 2 * MiB;
/** Sender: pause when this much is waiting in the channel's send buffer. */
export const SEND_BUFFER_HIGH = 8 * MiB;
export const SEND_BUFFER_LOW = 2 * MiB;

/** Receiver: chunks are glued into blocks this big before they're written. */
export const WRITE_BLOCK = 1 * MiB;
/** Receiver: ask the sender to pause above this much unwritten data, resume below the low mark. */
export const RECEIVE_QUEUE_HIGH = 32 * MiB;
export const RECEIVE_QUEUE_LOW = 8 * MiB;

export type ControlMessage =
  | { t: 'hello'; device: string }
  | { t: 'meta'; name: string; size: number; mime: string; device: string }
  | { t: 'accept' }
  | { t: 'decline' }
  | { t: 'pause' }
  | { t: 'resume' }
  | { t: 'end'; size: number }
  | { t: 'done'; size: number }
  | { t: 'cancel' };

export function parseControl(raw: string): ControlMessage | null {
  try {
    const value = JSON.parse(raw) as { t?: unknown };
    if (!value || typeof value.t !== 'string') return null;
    return value as ControlMessage;
  } catch {
    return null;
  }
}

export interface FileOffer {
  name: string;
  size: number;
  mime: string;
  device: string;
}

/** Peer-supplied metadata is untrusted: validate it before using it anywhere. */
export function validateOffer(msg: ControlMessage & { t: 'meta' }): FileOffer | null {
  const { name, size, mime, device } = msg;
  if (typeof name !== 'string' || typeof size !== 'number' || typeof mime !== 'string') return null;
  if (!Number.isSafeInteger(size) || size < 0) return null;
  return {
    name: sanitizeFileName(name),
    size,
    mime: mime.slice(0, 200),
    device: typeof device === 'string' ? device.slice(0, 60) : 'Another device',
  };
}

/** Strip anything that could make a file land somewhere unexpected or look like a different type. */
export function sanitizeFileName(input: string): string {
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*‪-‮⁦-⁩]/g, '_')
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '')
    .trim();
  const name = cleaned.slice(0, 180);
  return name || 'beamdrop-file';
}
