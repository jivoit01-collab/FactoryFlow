import { PackageCheck, TriangleAlert } from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import type { PmDemandItem, PmDemandMeta } from '../types';
import {
  COVER_LABELS,
  COVER_STYLES,
  describeCover,
  formatCover,
  formatInr,
  formatQty,
} from '../utils';

interface PmDemandCoverPanelProps {
  items: PmDemandItem[];
  meta?: PmDemandMeta;
  isLoading?: boolean;
}

/**
 * What runs out first.
 *
 * The only list on this board not ranked by value, and deliberately so: a
 * 22-paise label that stops the line tomorrow halts production exactly as hard
 * as a rupee-nine cap would. Ranking this by spend would bury the cheap thing
 * that is about to hurt underneath the expensive thing that is fine.
 *
 * Cover is in WORKING days -- the factory does not run Sunday, so a
 * calendar-day figure would flatter every row by about a fifth.
 */
export function PmDemandCoverPanel({ items, meta, isLoading }: PmDemandCoverPanelProps) {
  const atRisk = items.filter(
    (item) => item.cover_status === 'critical' || item.cover_status === 'low',
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Runs out first</CardTitle>
            <CardDescription>
              Stock on hand against the rate the line burned it
              {meta ? ` over ${meta.period_working_days} working days` : ''}
              {/* The app holds no packing-material stock and no purchase
                  orders, so this panel is SAP-sourced in both modes. Saying so
                  is the only thing that stops it reading as app data. */}
              {meta?.source === 'app' && (
                <span className="mt-1 block font-medium text-foreground">
                  Stock and orders from SAP — the app holds neither
                </span>
              )}
            </CardDescription>
          </div>
          {atRisk.length > 0 && (
            <Badge variant="outline" className="shrink-0 gap-1">
              <TriangleAlert className="h-3 w-3" />
              {atRisk.length} to watch
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <PackageCheck className="h-5 w-5" />
            <span>Nothing to report — no packing material was consumed in this period.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">On hand</th>
                    <th className="px-3 py-2 text-right font-medium">On order</th>
                    <th className="px-3 py-2 text-right font-medium">Per working day</th>
                    <th className="px-3 py-2 text-right font-medium">Cover</th>
                    <th className="px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.item_code} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.item_code}
                        </span>
                        <div className="max-w-[18rem] truncate font-medium">
                          {item.item_name || '--'}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.sub_group || 'UNGROUPED'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatQty(item.stock_qty, item.uom)}
                        <div className="text-xs text-muted-foreground">
                          {formatInr(item.stock_value)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.open_po_qty > 0 ? (
                          <>
                            {formatQty(item.open_po_qty, item.uom)}
                            <div
                              className={`text-xs ${
                                item.open_po_overdue
                                  ? 'text-amber-600 dark:text-amber-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {item.open_po_earliest_due
                                ? `${item.open_po_overdue ? 'overdue since' : 'due'} ${
                                    item.open_po_earliest_due
                                  }`
                                : `${item.open_po_lines} open lines`}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">none</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {item.avg_daily_qty != null ? formatQty(item.avg_daily_qty) : '--'}
                      </td>
                      {/* Both figures, always: a thin shelf under a green
                          badge reads as a bug unless the reason is visible. */}
                      <td
                        className={`px-3 py-2 text-right font-medium tabular-nums ${
                          COVER_STYLES[item.cover_status]
                        }`}
                        title={describeCover(item)}
                      >
                        {formatCover(item.days_cover_incl_po)}
                        {item.open_po_qty > 0 && (
                          <div className="text-xs font-normal text-muted-foreground">
                            {formatCover(item.days_cover)} on hand
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Badge
                          variant={item.cover_status === 'critical' ? 'destructive' : 'outline'}
                          className="text-[10px]"
                        >
                          {COVER_LABELS[item.cover_status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                Stock read live from{' '}
                <span className="font-medium text-foreground">
                  {meta.stock_warehouses.join(', ') || 'no warehouse configured'}
                </span>{' '}
                — wastage, non-moving and job-work stores are not counted.
                {' '}Cover counts stock plus open purchase orders, because bulk-bought
                packaging is under a day on the shelf before every delivery. Under{' '}
                {meta.cover_critical_days} working days on that basis is an order to place
                today; under {meta.cover_low_days} is worth watching. Overdue orders are
                flagged but still counted — a late supplier and a purchase order nobody
                closed look the same from here.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
