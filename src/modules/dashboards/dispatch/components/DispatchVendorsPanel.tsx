import { Handshake } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import type { DispatchDayVehicles } from '../hooks';
import { useAutoScroll } from '../hooks';
import { compact, count, money, weight } from '../utils/format';
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
  const listRef = useRef<HTMLUListElement>(null);

  const rows = vehicles.byVendor;
  useAutoScroll(listRef, rows.length >= AUTO_SCROLL_FROM);

  const max = Math.max(...rows.map((row) => row.amount), 1);
  const totalTrucks = rows.reduce((sum, row) => sum + row.trucks, 0);

  return (
    <BoardPanel
      title="Today's vendors"
      icon={Handshake}
      hex="#a78bfa"
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
            : 'No transporter has worked today yet.'}
        </PanelEmpty>
      ) : (
        <ul
          ref={listRef}
          className="wall-scroll min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto"
        >
          {rows.map((row, index) => (
            <li key={row.name}>
              <button
                type="button"
                onClick={() => navigate('/dispatch/open-bilties')}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.05] focus:outline-none focus-visible:bg-white/[0.07]"
              >
                <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-slate-600">
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-white">{row.name}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-violet-300">
                      {money(row.amount)}
                    </span>
                  </span>

                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-[width] duration-700"
                        style={{
                          width: `${Math.max((row.amount / max) * 100, row.amount > 0 ? 4 : 0)}%`,
                        }}
                      />
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                      {compact(row.boxes)} bx &middot; {weight(row.weightKg)}
                    </span>
                  </span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-300">
                    {row.trucks} {row.trucks === 1 ? 'truck' : 'trucks'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider tabular-nums',
                      row.trucksIn > 0 ? 'text-amber-300' : 'text-slate-600',
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
