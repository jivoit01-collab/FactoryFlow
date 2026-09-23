/**
 * The small shared components every construction screen uses.
 *
 * Components only — the formatters and label maps live in `../utils`, because a
 * file exporting both breaks React fast refresh.
 */
import { AlertTriangle, CalendarClock, IndianRupee } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { ExpenseBatchStatus, ProjectStatus, RevisionStatus } from '../types';
import { formatMoney, formatShortDate } from '../utils';

const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  ON_HOLD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  COMPLETED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  CANCELLED: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

export function ProjectStatusBadge({
  status,
  label,
  className,
}: {
  status: ProjectStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        PROJECT_STATUS_STYLES[status],
        className,
      )}
    >
      {label ?? status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

const REVISION_STATUS_STYLES: Record<RevisionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  WITHDRAWN: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

export function RevisionStatusBadge({ status, label }: { status: RevisionStatus; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        REVISION_STATUS_STYLES[status],
      )}
    >
      {label ?? status.toLowerCase()}
    </span>
  );
}


/**
 * Budget spent against sanctioned. Turns red once it is over — which is the
 * cue to raise a revision, so the caller puts that button beside it.
 */
const BATCH_STATUS_STYLES: Record<ExpenseBatchStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  RETURNED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

/** "Collecting" / "Awaiting approval" / "Approved" / "Sent back". */
export function BatchStatusBadge({
  status,
  label,
}: {
  status: ExpenseBatchStatus;
  label?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        BATCH_STATUS_STYLES[status],
      )}
    >
      {label ?? status.toLowerCase()}
    </span>
  );
}

export function BudgetBar({
  spent,
  sanctioned,
  percentUsed,
  isOver,
  compact,
}: {
  spent: string;
  sanctioned: string;
  percentUsed: string;
  isOver: boolean;
  compact?: boolean;
}) {
  const pct = Math.min(Number(percentUsed) || 0, 100);
  const unsanctioned = Number(sanctioned) <= 0;

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
            {formatMoney(spent)}
            <span className="text-muted-foreground font-normal">
              of {unsanctioned ? '—' : formatMoney(sanctioned)}
            </span>
          </span>
          <span
            className={cn(
              'text-xs font-semibold',
              isOver ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
            )}
          >
            {unsanctioned ? 'not sanctioned' : `${Number(percentUsed).toFixed(0)}%`}
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOver ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500',
          )}
          style={{ width: `${unsanctioned ? 0 : pct}%` }}
        />
      </div>
      {isOver && (
        <p className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Over by {formatMoney(String(Number(spent) - Number(sanctioned)))}
        </p>
      )}
    </div>
  );
}

/**
 * Time elapsed against the expected ending. Same shape as the budget bar, on
 * purpose: over budget and over time are the two things worth seeing at once.
 */
export function TimeBar({
  startDate,
  expectedEnd,
  actualEnd,
  daysLeft,
  isOverdue,
}: {
  /** Null on a draft nobody has dated yet. */
  startDate: string | null;
  expectedEnd: string | null;
  actualEnd?: string | null;
  daysLeft: number | null;
  isOverdue: boolean;
}) {
  // A draft may carry neither date. There is no span to draw and no answer to
  // "how long is left", so the bar says so rather than rendering a NaN-wide
  // fill under the words "Invalid Date".
  if (!startDate || !expectedEnd) {
    return <p className="text-sm text-muted-foreground">No dates yet</p>;
  }
  // Derived from the server's own `daysLeft` rather than the browser clock, so
  // the bar cannot disagree with the "24 days left" printed beside it — and so
  // rendering stays pure (reading Date.now() during render does not).
  const DAY_MS = 86_400_000;
  const start = new Date(startDate).getTime();
  const end = new Date(expectedEnd).getTime();
  const span = end - start;
  const elapsed = actualEnd
    ? new Date(actualEnd).getTime() - start
    : span - (daysLeft ?? 0) * DAY_MS;
  const pct = span > 0 ? Math.min(Math.max((elapsed / span) * 100, 0), 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="flex items-center gap-1 font-medium">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatShortDate(startDate)}
          <span className="text-muted-foreground font-normal">
            → {formatShortDate(actualEnd ?? expectedEnd)}
          </span>
        </span>
        <span
          className={cn(
            'text-xs font-semibold',
            isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
          )}
        >
          {actualEnd
            ? 'finished'
            : daysLeft === null
              ? '—'
              : daysLeft < 0
                ? `${Math.abs(daysLeft)} days late`
                : `${daysLeft} days left`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverdue ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-sky-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * One figure on a header strip, written inline as "label value".
 *
 * Deliberately not a big stacked tile: five of those filled the whole first
 * screen of the project page and pushed the actual content — the days, the
 * payments — below the fold.
 */
export function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'good';
  hint?: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          tone === 'danger' && 'text-rose-600 dark:text-rose-400',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">({hint})</span>}
    </span>
  );
}
