import { Factory } from 'lucide-react';

import { cn } from '@/shared/utils';

import { count } from '../../dispatch/utils/format';

/** "33h 34m" — a plant's day is argued about in hours. */
function duration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
import { type BoardUnit, quantityOf } from '../utils/boardUnit';

/**
 * What the lines that ran could have made today, against what they did.
 *
 * Capacity here is the lines' own ratings run for the hours they ACTUALLY
 * ran, converted to the unit the board is counting in — not for a notional
 * 22-hour day. Measured against a standard day the box said "half the plant
 * unused" on a day when every line beat its rating, and the reconciling term
 * (they ran 33h 34m of 88 available) was a sentence nobody should have to find
 * to read a headline. Over running time the box answers one question: given
 * the hours these lines were on, did they make what they should have.
 *
 * The figure is withheld entirely when any line that ran carries no rating. A
 * capacity total quietly short of a line reads as spare capacity the plant has
 * not got, which is worse than no capacity figure at all.
 */
export function CapacityBox({
  produced,
  producedLitres,
  capacity,
  capacityLitres,
  capacityPct,
  capacityMinutes,
  idleMinutes,
  breakdownMinutes,
  stoppageCount,
  lines,
  unit,
  unitNoun,
  className,
}: {
  produced: number;
  producedLitres: number | null;
  capacity: number | null;
  capacityLitres: number | null;
  capacityPct: number | null;
  /** The running time the capacity was measured over. */
  capacityMinutes: number | null;
  /** The rest of the day's clock: gaps between spells, and logged stoppages.
   *  Here rather than in a strip of their own — this is the box about how the
   *  day was spent, and the hours that made no output belong in it. */
  idleMinutes: number;
  breakdownMinutes: number;
  stoppageCount: number;
  /** How many lines ran — what the capacity is the sum of. */
  lines: number;
  unit: BoardUnit;
  unitNoun: string;
  className?: string;
}) {
  const made = quantityOf(unit, produced, producedLitres, unitNoun);
  const able = quantityOf(unit, capacity, capacityLitres, unitNoun);
  const known = unit === 'litres' ? capacityLitres != null : capacity != null;
  const ableValue = unit === 'litres' ? (capacityLitres ?? 0) : (capacity ?? 0);
  const madeValue = unit === 'litres' ? (producedLitres ?? 0) : produced;
  const left = known ? Math.max(0, ableValue - madeValue) : 0;
  const ahead = known ? Math.max(0, madeValue - ableValue) : 0;

  return (
    <div
      className={cn(
        'shrink-0 rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] px-5 py-3 dark:border-sky-400/20 dark:bg-sky-400/[0.08]',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <Factory className="h-3.5 w-3.5 text-violet-500" />
          Today's line capacity
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          {count(lines)} line{lines === 1 ? '' : 's'} ran
          {capacityMinutes != null && capacityMinutes > 0 && ` · ${duration(capacityMinutes)} running`}
        </p>
      </div>

      {known ? (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {made.text}
              <span className="ml-2 text-sm font-semibold text-muted-foreground">
                {made.noun} made
              </span>
            </span>
            <span className="text-2xl font-bold tabular-nums text-muted-foreground">
              {able.text}
              <span className="ml-2 text-sm font-semibold text-muted-foreground">
                {able.noun} capacity
              </span>
            </span>
            <span
              className={cn(
                'text-2xl font-bold tabular-nums',
                capacityPct == null
                  ? 'text-foreground'
                  : capacityPct >= 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : capacityPct >= 85
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {capacityPct == null ? '—' : `${capacityPct.toFixed(0)}%`}
              <span className="ml-2 text-sm font-semibold text-muted-foreground">used</span>
            </span>
            <span
              className={cn(
                'text-sm font-semibold',
                left > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {left > 0
                ? `${count(left)} ${able.noun} short`
                : `${count(ahead)} ${able.noun} ahead`}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm font-medium">
            {idleMinutes > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                <span className="font-bold">{duration(idleMinutes)}</span> idle
              </span>
            )}
            <span
              className={
                breakdownMinutes > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
              }
            >
              {breakdownMinutes > 0 ? (
                <>
                  <span className="font-bold">{duration(breakdownMinutes)}</span> breakdown ·{' '}
                  {count(stoppageCount)} logged
                </>
              ) : (
                'no breakdown logged'
              )}
            </span>
          </div>

          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
            <div
              className={cn(
                'rounded-full transition-[width] duration-500',
                (capacityPct ?? 0) >= 100
                  ? 'bg-emerald-500'
                  : (capacityPct ?? 0) >= 85
                    ? 'bg-amber-500'
                    : 'bg-rose-500',
              )}
              style={{ width: `${Math.min(100, capacityPct ?? 0)}%` }}
            />
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {lines === 0
            ? 'No line ran on this day.'
            : unit === 'litres'
              ? 'A line that ran has no litre volume in the SAP item master, so the day has no capacity in litres.'
              : 'A line that ran carries no rating, so the day has no capacity figure.'}
        </p>
      )}
    </div>
  );
}
