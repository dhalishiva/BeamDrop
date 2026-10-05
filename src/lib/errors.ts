export type ErrorCode =
  | 'not_found'
  | 'full'
  | 'rate_limited'
  | 'busy'
  | 'expired'
  | 'timeout'
  | 'signal_unreachable'
  | 'peer_left'
  | 'connect_failed'
  | 'connection_lost'
  | 'unconfirmed'
  | 'sink_failed'
  | 'size_mismatch'
  | 'peer_cancelled'
  | 'declined'
  | 'unsupported'
  | 'bad_offer';

// Each message says what happened and what to do next.
const MESSAGES: Record<ErrorCode, string> = {
  not_found: 'No transfer uses that code. Check the code, or ask the sender to start again.',
  full: 'Another device already joined this transfer. Ask the sender to start a new one.',
  rate_limited: 'Too many attempts. Wait a minute and try again.',
  busy: 'BeamDrop is busy right now. Try again in a moment.',
  expired: 'This code expired. Ask the sender to start a new transfer.',
  timeout: 'This code expired. Ask the sender to start a new transfer.',
  signal_unreachable:
    "Can't reach the BeamDrop connection service. Check your internet connection and try again.",
  peer_left: 'The other device left before the transfer started.',
  connect_failed:
    "The two devices couldn't connect directly. Try the same Wi-Fi network, turn off any VPN, and try again.",
  connection_lost:
    'The connection dropped. Keep both devices open and online, then start the transfer again.',
  unconfirmed:
    'The other device disconnected before confirming. Check whether the file arrived there.',
  sink_failed: "This device couldn't save the file. Check your free storage and try again.",
  size_mismatch: 'The file arrived incomplete, so it was not kept. Start the transfer again.',
  peer_cancelled: 'The other device cancelled the transfer.',
  declined: 'The other device declined the file.',
  unsupported:
    "This browser can't make direct connections. Use a current version of Chrome, Edge, Firefox or Safari.",
  bad_offer: "The other device sent file details BeamDrop couldn't read. Start the transfer again.",
};

export interface SessionError {
  code: ErrorCode;
  message: string;
}

export function makeError(code: ErrorCode): SessionError {
  return { code, message: MESSAGES[code] };
}
