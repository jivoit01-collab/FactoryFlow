import { Users } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '@/shared/utils';

import { useWallPalette } from '../constants/wall.palette';
import type { CustomerSlice, DispatchDayVehicles } from '../hooks';
import { useAutoScroll, useBoardDay } from '../hooks';
import { compact, count, kilos, litres, money } from '../utils/format';
import { BoardPanel, PanelBadge, PanelEmpty } from './BoardPanel';

/** Below this many rows the list fits, and creeping it would just be motion. */
const AUTO_SCROLL_FROM = 7;

/**
 * Who the day's freight is for, and how much of it has actually gone.
 *
 * Read off the docking register rather than the summary's `by_customer`, for one
 * reason that matters: the summary counts gate-outs only, so a customer with two
 * loads where one has left and one is still at the dock appears as a single
 * shipped truck and the waiting one is invisible. Here each row carries its own
 * out/in split, which is the question this panel gets asked.
 *
 * Value counts only what has cleared the gate, so the column adds up to the
 * headline figure. A customer showing no value but one truck IN has freight
 * loaded and not yet away — that is the row worth chasing, and it is why the
 * sort falls back to truck count.
 *
 * Scope: a customer appears once a docking exists for it. Bills whose truck has
 * not arrived are backlog, not floor, and live on the backlog tile instead.
 */
export function DispatchCustomersPanel({ vehicles }: { vehicles: DispatchDayVehicles }) {
  const day = useBoardDay();
  const palette = useWallPalette();
  const listRef = useRef<HTMLUListElement>(null);

  const rows = vehicles.byCustomer;
  useAutoScroll(listRef, rows.length >= AUTO_SCROLL_FROM);

  const max = Math.max(...rows.map((row) => row.amount), 1);
  const waiting = rows.reduce((sum, row) => sum + row.trucksIn, 0);
  const gone = rows.reduce((sum, row) => sum + row.trucksOut, 0);

  return (
    <BoardPanel
      title={day.isToday ? "Today's customers" : 'Customers that day'}
      icon={Users}
      hex={palette.hue('boxes')}
      flush
      aside={
        <>
          <PanelBadge>{count(rows.length)} customers</PanelBadge>
          {waiting > 0 && <PanelBadge tone="warn">{count(waiting)} waiting</PanelBadge>}
        </>
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty>
          {vehicles.isLoading
            ? 'Reading the docking register...'
            : day.isToday
              ? 'No customer freight at the dock or out of the gate yet.'
              : 'No customer freight moved that day.'}
        </PanelEmpty>
      ) : (
        <>
          <ul
            ref={listRef}
            className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/5"
          >
            {rows.map((row, index) => (
              <CustomerRowItem key={row.code} row={row} rank={index + 1} max={max} />
            ))}
          </ul>
          <p className="shrink-0 border-t border-black/[0.06] px-4 py-1.5 text-[11px] text-muted-foreground/70 dark:border-white/5">
            {count(gone)} truck{gone === 1 ? '' : 's'} out
            {waiting > 0 && (
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {' '}
                · {count(waiting)} still loading
              </span>
            )}
            {' · '}
            {count(rows.length)} customer{rows.length === 1 ? '' : 's'}
          </p>
        </>
      )}
    </BoardPanel>
  );
}

function CustomerRowItem({ row, rank, max }: { row: CustomerSlice; rank: number; max: number }) {
  // Litres lead, for the reason the vendor row led with them: SAP's weight on
  // this data has arrived truncated often enough that one bad bill can make a
  // customer look like it took delivery of nothing.
  const hasLitres = row.litres > 0;
  const hasQuantity = hasLitres || row.weightKg > 0;
  /** Nothing has gone for this customer yet — every truck is still inside. */
  const allWaiting = row.trucksOut === 0;

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground/60">
        {rank}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold text-foreground">{row.name}</span>
          {allWaiting ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-amber-700/90 dark:text-amber-300/90">
              nothing out yet
            </span>
          ) : (
            <span
              // A shared load's value is apportioned, so the row must not read
              // as an exact figure for this customer alone.
              title={
                row.sharedLoads > 0
                  ? `${row.sharedLoads} of these load(s) were shared with another customer. One SAP total covers every bill on a shared docking, so this value is divided evenly across the customers on it.`
                  : undefined
              }
              className="shrink-0 text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300"
            >
              {row.sharedLoads > 0 && <span aria-hidden>~</span>}
              {money(row.amount)}
            </span>
          )}
        </span>

        <span className="mt-1 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-[width] duration-700"
              style={{ width: `${Math.max((row.amount / max) * 100, row.amount > 0 ? 4 : 0)}%` }}
            />
          </span>
          {hasQuantity && (
            <span
              title={row.code}
              className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80"
            >
              {hasLitres ? litres(row.litres) : kilos(row.weightKg)}
              {row.boxes > 0 ? ` · ${compact(row.boxes)} bx` : ''}
            </span>
          )}
        </span>
      </span>

      {/* The out/in split. This is the reason the panel reads the docking
          register: one customer, two trucks, one gone and one still loading. */}
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full border border-black/[0.09] bg-black/[0.035] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground dark:border-white/10 dark:bg-white/5">
          {row.trucks} {row.trucks === 1 ? 'truck' : 'trucks'}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider tabular-nums">
          <span
            className={cn(
              row.trucksOut > 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-muted-foreground/50',
            )}
          >
            {row.trucksOut} out
          </span>
          {row.trucksIn > 0 && (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <span className="text-amber-700 dark:text-amber-300">{row.trucksIn} in</span>
            </>
          )}
        </span>
      </span>
    </li>
  );
}
