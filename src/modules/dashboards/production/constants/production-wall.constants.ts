/**
 * Wall-board settings for the production screen.
 *
 * The dispatch and expense boards own the shared kit (BoardPanel, WallStat, the
 * palette, the formatters and the date helpers); this file holds only what is
 * specific to production — how often the floor's numbers are worth re-pulling,
 * how long a fortnight is, and the vocabulary the run and reconciliation chips
 * speak.
 */

/**
 * How often the board re-pulls every source (ms).
 *
 * Slower than the dispatch board's 30 s on purpose: three of the panels go out
 * to SAP for their reconciliation, and hammering the Service Layer from a
 * screen nobody is standing at buys nothing — a case produced at 14:02 is still
 * news at 14:03.
 */
export const PRODUCTION_WALL_REFRESH_MS = 60_000;

/** Two and a half missed cycles before the header admits the board froze. */
export const PRODUCTION_STALE_AFTER_MS = PRODUCTION_WALL_REFRESH_MS * 2.5;

/** Trend length, in days (the shown day inclusive). */
export const PRODUCTION_TREND_DAYS = 14;

/** Below this many rows a list fits its panel, and creeping it would be motion
 *  for its own sake. */
export const AUTO_SCROLL_FROM = 6;

/** The tone a run's live state is drawn in. */
export interface RunTone {
  label: string;
  /** Chip classes. */
  cls: string;
  /** Dot classes. */
  dot: string;
  /** A run that is producing right now — its output is still moving. */
  isLive: boolean;
}

/**
 * Live status → wall vocabulary. Matched on substrings because the backend
 * sends both a `status` and a `live_status` and the two do not share a
 * vocabulary ("IN_PROGRESS" vs "RUNNING", "BREAKDOWN" vs "STOPPED").
 */
export function runTone(live: string | undefined, status: string | undefined): RunTone {
  const s = `${live || ''} ${status || ''}`.toUpperCase();
  if (s.includes('RUN') || s.includes('IN_PROGRESS')) {
    return {
      label: 'Running',
      cls: 'border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      isLive: true,
    };
  }
  if (s.includes('BREAK') || s.includes('DOWN')) {
    return {
      label: 'Breakdown',
      cls: 'border-rose-600/30 dark:border-rose-400/30 bg-rose-500/10 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-500',
      isLive: false,
    };
  }
  if (s.includes('STOP')) {
    return {
      label: 'Stopped',
      cls: 'border-rose-600/30 dark:border-rose-400/30 bg-rose-500/10 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-500',
      isLive: false,
    };
  }
  if (s.includes('MAINT')) {
    return {
      label: 'Maintenance',
      cls: 'border-amber-600/30 dark:border-amber-400/30 bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
      isLive: false,
    };
  }
  if (s.includes('COMPLETE')) {
    return {
      label: 'Completed',
      cls: 'border-sky-600/30 dark:border-sky-400/30 bg-sky-500/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300',
      dot: 'bg-sky-500',
      isLive: false,
    };
  }
  return {
    label: (live || status || '—').replace(/_/g, ' ').toLowerCase(),
    cls: 'border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 text-foreground/70',
    dot: 'bg-slate-400',
    isLive: false,
  };
}

/** Reconciliation status → a panel-badge tone and a word the floor uses. */
export function reconTone(status: string | undefined): {
  label: string;
  tone: 'good' | 'warn' | 'bad';
} {
  const s = (status || '').toUpperCase();
  if (s === 'MATCHED') return { label: 'Matched', tone: 'good' };
  if (s === 'PENDING_SYNC') return { label: 'Not in SAP yet', tone: 'warn' };
  return { label: 'Mismatch', tone: 'bad' };
}
