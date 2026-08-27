import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { TrendPoint } from '../hooks';

export interface WallStatProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  hex: string;
  /** % change against yesterday; null hides the chip. */
  delta?: number | null;
  /** What the delta is measured against, e.g. "vs yesterday". */
  deltaLabel?: string;
  /** When true a fall is the good news (backlog, rejections). */
  invertDelta?: boolean;
  spark?: TrendPoint[];
  /** Which trend field the sparkline draws. */
  sparkKey?: 'trucks' | 'amount' | 'boxes';
  delayMs?: number;
  onClick?: () => void;
}

/**
 * One headline number, sized for a wall rather than a desk: the value carries
 * the tile, the label sits under it in small caps, and the comparison chip is
 * the only other thing competing for attention.
 */
export function WallStat({
  icon: Icon,
  label,
  value,
  sub,
  hex,
  delta,
  deltaLabel = 'vs yesterday',
  invertDelta = false,
  spark,
  sparkKey = 'trucks',
  delayMs = 0,
  onClick,
}: WallStatProps) {
  const interactive = !!onClick;

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
        'relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3',
        interactive &&
          'cursor-pointer transition-colors hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
      )}
    >
      {/* accent hairline + corner bloom */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: hex }}
      />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${hex}24` }}
        >
          <Icon className="h-4 w-4" style={{ color: hex }} />
        </span>
        {delta != null && <DeltaChip delta={delta} invert={invertDelta} label={deltaLabel} />}
      </div>

      <div className="relative z-10 mt-2 min-w-0">
        <div className="truncate text-3xl font-bold tabular-nums leading-none tracking-tight text-white xl:text-4xl">
          {value}
        </div>
        <div className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </div>
        {sub && <div className="mt-0.5 truncate text-xs text-slate-500">{sub}</div>}
      </div>

      {spark && spark.length > 1 && (
        <SparkBars points={spark} field={sparkKey} hex={hex} className="relative z-10 mt-2" />
      )}
    </div>
  );
}

function DeltaChip({ delta, invert, label }: { delta: number; invert: boolean; label: string }) {
  const flat = delta === 0;
  // "Good" is up for output, down for backlog — the caller says which.
  const good = invert ? delta < 0 : delta > 0;
  const Icon = flat ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      title={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums',
        flat
          ? 'border-white/10 bg-white/5 text-slate-400'
          : good
            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
            : 'border-rose-400/30 bg-rose-400/10 text-rose-300',
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? '0%' : `${Math.abs(delta)}%`}
    </span>
  );
}

/**
 * A fortnight of context in 40 px. Today is the last bar and is drawn solid so
 * the eye lands on "where are we against the run rate" without a legend.
 */
function SparkBars({
  points,
  field,
  hex,
  className,
}: {
  points: TrendPoint[];
  field: 'trucks' | 'amount' | 'boxes';
  hex: string;
  className?: string;
}) {
  const values = points.map((point) => point[field]);
  const max = Math.max(...values, 1);

  return (
    <div className={cn('flex h-8 items-end gap-[3px]', className)} aria-hidden>
      {points.map((point, index) => {
        const height = Math.max((values[index] / max) * 100, values[index] > 0 ? 8 : 3);
        return (
          <span
            key={point.date}
            className="flex-1 rounded-sm transition-[height] duration-500"
            style={{
              height: `${height}%`,
              backgroundColor: hex,
              opacity: point.isToday ? 1 : 0.28,
            }}
          />
        );
      })}
    </div>
  );
}
