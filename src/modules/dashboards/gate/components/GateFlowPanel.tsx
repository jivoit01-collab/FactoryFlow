import type { LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components';
import { useWallPalette, type WallHueKey } from '../../dispatch/constants/wall.palette';
import { useAutoScroll } from '../../dispatch/hooks';
import { count } from '../../dispatch/utils/format';
import { GATE_AUTO_SCROLL_FROM, type GateActivity } from '../constants/gate-dashboard.constants';

/**
 * One direction of the gate, as a ranked list.
 *
 * The bar behind each row is drawn against the busiest activity in this panel
 * rather than against the panel's total, because from across a room the useful
 * question is "what is the gate mostly doing right now", and shares of a total
 * all look alike past five rows.
 *
 * An activity with no number is not the same as one reading zero: the first
 * means its register could not be read (or the signed-in user cannot see it),
 * the second means nothing crossed. They are drawn differently on purpose — a
 * wall that quietly shows 0 for a broken endpoint is worse than no wall at all.
 */
export function GateFlowPanel({
  title,
  icon,
  hue,
  activities,
  counts,
  isLoading,
  emptyText,
  className,
}: {
  title: string;
  icon: LucideIcon;
  hue: WallHueKey;
  activities: readonly GateActivity[];
  counts: Record<string, number | undefined>;
  isLoading: boolean;
  emptyText: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const palette = useWallPalette();
  const hex = palette.hue(hue);
  const listRef = useRef<HTMLUListElement>(null);
  useAutoScroll(listRef, activities.length >= GATE_AUTO_SCROLL_FROM);

  const rows = [...activities].sort((a, b) => (counts[b.route] ?? -1) - (counts[a.route] ?? -1));
  const max = Math.max(...rows.map((row) => counts[row.route] ?? 0), 1);
  const total = rows.reduce((sum, row) => sum + (counts[row.route] ?? 0), 0);
  const unread = rows.filter((row) => counts[row.route] === undefined).length;

  return (
    <BoardPanel
      title={title}
      icon={icon}
      hex={hex}
      className={className}
      flush
      aside={
        <>
          <PanelBadge>{count(total)}</PanelBadge>
          {unread > 0 && !isLoading && <PanelBadge tone="warn">{unread} unread</PanelBadge>}
        </>
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty>{emptyText}</PanelEmpty>
      ) : (
        <ul
          ref={listRef}
          className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/5"
        >
          {rows.map((row) => {
            const value = counts[row.route];
            const Icon = row.icon;
            return (
              <li key={row.route}>
                <button
                  type="button"
                  onClick={() => navigate(row.route)}
                  className="relative flex w-full items-center gap-3 overflow-hidden px-4 py-2.5 text-left transition-colors hover:bg-black/[0.035] focus:outline-none focus-visible:bg-black/[0.05] dark:hover:bg-white/[0.05] dark:focus-visible:bg-white/[0.07]"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500"
                    style={{
                      width: `${((value ?? 0) / max) * 100}%`,
                      backgroundColor: hex,
                      opacity: 0.12,
                    }}
                  />

                  <span
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${hex}24` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: hex }} />
                  </span>

                  <span className="relative z-10 min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold text-foreground">
                        {row.title}
                      </span>
                      {value !== undefined ? (
                        <span className="shrink-0 text-lg font-bold leading-none tabular-nums text-foreground">
                          {count(value)}
                        </span>
                      ) : isLoading ? (
                        <span className="h-5 w-8 shrink-0 animate-pulse rounded-md bg-muted/60" />
                      ) : (
                        <span
                          title="This register could not be read"
                          className="shrink-0 text-lg font-bold leading-none text-muted-foreground/40"
                        >
                          —
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
                      {row.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BoardPanel>
  );
}
