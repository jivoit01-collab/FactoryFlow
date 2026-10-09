import { useMemo } from 'react';

import type { ProductionDispatchReport } from '../types';
import { fmtPallet, fmtWhole, type ItemRow, monthsInRange } from '../utils';
import { flowColumns, groupQtyColumn, movementColumn, skuColumns } from './columns';
import { type SheetColumn, SheetTable } from './SheetTable';

/**
 * The workbook's Item Master: every SKU that moved in the range, its SAP
 * classification and factors, what it made and sold in each unit, and its
 * FAST / SLOW over the movement window. An item code opens its documents for
 * the range.
 */
export function ItemsTab({
  report,
  items,
  onOpenItem,
}: {
  report: ProductionDispatchReport;
  items: ItemRow[];
  onOpenItem: (itemCode: string) => void;
}) {
  const columns = useMemo<SheetColumn<ItemRow>[]>(() => {
    const months = monthsInRange(report);
    const window = report.settings.movement_window_days;
    const windowMonths = window / report.settings.month_days;
    return [
      ...skuColumns<ItemRow>((row) => onOpenItem(row.item.item_code)),
      ...flowColumns<ItemRow>(),
      {
        key: 'monthly_dispatch_pallet',
        label: 'Avg Monthly Dispatch PALLET',
        value: (row) => fmtPallet(months > 0 ? row.dispatch.pallet / months : 0),
        number: (row) => (months > 0 ? row.dispatch.pallet / months : 0),
        align: 'right',
        decimals: 2,
      },
      {
        key: 'window_monthly_production',
        label: `Avg Monthly Prod Qty (${window} d)`,
        value: (row) => fmtWhole(row.item.window_production / windowMonths),
        sort: (row) => row.item.window_production,
        align: 'right',
      },
      {
        key: 'window_daily_dispatch',
        label: `Avg Daily Dispatch Qty (${window} d)`,
        value: (row) => fmtWhole(row.item.window_dispatch / window),
        sort: (row) => row.item.window_dispatch,
        align: 'right',
      },
      {
        key: 'days_to_dispatch',
        label: 'Days to Dispatch',
        value: (row) =>
          row.item.days_to_dispatch === null ? '—' : fmtWhole(row.item.days_to_dispatch),
        sort: (row) => row.item.days_to_dispatch,
        align: 'right',
      },
      movementColumn<ItemRow>(),
      groupQtyColumn<ItemRow>(),
    ];
  }, [report, onOpenItem]);

  return (
    <SheetTable
      rows={items}
      columns={columns}
      rowKey={(row) => row.item.item_code}
      initialSort={{ key: 'item_code', direction: 'asc' }}
      countNoun={['SKU', 'SKUs']}
      emptyText="No SKU was produced or dispatched in this range."
    />
  );
}
