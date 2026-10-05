// Link: sets up one direct WebRTC DataChannel between two browsers, using the
// signaling server only to exchange connection details. Once the channel is
// open the signaling connection is closed, so the server holds nothing.

import type { ErrorCode } from './errors';

export type LinkFailure = Extract<
  ErrorCode,
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
  | 'unsupported'
>;

type SignalData =
  | { kind: 'sdp'; description: RTCSessionDescriptionInit }
  | { kind: 'ice'; candidate: RTCIceCandidateInit };

type ServerMessage =
  | { type: 'created'; code: string; iceServers?: RTCIceServer[] }
  | { type: 'joined'; iceServers?: RTCIceServer[] }
  | { type: 'peer-joined' }
  | { type: 'signal'; data: SignalData }
  | { type: 'peer-left'; reason?: string }
  | { type: 'error'; reason?: string };

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export interface LinkOptions {
  role: 'host' | 'guest';
  /** Guest only: the code to join. */
  code?: string;
  signalingUrl: string;
  iceServers?: RTCIceServer[];
  /** How long to wait for the direct connection once both sides are in the room. */
  connectTimeoutMs?: number;
  WebSocketImpl?: typeof WebSocket;
  RTCPeerConnectionImpl?: typeof RTCPeerConnection;
}

export interface LinkHandlers {
  onCode?: (code: string) => void;
  onPeerJoined?: () => void;
  onOpen: (channel: RTCDataChannel) => void;
  onFail: (reason: LinkFailure) => void;
}

const SERVER_ERRORS: Record<string, LinkFailure> = {
  not_found: 'not_found',
  full: 'full',
  rate_limited: 'rate_limited',
  busy: 'busy',
  expired: 'expired',
  timeout: 'timeout',
};

export class Link {
  opened = false;

  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private serverIce: RTCIceServer[] = [];
  private closing = false;
  private failed = false;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly options: LinkOptions,
    private readonly handlers: LinkHandlers,
  ) {}

  /** Negotiated limit for a single message, if the browser reports one. */
  get maxMessageSize(): number | undefined {
    const size = this.pc?.sctp?.maxMessageSize;
    return typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : undefined;
  }

  start(): void {
    const WS = this.options.WebSocketImpl ?? globalThis.WebSocket;
    const RTC = this.options.RTCPeerConnectionImpl ?? globalThis.RTCPeerConnection;
    if (!WS || !RTC) {
      this.fail('unsupported');
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WS(this.options.signalingUrl);
    } catch {
      this.fail('signal_unreachable');
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (this.options.role === 'host') this.sendWs({ type: 'create' });
      else this.sendWs({ type: 'join', code: this.options.code });
    };
    ws.onmessage = (event) => this.onServerMessage(event.data);
    ws.onerror = () => {
      if (!this.opened) this.fail('signal_unreachable');
    };
    ws.onclose = () => {
      // Closing the socket after the channel opens is expected.
      if (!this.opened && !this.closing) this.fail('signal_unreachable');
    };
  }

  close(): void {
    this.closing = true;
    this.clearTimers();
    try {
      this.dc?.close();
    } catch {
      /* already closed */
    }
    try {
      this.pc?.close();
    } catch {
      /* already closed */
    }
    this.closeSocket();
  }

  private sendWs(message: unknown): void {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(message));
  }

  private closeSocket(): void {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    try {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'leave' }));
      ws.close();
    } catch {
      /* already closed */
    }
  }

  private clearTimers(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.connectTimer = null;
    this.disconnectTimer = null;
  }

  private fail(reason: LinkFailure): void {
    if (this.failed || this.closing) return;
    this.failed = true;
    this.close();
    this.handlers.onFail(reason);
  }

  private onServerMessage(raw: unknown): void {
    if (this.opened) return;
    let msg: ServerMessage;
    try {
      msg = JSON.parse(String(raw)) as ServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'created':
        this.serverIce = msg.iceServers ?? [];
        this.handlers.onCode?.(msg.code);
        break;

      case 'joined':
        this.serverIce = msg.iceServers ?? [];
        this.createPeerConnection();
        this.armConnectTimer();
        break;

      case 'peer-joined':
        this.handlers.onPeerJoined?.();
        this.createPeerConnection();
        this.armConnectTimer();
        void this.makeOffer();
        break;

      case 'signal':
        void this.onSignal(msg.data);
        break;

      case 'peer-left':
        if (msg.reason === 'expired' || msg.reason === 'timeout') {
          this.fail('expired');
        } else if (this.pc?.remoteDescription) {
          // Whichever side's channel opens first closes its signaling socket, which
          // the server reports as "peer left". Once negotiation is under way that is
          // expected; the connect timer still catches a peer that really vanished.
        } else {
          this.fail('peer_left');
        }
        break;

      case 'error':
        this.fail(SERVER_ERRORS[msg.reason ?? ''] ?? 'signal_unreachable');
        break;
    }
  }

  private armConnectTimer(): void {
    const timeout = this.options.connectTimeoutMs ?? 30_000;
    this.connectTimer = setTimeout(() => {
      if (!this.opened) this.fail('connect_failed');
    }, timeout);
  }

  private createPeerConnection(): void {
    if (this.pc) return;
    const RTC = this.options.RTCPeerConnectionImpl ?? globalThis.RTCPeerConnection;
    const iceServers = [
      ...(this.options.iceServers ?? DEFAULT_ICE_SERVERS),
      ...this.serverIce,
    ];
    const pc = new RTC({ iceServers });
    this.pc = pc;

    pc.onicecandidate = (event) => {
      const c = event.candidate;
      if (!c) return;
      this.sendWs({
        type: 'signal',
        data: {
          kind: 'ice',
          candidate: {
            candidate: c.candidate,
            sdpMid: c.sdpMid,
            sdpMLineIndex: c.sdpMLineIndex,
            usernameFragment: c.usernameFragment,
          },
        } satisfies SignalData,
      });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed') {
        this.fail(this.opened ? 'connection_lost' : 'connect_failed');
      } else if (state === 'disconnected') {
        // Brief drops often heal on their own.
        this.disconnectTimer = setTimeout(() => {
          if (pc.connectionState !== 'connected') {
            this.fail(this.opened ? 'connection_lost' : 'connect_failed');
          }
        }, 10_000);
      } else if (state === 'connected' && this.disconnectTimer) {
        clearTimeout(this.disconnectTimer);
        this.disconnectTimer = null;
      }
    };

    if (this.options.role === 'host') {
      this.wireChannel(pc.createDataChannel('beamdrop', { ordered: true }));
    } else {
      pc.ondatachannel = (event) => this.wireChannel(event.channel);
    }
  }

  private wireChannel(channel: RTCDataChannel): void {
    this.dc = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      if (this.opened || this.failed) return;
      this.opened = true;
      this.clearTimers();
      // The server has done its job; free the room right away.
      this.closeSocket();
      this.handlers.onOpen(channel);
    };
    channel.onclose = () => {
      if (!this.closing && !this.failed) this.fail('connection_lost');
    };
  }

  private async makeOffer(): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendWs({
        type: 'signal',
        data: { kind: 'sdp', description: { type: offer.type, sdp: offer.sdp } } satisfies SignalData,
      });
    } catch {
      this.fail('connect_failed');
    }
  }

  private async onSignal(data: SignalData): Promise<void> {
    if (!data) return;
    if (data.kind === 'ice') {
      const pc = this.pc;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch {
          /* a stale or unusable candidate is not fatal */
        }
      } else {
        this.pendingIce.push(data.candidate);
      }
      return;
    }

    if (data.kind === 'sdp') {
      this.createPeerConnection();
      const pc = this.pc;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(data.description);
        for (const candidate of this.pendingIce.splice(0)) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {
            /* ignore */
          }
        }
        if (data.description.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendWs({
            type: 'signal',
            data: {
              kind: 'sdp',
              description: { type: answer.type, sdp: answer.sdp },
            } satisfies SignalData,
          });
        }
      } catch {
        this.fail('connect_failed');
      }
    }
  }
}
