import { cn } from '@/shared/utils';

import { ACCENTS, occupancyAccent } from '../constants/warehouse-control.theme';
import { formatCount, formatPercent } from '../utils/format';

interface CapacityMeterProps {
  total: number;
  used: number;
  /** Slots that exist but cannot be filled — blocked, damaged, under maintenance. */
  unavailable?: number;
  /** Draws the headline row above the bar. */
  headline?: boolean;
  className?: string;
}

function share(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}

/**
 * Pallet slots as one bar: filled, unusable, and free.
 *
 * Three segments rather than a single percentage, because "70% used" and "70%
 * used with a fifth of the racking blocked" are very different situations for
 * whoever has to find space for the next pallet. The fill hue steps from green
 * through amber to red as the warehouse packs out, so the bar answers "is there
 * room" before any number is read.
 */
export function CapacityMeter({
  total,
  used,
  unavailable = 0,
  headline = false,
  className,
}: CapacityMeterProps) {
  const usedPct = share(used, total);
  const unavailablePct = share(unavailable, total);
  const freeSlots = Math.max(0, total - used - unavailable);
  const accent = ACCENTS[occupancyAccent(usedPct)];

  return (
    <div className={className}>
      {headline && (
        <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold leading-none tabular-nums sm:text-4xl">
              {formatPercent(usedPct)}
            </span>
            <span className="text-sm text-muted-foreground">full</span>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{formatCount(used)}</span> of{' '}
            {formatCount(total)} slots
          </p>
        </div>
      )}

      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${formatCount(used)} of ${formatCount(total)} pallet slots used`}
      >
        <div
          className={cn('h-full transition-all', accent.fill)}
          style={{ width: `${usedPct}%` }}
        />
        {unavailablePct > 0 && (
          <div
            className="h-full bg-slate-400/70 transition-all dark:bg-slate-500/70"
            style={{ width: `${unavailablePct}%` }}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', accent.fill)} />
          <span className="tabular-nums font-medium">{formatCount(used)}</span>
          <span className="text-muted-foreground">used</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="tabular-nums font-medium">{formatCount(freeSlots)}</span>
          <span className="text-muted-foreground">free</span>
        </span>
        {unavailable > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400/70 dark:bg-slate-500/70" />
            <span className="tabular-nums font-medium">{formatCount(unavailable)}</span>
            <span className="text-muted-foreground">blocked</span>
          </span>
        )}
      </div>
    </div>
  );
}
