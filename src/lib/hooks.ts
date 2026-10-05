import { useCallback, useEffect, useRef, useState } from 'react';
import { signalingUrl } from './config';
import { deviceLabel, keepAwake } from './device';
import {
  ReceiveSession,
  SendSession,
  type ReceiveSnapshot,
  type SendSnapshot,
} from './session';

/** While a transfer is live: keep the screen on and warn before the tab is closed. */
function useTransferGuards(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let release: (() => void) | null = null;
    let cancelled = false;
    void keepAwake().then((fn) => {
      if (cancelled) fn();
      else release = fn;
    });
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      cancelled = true;
      release?.();
      window.removeEventListener('beforeunload', warn);
    };
  }, [active]);
}

export function useSend() {
  const session = useRef<SendSession | null>(null);
  const [snapshot, setSnapshot] = useState<SendSnapshot | null>(null);

  const start = useCallback((file: File) => {
    session.current?.cancel();
    const next = new SendSession(
      file,
      { signalingUrl: signalingUrl(), device: deviceLabel() },
      setSnapshot,
    );
    session.current = next;
    next.start();
  }, []);

  const cancel = useCallback(() => session.current?.cancel(), []);

  const reset = useCallback(() => {
    session.current?.cancel();
    session.current = null;
    setSnapshot(null);
  }, []);

  useEffect(() => () => session.current?.cancel(), []);

  const status = snapshot?.status;
  const active =
    status === 'waiting' ||
    status === 'connecting' ||
    status === 'awaiting-accept' ||
    status === 'sending' ||
    status === 'finishing';
  useTransferGuards(active);

  return { snapshot, active, start, cancel, reset };
}

export function useReceive() {
  const session = useRef<ReceiveSession | null>(null);
  const [snapshot, setSnapshot] = useState<ReceiveSnapshot | null>(null);

  const connect = useCallback((code: string) => {
    session.current?.cancel();
    const next = new ReceiveSession(
      code,
      { signalingUrl: signalingUrl(), device: deviceLabel() },
      setSnapshot,
    );
    session.current = next;
    next.start();
  }, []);

  // Not wrapped in async work: saving may open a file picker, which needs the click's user gesture.
  const accept = useCallback(() => {
    void session.current?.accept();
  }, []);
  const decline = useCallback(() => session.current?.decline(), []);
  const cancel = useCallback(() => session.current?.cancel(), []);

  const reset = useCallback(() => {
    session.current?.cancel();
    session.current = null;
    setSnapshot(null);
  }, []);

  useEffect(() => () => session.current?.cancel(), []);

  const status = snapshot?.status;
  const active =
    status === 'connecting' || status === 'offer' || status === 'receiving' || status === 'finishing';
  useTransferGuards(active);

  return { snapshot, active, connect, accept, decline, cancel, reset };
}

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
