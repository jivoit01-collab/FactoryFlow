import type { LucideIcon } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components/BoardPanel';
import { money } from '../../dispatch/utils/format';
import { useCreepScroll } from '../hooks';

export interface ExpenseListRow {
  /** Stable key — a contractor name, a meter name, an indent number. */
  id: string;
  label: string;
  /** The quantity behind the money: "42 in", "1,280 units". */
  meta?: string;
  amount: number;
}

export interface ExpenseListPanelProps {
  title: string;
  icon: LucideIcon;
  hex: string;
  rows: ExpenseListRow[];
  emptyText: string;
  badge?: string;
  className?: string;
  /** Seconds the list holds at each end before creeping on. From board settings. */
  pauseSeconds: number;
}

/**
 * A ranked list on the wall — who, how much, and what share of the panel.
 *
 * The bar behind each row is drawn against the biggest row rather than the
 * total, because on a wall the useful question is "which one is the outlier",
 * and shares of a total all look alike once there are more than five rows.
 *
 * Longer than it fits, the list creeps past on its own; nobody scrolls a wall.
 */
export function ExpenseListPanel({
  title,
  icon,
  hex,
  rows,
  emptyText,
  badge,
  className,
  pauseSeconds,
}: ExpenseListPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useCreepScroll(scrollRef, rows.length > 5, pauseSeconds);

  const max = Math.max(...rows.map((row) => row.amount), 1);

  return (
    <BoardPanel
      title={title}
      icon={icon}
      hex={hex}
      className={className}
      flush
      aside={badge ? <PanelBadge>{badge}</PanelBadge> : undefined}
    >
      {rows.length === 0 ? (
        <PanelEmpty>{emptyText}</PanelEmpty>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <ul className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <li
                key={row.id}
                className="relative overflow-hidden rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] px-3 py-2"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500"
                  style={{
                    width: `${(row.amount / max) * 100}%`,
                    backgroundColor: hex,
                    opacity: 0.14,
                  }}
                />
                <div className="relative z-10 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {money(row.amount)}
                  </span>
                </div>
                {row.meta && (
                  <div
                    className={cn(
                      'relative z-10 mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground/80',
                    )}
                  >
                    {row.meta}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </BoardPanel>
  );
}
