import { Coins, Hourglass } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { useAutoScroll } from '../../dispatch/hooks';
import { count, money } from '../../dispatch/utils/format';
import { AUTO_SCROLL_FROM } from '../constants/production-wall.constants';
import type { CostHeadRow, CostSlice } from '../hooks';

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
 *
 * With the trend chart's RM/PM switch off, the bought-in material line is gone
 * from this list and the shares are re-based on what is left. The badge says so
 * — a breakdown that silently dropped its biggest line would read as a plant
 * that suddenly stopped buying oil.
 *
 * The figures are each run's own rollup, summed — not the cost-analysis report,
 * which counts completed runs only and left this panel empty for the whole
 * shift. A run is costed the moment its resources are entered, and that is when
 * it should appear here.
 *
 * Until any run is costed there is still nothing to break down, and a wall
 * panel that simply said so would look broken. So it lists the heads the day
 * WILL be priced under instead, straight from the Cost Master, and names what
 * has to happen for figures to appear.
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
            {!cost.includesMaterial && (
              <PanelBadge tone="warn">excl. RM/PM {money(cost.material)}</PanelBadge>
            )}
            <PanelBadge>{money(cost.total)}</PanelBadge>
            {cost.costedCases > 0 ? (
              <PanelBadge tone="good">
                {money(cost.perCase)}/{unitNoun}
              </PanelBadge>
            ) : (
              <PanelBadge tone="warn">no {unitNoun}s closed</PanelBadge>
            )}
          </>
        ) : undefined
      }
    >
      {cost.isError ? (
        <PanelEmpty>The cost report could not be read for this day.</PanelEmpty>
      ) : cost.isLoading ? (
        <PanelEmpty>Costing the day…</PanelEmpty>
      ) : cost.categories.length === 0 ? (
        <PendingHeads cost={cost} />
      ) : (
        <>
          {cost.wasteRecovery > 0 && (
            <div className="shrink-0 border-y border-black/[0.06] bg-black/[0.03] px-4 py-1.5 text-[11px] tabular-nums text-muted-foreground dark:border-white/5 dark:bg-white/[0.035]">
              net <span className="font-bold text-foreground">{money(cost.net)}</span> after{' '}
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
                          row.credit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
                        )}
                      >
                        {row.credit ? '−' : ''}
                        {money(row.amount)}
                      </span>
                      <span className="ml-1.5 text-muted-foreground/70">{row.pct.toFixed(0)}%</span>
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

/**
 * The panel with nothing to break down yet: what the plant charges a run for,
 * and why none of it has landed.
 *
 * Deliberately not a bare "no data" — the heads are the answer to the question
 * somebody standing at this screen is actually asking, and the line underneath
 * says which action makes the numbers appear. When the Cost Master itself is
 * empty that IS the finding, and it is the only thing shown.
 */
function PendingHeads({ cost }: { cost: CostSlice }) {
  const materialOnly = !cost.includesMaterial && cost.material > 0;

  if (cost.heads.length === 0) {
    return (
      <PanelEmpty>
        No cost heads are configured — open Cost Master and set the rates a run should be charged
        at. Until then no run can be costed.
      </PanelEmpty>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start gap-2 border-y border-black/[0.06] bg-black/[0.03] px-4 py-2 text-[11px] leading-snug text-muted-foreground dark:border-white/5 dark:bg-white/[0.035]">
        <Hourglass className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          {materialOnly ? (
            <>
              All of this day&apos;s cost was bought-in material (
              <span className="font-semibold text-foreground">{money(cost.material)}</span>) —
              nothing is left with RM/PM switched out.
            </>
          ) : (
            <>
              No run has been costed yet. Cost lands on a run once its resources are entered —
              labour, electricity, machine hours, BOM material.
            </>
          )}
        </span>
      </div>

      <div className="wall-scroll min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Heads this day will be priced under
        </p>
        <ul className="flex flex-col gap-1">
          {cost.heads.map((head) => (
            <HeadRow key={head.key} head={head} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function HeadRow({ head }: { head: CostHeadRow }) {
  return (
    <li className="flex items-baseline justify-between gap-3 rounded-lg border border-black/[0.06] bg-black/[0.015] px-2.5 py-1.5 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            head.credit ? 'bg-emerald-500' : 'bg-muted-foreground/40',
          )}
        />
        <span className="truncate text-xs font-semibold text-foreground/85">{head.label}</span>
        {head.credit && (
          <span className="shrink-0 rounded bg-emerald-500/10 px-1 text-[9px] font-bold uppercase text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            credit
          </span>
        )}
        {head.fromBom && (
          <span className="shrink-0 rounded bg-black/[0.05] px-1 text-[9px] font-bold uppercase text-muted-foreground dark:bg-white/10">
            no rate
          </span>
        )}
      </span>
      <span className="shrink-0 truncate text-[11px] tabular-nums text-muted-foreground/80">
        {head.rate}
      </span>
    </li>
  );
}
