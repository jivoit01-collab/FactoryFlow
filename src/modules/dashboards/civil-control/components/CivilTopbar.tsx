import { useEffect, useState } from 'react';

export interface CivilTopbarProps {
  title: string;
  scope: string;
  chips: { label: string; value: string }[];
  totals: { caption: string; value: string; sub: string; missing?: boolean }[];
  /**
   * The rows are the worked example rather than the register.
   *
   * Drives the pill, which is the whole reason this component exists instead of
   * `OpsTopbar`: that one's pill says LIVE or SYNCING, and both are claims
   * about a feed. This board has none, and a green LIVE over four invented
   * capex figures is the single worst thing this screen could say.
   */
  sample?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/** Corner brackets, sized against `--u` like everything else on the board. */
function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {exit ? (
        <>
          <path d="M9 3v6H3" />
          <path d="M15 3v6h6" />
          <path d="M15 21v-6h6" />
          <path d="M9 21v-6H3" />
        </>
      ) : (
        <>
          <path d="M3 9V3h6" />
          <path d="M21 9V3h-6" />
          <path d="M21 15v6h-6" />
          <path d="M3 15v6h6" />
        </>
      )}
    </svg>
  );
}

/**
 * The civil board's header — the operations header with an honest pill.
 *
 * Every class here is the shared `ops-*` vocabulary untouched, so this sits in
 * the same room as the other boards and is read the same way. The one
 * difference is the state pill: `.civ-pill` in place of `.ops-pill-live`,
 * because this board has no feed to be live or stale about and must say which
 * of the two it is not.
 *
 * The clock is kept even though nothing behind it refreshes. It is the one
 * thing on any of these screens that moves without the data changing, which is
 * how somebody walking past tells a board from a frozen browser tab — and this
 * board, of all of them, should not look frozen when it is merely empty.
 */
export function CivilTopbar({
  title,
  scope,
  chips,
  totals,
  sample = false,
  isFullscreen = false,
  onToggleFullscreen,
}: CivilTopbarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="ops-topbar civ-topbar">
      <div className="civ-pill" data-state={sample ? 'sample' : 'live'}>
        <i />
        {sample ? 'SAMPLE' : 'LIVE'}
      </div>

      <div className="ops-title">
        <b title={title}>{title}</b>
        <span title={scope}>{scope}</span>
      </div>

      <div className="ops-chips">
        {chips.map((chip) => (
          <div key={chip.label} className="ops-chip" title={`${chip.label} ${chip.value}`}>
            <em>{chip.label}</em> {chip.value}
          </div>
        ))}
      </div>

      <div className="ops-totals">
        {totals.map((total) => (
          <div key={total.caption} className="ops-tot">
            <div className="cap">{total.caption}</div>
            <div className={total.missing ? 'n ops-nil' : 'n'}>
              {total.missing ? '—' : total.value}
            </div>
            <div className="s">{total.sub}</div>
          </div>
        ))}
      </div>

      <div className="ops-clock">
        <div className="t">
          {now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })}
        </div>
        <div className="d">
          {now.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>

      {onToggleFullscreen && (
        <button
          type="button"
          className="ops-fs"
          onClick={onToggleFullscreen}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Show fullscreen'}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Show fullscreen'}
        >
          <FullscreenIcon exit={isFullscreen} />
        </button>
      )}
    </header>
  );
}
