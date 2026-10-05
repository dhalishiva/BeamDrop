/** Where the signaling WebSocket lives. */
export function signalingUrl(): string {
  const configured = import.meta.env.VITE_SIGNALING_URL as string | undefined;
  if (configured) return configured;
  // Development: the Vite dev server proxies /ws to the local signaling server.
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * Free hosting tiers put idle servers to sleep. Pinging /health as soon as the app opens wakes the
 * signaling server while the person is still choosing a file. Only used when a remote server is set.
 */
export function warmUpSignaling(): void {
  const configured = import.meta.env.VITE_SIGNALING_URL as string | undefined;
  if (!configured) return;
  try {
    const url = new URL(configured);
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    url.pathname = '/health';
    url.search = '';
    void fetch(url.toString(), { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
  } catch {
    /* a malformed URL just means no warm-up */
  }
}

/** Link that opens the receive screen with a code filled in. */
export function receiveLink(code: string): string {
  return `${window.location.origin}/app?mode=receive&code=${encodeURIComponent(code)}`;
}

export const CODE_PATTERN = /^[A-HJKMNP-Z2-9]{6}$/;

/** Uppercases and drops anything that can't appear in a code. */
export function cleanCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-HJKMNP-Z2-9]/g, '')
    .slice(0, 6);
}
