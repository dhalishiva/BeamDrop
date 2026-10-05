import { useEffect, useRef } from 'react';

const FILE_GB = 10;
const RUN_MS = 9000; // one illustrated transfer
const HOLD_MS = 1800; // rest on "received" before looping

/**
 * The one animated moment on the marketing page: a file streams from a laptop to a phone and
 * the phone's screen fills as it arrives. It is an illustration, not a live transfer.
 */
export function BeamHero() {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const label = count.current;
    if (!el || !label) return;

    const show = (p: number) => {
      el.style.setProperty('--p', p.toFixed(4));
      label.textContent = p >= 1 ? `${FILE_GB} GB received` : `${(p * FILE_GB).toFixed(1)} of ${FILE_GB} GB`;
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show(0.62);
      return;
    }

    let frame = 0;
    let lastText = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = (now - startedAt) % (RUN_MS + HOLD_MS);
      const p = Math.min(1, t / RUN_MS);
      el.style.setProperty('--p', p.toFixed(4));
      if (now - lastText > 90 || p >= 1) {
        lastText = now;
        show(p);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="beam"
      ref={root}
      role="img"
      aria-label="Illustration: a file streaming from a laptop straight to a phone"
    >
      <svg
        className="beam__device beam__device--laptop"
        viewBox="0 0 128 88"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="16" y="4" width="96" height="60" rx="7" />
        <path d="M4 76h120" />
        <rect x="54" y="20" width="20" height="28" rx="3" fill="var(--ember)" stroke="none" />
      </svg>

      <div className="beam__track" aria-hidden="true">
        <div className="beam__rail" />
        <div className="beam__chunks" />
      </div>

      <svg
        className="beam__device beam__device--phone"
        viewBox="0 0 56 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <rect x="4" y="3" width="48" height="94" rx="9" />
        <rect x="11" y="14" width="34" height="72" rx="3" strokeOpacity="0.35" strokeWidth="2" />
        <rect className="beam__level" x="11" y="14" width="34" height="72" rx="3" stroke="none" />
        <path d="M22 8.5h12" strokeWidth="3" />
      </svg>

      <div className="beam__readout" aria-hidden="true">
        <span>family-videos.zip</span>
        <span className="beam__count" ref={count}>
          6.2 of {FILE_GB} GB
        </span>
      </div>
    </div>
  );
}
