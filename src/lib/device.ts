/** A short, human label such as "Chrome on Android", shared with the other device. */
export function deviceLabel(): string {
  const ua = navigator.userAgent;

  let os = 'Unknown device';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac';
  else if (/CrOS/i.test(ua)) os = 'Chromebook';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Firefox\/|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Chrome\/|CriOS/.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
}

type WakeLockSentinelLike = { release: () => Promise<void> };

/**
 * Asks the browser to keep the screen on while a transfer runs, because a phone
 * that sleeps drops the connection. Returns a function that releases it.
 */
export async function keepAwake(): Promise<() => void> {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
  };
  if (!nav.wakeLock) return () => undefined;

  let lock: WakeLockSentinelLike | null = null;
  let released = false;

  const acquire = async () => {
    try {
      lock = await nav.wakeLock!.request('screen');
      if (released) await lock.release();
    } catch {
      /* denied or unsupported: the transfer still works */
    }
  };
  // Browsers drop the lock when the tab is hidden; take it again when it returns.
  const onVisible = () => {
    if (document.visibilityState === 'visible' && !released) void acquire();
  };
  document.addEventListener('visibilitychange', onVisible);
  await acquire();

  return () => {
    released = true;
    document.removeEventListener('visibilitychange', onVisible);
    void lock?.release().catch(() => undefined);
  };
}
