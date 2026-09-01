import { Coins } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { useAutoScroll } from '../../dispatch/hooks';
import { count, money } from '../../dispatch/utils/format';
import { AUTO_SCROLL_FROM } from '../constants/production-wall.constants';
import type { CostSlice } from '../hooks';

/**
 * Where the day's money went, biggest line first.
 *
 * The figures are computed on the backend from each run's running hours ×
 * Cost Master rates, plus BOM material at last purchase price — so a day with
 * no rates behind it has no cost, and the panel says exactly that instead of
 * drawing an honest-looking ₹0. Somebody standing at a screen that names the
 * missing setup goes and fixes it.
 *
 * Waste recovery is a credit and is drawn in green with a minus, because a
 * board that added the scrap sale to the cost column would overstate every
 * shift that sold a drum of skimmings.
 */
export function CostBreakdownPanel({
  cost,
  unitNoun,
  className,
}: {
  cost: CostSlice;
  unitNoun: string;
  className?: string;
}) {
  const palette = useWallPalette();
  const listRef = useRef<HTMLDivElement>(null);
  useAutoScroll(listRef, cost.categories.length >= AUTO_SCROLL_FROM);

  const hex = palette.hue('cost');
  const max = Math.max(...cost.categories.map((row) => row.amount), 1);

  return (
    <BoardPanel
      title="Where the cost goes"
      icon={Coins}
      hex={hex}
      className={className}
      flush
      aside={
        cost.total > 0 ? (
          <>
            <PanelBadge>{money(cost.total)}</PanelBadge>
            <PanelBadge tone="good">
              {money(cost.perCase)}/{unitNoun}
            </PanelBadge>
          </>
        ) : undefined
      }
    >
      {cost.isError ? (
        <PanelEmpty>The cost report could not be read for this day.</PanelEmpty>
      ) : cost.categories.length === 0 ? (
        <PanelEmpty>
          {cost.isLoading
            ? 'Costing the day…'
            : 'No cost behind this day yet — set rates in Cost Master and the runs cost themselves.'}
        </PanelEmpty>
      ) : (
        <>
          {cost.wasteRecovery > 0 && (
            <div className="shrink-0 border-y border-black/[0.06] bg-black/[0.03] px-4 py-1.5 text-[11px] tabular-nums text-muted-foreground dark:border-white/5 dark:bg-white/[0.035]">
              net{' '}
              <span className="font-bold text-foreground">{money(cost.net)}</span> after{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                −{money(cost.wasteRecovery)}
              </span>{' '}
              waste recovery · {count(cost.runCount)} costed runs
            </div>
          )}

          <div ref={listRef} className="wall-scroll min-h-0 flex-1 overflow-y-auto px-4 py-2">
            <ul className="flex flex-col gap-1.5">
              {cost.categories.map((row) => (
                <li key={row.label} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.credit ? '#10b981' : hex }}
                      />
                      <span className="truncate text-xs font-semibold text-foreground">
                        {row.label}
                      </span>
                      {row.credit && (
                        <span className="shrink-0 rounded bg-emerald-500/10 px-1 text-[9px] font-bold uppercase text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                          credit
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">
                      <span
                        className={cn(
                          'font-bold',
                          row.credit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-foreground',
                        )}
                      >
                        {row.credit ? '−' : ''}
                        {money(row.amount)}
                      </span>
                      <span className="ml-1.5 text-muted-foreground/70">
                        {row.pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${(row.amount / max) * 100}%`,
                        backgroundColor: row.credit ? '#10b981' : hex,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </BoardPanel>
  );
}
