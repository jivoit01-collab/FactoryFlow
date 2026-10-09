import { useMemo } from 'react';

import { type DayItemRow, dayLabel } from '../utils';
import { flowColumns, groupQtyColumn, movementColumn, skuColumns } from './columns';
import { type SheetColumn, SheetTable } from './SheetTable';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekday(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(year, month - 1, day, 12).getDay()];
}

/**
 * The Items sheet day by day: one row per SKU per day it was made or sold,
 * with every column Items has. Filter the Date column to read one day, the
 * Item No. column to follow one SKU through the range; the foot adds up
 * whatever is left on screen. An item code opens that day's documents.
 */
export function SummaryTab({
  rows,
  onOpenItemDay,
}: {
  rows: DayItemRow[];
  onOpenItemDay: (itemCode: string, date: string) => void;
}) {
  const columns = useMemo<SheetColumn<DayItemRow>[]>(
    () => [
      {
        key: 'date',
        label: 'Date',
        value: (row) => dayLabel(row.date),
        sort: (row) => row.date,
      },
      { key: 'weekday', label: 'Day', value: (row) => weekday(row.date) },
      ...skuColumns<DayItemRow>((row) => onOpenItemDay(row.item.item_code, row.date)),
      ...flowColumns<DayItemRow>(),
      movementColumn<DayItemRow>(),
      groupQtyColumn<DayItemRow>(),
    ],
    [onOpenItemDay],
  );

  return (
    <SheetTable
      rows={rows}
      columns={columns}
      rowKey={(row) => `${row.date}|${row.item.item_code}`}
      initialSort={{ key: 'date', direction: 'asc' }}
      countNoun={['line', 'lines']}
      emptyText="Nothing was produced or dispatched in this range."
    />
  );
}
