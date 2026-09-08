import { ChevronDown, ChevronRight, Factory, TrendingDown, TrendingUp } from 'lucide-react';
import { Fragment, useState } from 'react';

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

import type { PmDemandBoard } from '../constants';
import { PM_DEMAND_BOARDS } from '../constants';
import type { ConsumptionBasis, PmDemandItem } from '../types';
import {
  buildFunnel,
  COVER_STYLES,
  describeCover,
  formatInr,
  formatPct,
  formatQty,
  varianceTone,
} from '../utils';

interface PmDemandTopTableProps {
  board: PmDemandBoard;
  items: PmDemandItem[];
  isLoading?: boolean;
  /** Total the shares are of, for the footer line. */
  periodValue?: number;
  /**
   * What the consumption column measures. Renames the heading and the column
   * so app-mode approved quantities are never read as actual issue.
   */
  basis?: ConsumptionBasis;
}

const VARIANCE_STYLES: Record<string, string> = {
  over: 'text-amber-600 dark:text-amber-500',
  under: 'text-sky-600 dark:text-sky-400',
  match: 'text-muted-foreground',
  unknown: 'text-muted-foreground',
};

export function PmDemandTopTable({
  board,
  items,
  isLoading,
  periodValue,
  basis = 'issued',
}: PmDemandTopTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const config = PM_DEMAND_BOARDS[board][basis];
  const isProduction = board === 'production';
  const consumedHeading = basis === 'approved' ? 'Approved' : 'Consumed';

  const listedValue = items.reduce(
    (sum, item) => sum + (isProduction ? item.consumed_value : item.dispatched_value),
    0,
  );

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{config.label}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No packing material{' '}
            {isProduction ? consumedHeading.toLowerCase() : 'shipped'} in this period.
          </p>
        ) : (
          <>
            {/* Wide on its own, so it scrolls inside the card rather than
                pushing the whole page into a horizontal scroll. */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-xs uppercase text-muted-foreground">
                    <th className="w-8" />
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-left font-medium">Family</th>
                    <th className="px-3 py-2 text-right font-medium">
                      {isProduction ? consumedHeading : 'Shipped'}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Value</th>
                    <th className="px-3 py-2 text-right font-medium">Share</th>
                    {isProduction ? (
                      <>
                        <th className="px-3 py-2 text-right font-medium">Per recipe</th>
                        <th className="px-3 py-2 text-right font-medium">Variance</th>
                        <th className="px-3 py-2 text-right font-medium">Per 1,000 FG</th>
                        <th className="px-3 py-2 text-right font-medium">Cover</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-right font-medium">{consumedHeading}</th>
                        <th className="px-3 py-2 text-right font-medium">Still in FG</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const tone = varianceTone(item);
                    const isOpen = expanded === item.item_code;
                    return (
                      <Fragment key={item.item_code}>
                        <tr
                          className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                          onClick={() => setExpanded(isOpen ? null : item.item_code)}
                        >
                          <td className="pl-3 text-muted-foreground">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {item.item_code}
                              </span>
                              {item.in_house && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 px-1.5 py-0 text-[10px]"
                                  title="Most of this item's consumption was made in-house, not bought in"
                                >
                                  <Factory className="h-3 w-3" />
                                  in-house
                                </Badge>
                              )}
                            </div>
                            <div className="max-w-[22rem] truncate font-medium">
                              {item.item_name || '--'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {item.sub_group || 'UNGROUPED'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatQty(
                              isProduction ? item.consumed_qty : item.dispatched_qty,
                              item.uom,
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatInr(
                              isProduction ? item.consumed_value : item.dispatched_value,
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {item.share_pct.toFixed(1)}%
                          </td>
                          {isProduction ? (
                            <>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {item.bom_qty ? formatQty(item.bom_qty) : '--'}
                              </td>
                              <td
                                className={`px-3 py-2 text-right tabular-nums ${VARIANCE_STYLES[tone]}`}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {tone === 'over' && <TrendingUp className="h-3.5 w-3.5" />}
                                  {tone === 'under' && <TrendingDown className="h-3.5 w-3.5" />}
                                  {tone === 'match' ? 'on recipe' : formatPct(item.variance_pct)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {item.per_1000_fg != null ? formatQty(item.per_1000_fg) : '--'}
                              </td>
                              <td
                                className={`px-3 py-2 text-right tabular-nums ${
                                  COVER_STYLES[item.cover_status]
                                }`}
                                title={describeCover(item)}
                              >
                                {item.days_cover_incl_po != null
                                  ? item.days_cover_incl_po.toFixed(0)
                                  : '--'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {formatQty(item.consumed_qty)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {formatQty(item.retained_qty)}
                              </td>
                            </>
                          )}
                        </tr>
                        {isOpen && (
                          <tr className="border-b bg-muted/20">
                            <td colSpan={isProduction ? 11 : 9} className="px-4 py-4">
                              <ItemFunnel item={item} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {periodValue != null && periodValue > 0 && (
              <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                These {items.length} items are {formatInr(listedValue)} of{' '}
                {formatInr(periodValue)} — {((listedValue / periodValue) * 100).toFixed(1)}% of the
                period&rsquo;s packing material{' '}
                {isProduction
                  ? basis === 'approved'
                    ? 'approved to production'
                    : 'consumption'
                  : 'shipped inside finished goods'}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * One item's "made 400, shipped 200" split.
 *
 * This is the row the whole board exists for: the same packaging counted at
 * two stages, with the gap between them named. The bars are drawn from
 * magnitudes so a negative retained stage still has a length.
 */
function ItemFunnel({ item }: { item: PmDemandItem }) {
  const stages = buildFunnel(item);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {stages.map((stage) => (
          <div key={stage.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span
                className={
                  stage.key === 'retained' && stage.qty < 0
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-muted-foreground'
                }
              >
                {stage.label}
              </span>
              <span className="tabular-nums">
                <span className="font-medium">{formatQty(stage.qty, item.uom)}</span>
                <span className="ml-2 text-muted-foreground">{formatInr(stage.value)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  stage.key === 'consumed'
                    ? 'bg-primary'
                    : stage.key === 'dispatched'
                      ? 'bg-primary/60'
                      : 'bg-primary/30'
                }`}
                style={{ width: `${Math.min(stage.pctOfConsumed, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
        <Detail label="Unit price" value={formatInr(item.unit_price)} />
        {item.in_house_qty > 0 && (
          <Detail label="Made in-house" value={formatQty(item.in_house_qty, item.uom)} />
        )}
        <Detail
          label="On hand now"
          value={`${formatQty(item.stock_qty, item.uom)} · ${formatInr(item.stock_value)}`}
        />
        <Detail label="Cover" value={describeCover(item)} />
        {item.open_po_qty > 0 && (
          <Detail
            label={item.open_po_overdue ? 'On order (overdue)' : 'On order'}
            value={`${formatQty(item.open_po_qty, item.uom)} · ${item.open_po_lines} line${
              item.open_po_lines === 1 ? '' : 's'
            }`}
          />
        )}
        <Detail label="Per recipe" value={formatQty(item.bom_qty, item.uom)} />
        <Detail
          label="Variance"
          value={`${formatQty(item.variance_qty, item.uom)} (${formatPct(item.variance_pct)})`}
        />
        <Detail
          label="Scrapped"
          value={
            item.wastage_qty
              ? `${formatQty(item.wastage_qty, item.uom)} · ${formatInr(item.wastage_value)}`
              : 'none'
          }
        />
      </dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">{value}</dd>
    </div>
  );
}
