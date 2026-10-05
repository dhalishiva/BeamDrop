import { formatBytes, formatEta, formatSpeed } from '../lib/format';

interface Props {
  done: number;
  total: number;
  speed: number;
  /** Label for what is happening, used by assistive tech. */
  label: string;
  finished?: boolean;
}

export function Progress({ done, total, speed, label, finished = false }: Props) {
  const fraction = total > 0 ? Math.min(1, done / total) : finished ? 1 : 0;
  const percent = Math.floor(fraction * 100);
  const remaining = speed > 0 ? (total - done) / speed : NaN;

  return (
    <div className="stack">
      <div
        className={finished ? 'progress progress--done' : 'progress'}
        style={{ ['--p' as string]: fraction }}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress__fill" />
        <div className="progress__head" />
      </div>
      <div className="progress-stats">
        <span>
          <strong>{percent}%</strong> &middot; {formatBytes(done)} of {formatBytes(total)}
        </span>
        {!finished && speed > 0 ? (
          <span>
            {formatSpeed(speed)}
            {Number.isFinite(remaining) ? ` · ${formatEta(remaining)} left` : ''}
          </span>
        ) : null}
      </div>
    </div>
  );
}
