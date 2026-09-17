import { useEffect, useState } from 'react';

import { EXPENSE_SPANS } from '../constants';
import type { ExpenseSpanKey } from '../types';

export interface ExpenseTopbarProps {
  /** What the grid covers, as a sentence: "1 – 12 September 2026 · 12 days". */
  scope: string;
  span: ExpenseSpanKey;
  onSpanChange: (span: ExpenseSpanKey) => void;
  /** The grand total, already formatted. Empty string draws a rule instead. */
  grandTotal: string;
  grandSub: string;
  /** A background refresh is in flight — the pill goes amber and says so. */
  busy?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * Corner brackets, drawn out or in.
 *
 * Inline rather than from the icon set: everything on this board is sized
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
 * The board's header: state, identity, span, the grand total and the time.
 *
 * The clock ticks on its own once a second and is the only thing here that
 * moves without the data changing. On an unattended screen that matters: it is
 * how somebody walking past can tell the board is live rather than a frozen tab
 * showing last Tuesday's numbers.
 */
export function ExpenseTopbar({
  scope,
  span,
  onSpanChange,
  grandTotal,
  grandSub,
  busy = false,
  isFullscreen = false,
  onToggleFullscreen,
}: ExpenseTopbarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="exp-topbar">
      <div className="exp-pill" data-state={busy ? 'busy' : 'live'}>
        <i />
        {busy ? 'SYNCING' : 'LIVE'}
      </div>

      <div className="exp-title">
        <b title="Company Expense">Company Expense</b>
        <span title={scope}>{scope}</span>
      </div>

      <div className="exp-spans" role="group" aria-label="Period">
        {EXPENSE_SPANS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={span === option.key}
            onClick={() => onSpanChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="exp-grand">
        <div className="cap">Total spend</div>
        <div className="n">{grandTotal || '—'}</div>
        <div className="s">{grandSub}</div>
      </div>

      <div className="exp-clock">
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
          className="exp-fs"
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
