import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

/**
 * One bar of a tile's sparkline. Boards feed their own history in — the series
 * has no idea what it is measuring, only which bar is the running day.
 */
export interface SparkPoint {
  /** Stable key for the bar. A date, on every board that has one. */
  key: string;
  value: number;
  /** The running day: drawn solid while the rest of the fortnight is dimmed. */
  isToday?: boolean;
}

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
  spark?: SparkPoint[];
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
        'relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.035] px-4 py-3',
        interactive &&
          'cursor-pointer transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
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
        <div className="truncate text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground xl:text-4xl">
          {value}
        </div>
        <div className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground/80">{sub}</div>}
      </div>

      {spark && spark.length > 1 && (
        <SparkBars points={spark} hex={hex} className="relative z-10 mt-2" />
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
          ? 'border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 text-muted-foreground'
          : good
            ? 'border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
            : 'border-rose-600/30 dark:border-rose-400/30 bg-rose-500/10 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300',
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
  hex,
  className,
}: {
  points: SparkPoint[];
  hex: string;
  className?: string;
}) {
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 1);

  return (
    <div className={cn('flex h-8 items-end gap-[3px]', className)} aria-hidden>
      {points.map((point, index) => {
        const height = Math.max((values[index] / max) * 100, values[index] > 0 ? 8 : 3);
        return (
          <span
            key={point.key}
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
