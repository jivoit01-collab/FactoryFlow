import { Handshake } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { useWallPalette } from '../constants/wall.palette';
import type { DispatchDayVehicles } from '../hooks';
import { useAutoScroll, useBoardDay } from '../hooks';
import { compact, count, money, volume, weight } from '../utils/format';
import { BoardPanel, PanelBadge, PanelEmpty } from './BoardPanel';

/** Below this many rows the list fits, and creeping it would just be motion. */
const AUTO_SCROLL_FROM = 7;

/**
 * Who is moving today's freight. One row per transporter, biggest by value
 * first, with a bar for share of the day.
 *
 * Value counts only what has actually left the gate, so the bars add up to the
 * headline dispatched figure. Trucks still inside are shown as a separate IN
 * chip rather than folded into the money -- a loaded truck standing at the dock
 * has not earned anybody anything yet.
 */
export function DispatchVendorsPanel({ vehicles }: { vehicles: DispatchDayVehicles }) {
  const navigate = useNavigate();
  const day = useBoardDay();
  const palette = useWallPalette();
  const listRef = useRef<HTMLUListElement>(null);

  const rows = vehicles.byVendor;
  useAutoScroll(listRef, rows.length >= AUTO_SCROLL_FROM);

  const max = Math.max(...rows.map((row) => row.amount), 1);
  const totalTrucks = rows.reduce((sum, row) => sum + row.trucks, 0);

  return (
    <BoardPanel
      title={day.isToday ? "Today's vendors" : 'Vendors that day'}
      icon={Handshake}
      hex={palette.hue('boxes')}
      flush
      aside={
        <>
          <PanelBadge>{count(rows.length)} vendors</PanelBadge>
          <PanelBadge tone="good">{count(totalTrucks)} trucks</PanelBadge>
        </>
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty>
          {vehicles.isLoading
            ? 'Reading the docking register...'
            : 'No transporter worked that day.'}
        </PanelEmpty>
      ) : (
        <ul
          ref={listRef}
          className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] dark:divide-white/5 overflow-y-auto"
        >
          {rows.map((row, index) => (
            <li key={row.name}>
              <button
                type="button"
                onClick={() => navigate('/dispatch/open-bilties')}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.035] dark:hover:bg-white/[0.05] focus:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]"
              >
                <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground/60">
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-foreground">{row.name}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">
                      {money(row.amount)}
                    </span>
                  </span>

                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-[width] duration-700"
                        style={{
                          width: `${Math.max((row.amount / max) * 100, row.amount > 0 ? 4 : 0)}%`,
                        }}
                      />
                    </span>
                    {/* Litres first, weight only as the fallback for a load
                        that carries none. A single mis-recorded weight can
                        dominate one vendor's row -- 2,195 L has arrived from SAP
                        as 195 kg -- and it was the weight that was wrong on
                        every such row, never the litres. The weight is still
                        one hover away rather than lost. */}
                    <span
                      title={`${weight(row.weightKg)} recorded weight`}
                      className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80"
                    >
                      {row.litres > 0
                        ? `${volume(row.litres)} · ${compact(row.boxes)} bx`
                        : `${compact(row.boxes)} bx · ${weight(row.weightKg)}`}
                    </span>
                  </span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full border border-black/[0.09] dark:border-white/10 bg-black/[0.035] dark:bg-white/5 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground/75">
                    {row.trucks} {row.trucks === 1 ? 'truck' : 'trucks'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider tabular-nums',
                      row.trucksIn > 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-muted-foreground/60',
                    )}
                  >
                    {row.trucksOut} out
                    {row.trucksIn > 0 ? ` · ${row.trucksIn} in` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </BoardPanel>
  );
}
