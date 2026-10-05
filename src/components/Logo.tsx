import { Link } from 'react-router-dom';

export function LogoMark({ className = 'logo__mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect className="logo__bg" width="40" height="40" rx="11" />
      <circle className="logo__ring" cx="10" cy="20" r="4" strokeWidth="2.5" />
      <line className="logo__line" x1="14" y1="20" x2="26" y2="20" strokeWidth="2.5" strokeLinecap="round" />
      <circle className="logo__end" cx="30" cy="20" r="4.5" />
      <rect className="logo__packet" x="17" y="16.5" width="7" height="7" rx="2" />
    </svg>
  );
}

/** "BeamDrop by Kriosity" lockup. `tone="blue"` is for use on the brand-blue hero. */
export function Logo({ tone = 'default' }: { tone?: 'default' | 'blue' }) {
  return (
    <Link
      to="/"
      className={tone === 'blue' ? 'logo logo--on-blue' : 'logo'}
      aria-label="BeamDrop by Kriosity, home"
    >
      <LogoMark />
      <span className="logo__text">
        <span className="logo__name">BeamDrop</span>
        <span className="logo__by">by Kriosity</span>
      </span>
    </Link>
  );
}
