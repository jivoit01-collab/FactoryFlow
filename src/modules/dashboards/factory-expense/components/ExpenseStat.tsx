import { AlertTriangle, type LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils';

import { money } from '../../dispatch/utils/format';
import type { ExpenseBucketFigures } from '../types';

export interface ExpenseStatProps {
  icon: LucideIcon;
  label: string;
  hex: string;
  figures: ExpenseBucketFigures;
  /** Where the number comes from — the caption that stops "is this SAP?" questions. */
  source: string;
  delayMs?: number;
}

/**
 * One cost line, sized for a wall: today's rupees carry the tile, the month is
 * the smaller figure beside it, and a budget bar runs underneath when a target
 * exists.
 *
 * A tile with no data does not show a confident ₹0 — it shows the reason. An
 * admin standing at a screen that says "no meter reading entered today" goes
 * and fixes it; one looking at a zero assumes the factory used no power.
 */
export function ExpenseStat({
  icon: Icon,
  label,
  hex,
  figures,
  source,
  delayMs = 0,
}: ExpenseStatProps) {
  const today = Number(figures.today ?? 0);
  const mtd = Number(figures.mtd ?? 0);
  const budget = figures.budget == null ? null : Number(figures.budget);
  const used = figures.budget_used_pct;
  const over = used != null && used > 100;

  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
        'relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/[0.09] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.035] px-4 py-3',
      )}
    >
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
        {figures.unit != null && (
          <span className="rounded-full border border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-foreground/75">
            {formatUnit(figures.unit)}
            {figures.unit_label ? ` ${figures.unit_label}` : ''}
          </span>
        )}
      </div>

      <div className="relative z-10 mt-2 min-w-0">
        <div className="truncate text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground xl:text-4xl">
          {money(today)}
        </div>
        <div className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label} — today
        </div>
        <div className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground/80">
          {money(mtd)} this month
        </div>
      </div>

      {budget != null && (
        <div className="relative z-10 mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.min(used ?? 0, 100)}%`,
                backgroundColor: over ? '#f43f5e' : hex,
              }}
            />
          </div>
          <div
            className={cn(
              'mt-1 truncate text-[11px] font-semibold tabular-nums',
              over ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground/80',
            )}
          >
            {used}% of {money(budget)} budget
          </div>
        </div>
      )}

      {figures.warning && (
        <div className="relative z-10 mt-2 flex items-start gap-1.5 rounded-lg border border-amber-600/30 dark:border-amber-400/30 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-1.5">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <span className="text-[11px] leading-tight text-amber-800 dark:text-amber-200">
            {figures.warning}
          </span>
        </div>
      )}

      {!figures.warning && (
        <div className="relative z-10 mt-2 truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground/55">
          {source}
        </div>
      )}
    </div>
  );
}

/** Units arrive as a decimal string, headcount as a number — both read as digits. */
function formatUnit(unit: string | number): string {
  const numeric = Number(unit);
  if (Number.isNaN(numeric)) return String(unit);
  return numeric.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
