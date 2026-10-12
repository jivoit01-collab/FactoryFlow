import { useMemo } from 'react';

import { formatNumber } from '@/shared/utils';

import type { ProductionDispatchReport } from '../types';
import { fmtWhole, type ItemRow, monthsInRange } from '../utils';
import {
  flowColumns,
  groupQtyColumn,
  type MeasureKey,
  MEASURES,
  movementColumn,
  skuColumns,
} from './columns';
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
  unit,
  onOpenItem,
}: {
  report: ProductionDispatchReport;
  items: ItemRow[];
  unit: MeasureKey;
  onOpenItem: (itemCode: string) => void;
}) {
  const columns = useMemo<SheetColumn<ItemRow>[]>(() => {
    const months = monthsInRange(report);
    const window = report.settings.movement_window_days;
    const windowMonths = window / report.settings.month_days;
    const label = MEASURES.find((measure) => measure.key === unit)?.label ?? unit;
    const decimals = unit === 'ton' || unit === 'pallet' ? 2 : 0;
    const monthly = (row: ItemRow) => (months > 0 ? row.dispatch[unit] / months : 0);
    return [
      ...skuColumns<ItemRow>((row) => onOpenItem(row.item.item_code)),
      ...flowColumns<ItemRow>(unit),
      {
        key: `monthly_dispatch_${unit}`,
        label: `Avg Monthly Dispatch ${label}`,
        value: (row) => formatNumber(monthly(row), decimals),
        number: monthly,
        align: 'right',
        decimals,
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
  }, [report, unit, onOpenItem]);

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
