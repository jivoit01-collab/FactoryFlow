import { CalendarRange } from 'lucide-react';

import { usePlantBoard } from '@/modules/dashboards/plant-board/api';
import { cn } from '@/shared/utils';

import { compact, count } from '../../dispatch/utils/format';

/** Litres, short-scaled: "8.4 L ltr". "L" after a bare number is lakh. */
function litres(value: number): string {
  return `${compact(value)} ltr`;
}

/**
 * The month's plan, and how much of it the plant has made.
 *
 * Read from the Plant Control board's own composed response rather than
 * recomputed here, for two reasons. The plan lives in SAP (OFCT/FCT1, not
 * OWOR) and getting at it means a HANA round trip this board has no other
 * reason to make; and the attainment figure is a settled definition that took
 * a correction to get right — it counts EVERY receipt onto the finished floor,
 * planned or not, because reading it through the plan's own item list
 * under-reported one September by 225 t, a fifth of the month. Two boards
 * quoting different month attainments would be worse than one board not
 * quoting it at all.
 *
 * Shown in litres because that is what the plan is argued about in; the
 * response carries tonnes, and on oil and finished goods a tonne is a thousand
 * litres. Packing material has no volume in SAP and is not in these figures.
 */
export function MonthPlanStrip({ className }: { className?: string }) {
  const { data, isLoading, isError } = usePlantBoard();

  const production = data?.production ?? null;
  const plan = data?.plan ?? null;

  if (isLoading) {
    return (
      <div
        className={cn(
          'h-14 shrink-0 animate-pulse rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] dark:border-violet-400/20 dark:bg-violet-400/[0.08]',
          className,
        )}
      />
    );
  }

  // The plan band is built on its own on the server and can be the one thing
  // that failed; the board says which figure is missing rather than showing a
  // zero-attainment month.
  if (isError || !production) {
    return (
      <div
        className={cn(
          'shrink-0 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-5 py-3 text-sm font-medium text-muted-foreground dark:border-violet-400/20 dark:bg-violet-400/[0.08]',
          className,
        )}
      >
        The month's plan could not be read — SAP is not answering, or this login
        does not hold the production-plan right.
      </div>
    );
  }

  const plannedLitres = production.planned_tons * 1000;
  const madeLitres = production.produced_tons * 1000;
  const attainment = production.attainment_tons_pct;
  const leftLitres = Math.max(0, plannedLitres - madeLitres);
  // Against the month's own pace: a third of the way in, a third made is on
  // track. Without it 38% reads as behind whatever day of the month it is.
  const elapsed = production.elapsed_days ?? null;
  const total = plan?.days_total ?? null;
  const pace = elapsed != null && total ? (elapsed / total) * 100 : null;
  const onTrack = attainment != null && pace != null && attainment >= pace;

  return (
    <div
      className={cn(
        'shrink-0 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-5 py-3 dark:border-violet-400/20 dark:bg-violet-400/[0.08]',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5 text-violet-500" />
          This month's plan
          {plan?.name && (
            <span className="font-medium normal-case tracking-normal text-muted-foreground">
              {plan.name}
            </span>
          )}
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          {elapsed != null && total
            ? `day ${count(elapsed)} of ${count(total)}`
            : 'plan dates not set'}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {litres(madeLitres)}
          <span className="ml-2 text-sm font-semibold text-muted-foreground">made</span>
        </span>
        <span className="text-2xl font-bold tabular-nums text-muted-foreground">
          {litres(plannedLitres)}
          <span className="ml-2 text-sm font-semibold text-muted-foreground">planned</span>
        </span>
        <span
          className={cn(
            'text-2xl font-bold tabular-nums',
            attainment == null
              ? 'text-foreground'
              : onTrack
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {attainment == null ? '—' : `${attainment.toFixed(0)}%`}
          <span className="ml-2 text-sm font-semibold text-muted-foreground">
            of the plan{pace != null && ` · ${pace.toFixed(0)}% of the month gone`}
          </span>
        </span>
        {leftLitres > 0 && (
          <span className="text-sm font-semibold text-muted-foreground">
            {litres(leftLitres)} left
          </span>
        )}
      </div>

      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
        <div
          className={cn(
            'rounded-full',
            onTrack ? 'bg-emerald-500' : 'bg-amber-500',
          )}
          style={{
            width: `${Math.min(100, plannedLitres > 0 ? (madeLitres / plannedLitres) * 100 : 0)}%`,
          }}
        />
      </div>

      {production.unweighed_lines > 0 && (
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">
          {count(production.unweighed_lines)} planned SKU
          {production.unweighed_lines === 1 ? ' has' : 's have'} no litre volume in the SAP item
          master and {production.unweighed_lines === 1 ? 'is' : 'are'} not in these figures.
        </p>
      )}
    </div>
  );
}
