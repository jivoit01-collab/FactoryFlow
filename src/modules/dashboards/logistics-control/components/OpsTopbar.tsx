import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export interface OpsTotal {
  caption: string;
  value: string;
  sub: string;
  /** No source behind the figure — drawn as a rule rather than a number. */
  missing?: boolean;
}

export interface OpsTopbarProps {
  title: string;
  scope: string;
  chips: { label: string; value: string }[];
  totals: OpsTotal[];
  /** A background refresh is in flight — the pill goes amber and says so. */
  busy?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Where the settings cog goes. Omitted hides it. */
  settingsTo?: string;
}

/** A cog, sized against `--u` like everything else here. */
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Corner brackets, drawn out or in.
 *
 * Inline rather than from the icon set: everything else on this board is sized
 * against `--u` so it scales with the screen, and a component icon would carry
 * its own fixed pixel size into a layout that has none.
 */
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
 * The board's header: state, identity, context, totals and the time.
 *
 * The clock ticks on its own once a second and is the only thing on the board
 * that moves without the data changing. On an unattended screen that matters:
 * it is how somebody walking past can tell the board is live rather than a
 * frozen browser tab showing yesterday's numbers.
 */
export function OpsTopbar({
  title,
  scope,
  chips,
  totals,
  busy = false,
  isFullscreen = false,
  onToggleFullscreen,
  settingsTo,
}: OpsTopbarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="ops-topbar">
      <div className="ops-pill-live" data-state={busy ? 'busy' : 'live'}>
        <i />
        {busy ? 'SYNCING' : 'LIVE'}
      </div>

      {/* Both lines truncate rather than wrap: the header's row is `auto`, so a
          line it gains is a line the bands lose. The full text stays on the
          element for whoever walks up to the screen. */}
      <div className="ops-title">
        <b title={title}>{title}</b>
        <span title={scope}>{scope}</span>
      </div>

      <div className="ops-chips">
        {chips.map((chip) => (
          <div key={chip.label} className="ops-chip">
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

      {settingsTo && (
        <Link
          to={settingsTo}
          className="ops-fs"
          aria-label="Board settings"
          title="Board settings — capacity and last audit"
        >
          <SettingsIcon />
        </Link>
      )}

      {onToggleFullscreen && (
        <button
          type="button"
          className="ops-fs"
          onClick={onToggleFullscreen}
          aria-pressed={isFullscreen}
          // The label says what the button does next, not what the state is —
          // a screen reader reaching a control wants the action.
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Show fullscreen'}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Show fullscreen'}
        >
          <FullscreenIcon exit={isFullscreen} />
        </button>
      )}
    </header>
  );
}
