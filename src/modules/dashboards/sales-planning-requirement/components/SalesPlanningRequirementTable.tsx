import { Copy, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  ColumnFilter,
  columnLetter,
  type ColumnSpec,
  copyBlock,
  useLocalColumns,
  useSheetSelection,
  useSpreadsheetKeys,
} from '@/shared/components/sheetGrid';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatNumber } from '@/shared/utils';

import type { SalesPlanningRequirementItem } from '../types';
import { SalesPlanningRequirementMetaCards } from './SalesPlanningRequirementMetaCards';

interface SalesPlanningRequirementTableProps {
  items: SalesPlanningRequirementItem[];
  isLoading: boolean;
  /** The Find box: matches any cell the sheet shows. */
  search: string;
}

type Row = SalesPlanningRequirementItem;

interface SheetColumn {
  key: string;
  label: string;
  value: (row: Row) => string;
  /** The figure behind a quantity cell: what it sorts, sums and selects by. */
  number?: (row: Row) => number;
  sort?: (row: Row) => string | number | null;
  align?: 'right';
  wide?: boolean;
}

function isShortage(row: Row) {
  return row.net_shortage_qty > 0;
}

function quantity(key: string, label: string, pick: (row: Row) => number): SheetColumn {
  return {
    key,
    label,
    value: (row) => formatNumber(pick(row), 0),
    number: pick,
    align: 'right',
  };
}

/**
 * What kind of packing material a line is -- LABEL, CAPS, CARTON, TIN, PET.
 *
 * The procedure returns no item group, and the planning workbook never had
 * one either: its Item column is the first word of the item name, because
 * that is how every PM item is named. Read the same way here, so the funnel
 * on it offers exactly the groups the workbook's did.
 */
function itemType(row: Row) {
  return row.item_name.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
}

// The planning workbook's columns first, in its order; what the app adds
// after them.
const COLUMNS: SheetColumn[] = [
  { key: 'item_code', label: 'Item Code', value: (row) => row.item_code },
  { key: 'item_name', label: 'Item Name', value: (row) => row.item_name, wide: true },
  { key: 'item_type', label: 'Item', value: itemType },
  quantity('planned_qty', 'Planned Qty', (row) => row.planned_qty),
  quantity('min_stock', 'Min Stock', (row) => row.min_stock),
  quantity('stock_in_hand', 'Stock In Hand', (row) => row.stock_in_hand),
  quantity('required_qty', 'Required Qty', (row) => row.required_qty),
  quantity('open_po_qty', 'Open PO Qty', (row) => row.open_po_qty),
  quantity('net_shortage_qty', 'Net Shortage', (row) => row.net_shortage_qty),
  {
    key: 'status',
    label: 'Status',
    value: (row) => (isShortage(row) ? 'Shortage' : 'PO Covered'),
  },
  quantity('base_required_qty', 'Base Req.', (row) => row.base_required_qty),
  { key: 'planning_month', label: 'Planning Month', value: (row) => row.planning_month },
  {
    key: 'loaded_at',
    label: 'Loaded',
    value: (row) => formatDateTimeShort(row.loaded_at),
    // The text reads day-first, so it would sort by the day of the month.
    sort: (row) => row.loaded_at,
  },
];

const BY_KEY = new Map(COLUMNS.map((column) => [column.key, column]));

function RequirementBadge({ row }: { row: Row }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        isShortage(row)
          ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
          : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      )}
    >
      {isShortage(row) ? 'Shortage' : 'PO Covered'}
    </Badge>
  );
}

/**
 * The report as a sheet, read the way the Dispatch Sheet is.
 *
 * Every column has a funnel and a sort, so the header row is the filter bar;
 * the margins select rows, columns or everything, with the figures for the
 * pick at the foot; the arrow keys walk the cells and Ctrl+C copies them.
 *
 * The cards above it and the footing line under it add up the rows that
 * survived the filters, not the whole report: a total that ignored the
 * funnels would contradict every line on screen the moment one was ticked.
 */
export function SalesPlanningRequirementTable({
  items,
  isLoading,
  search,
}: SalesPlanningRequirementTableProps) {
  // Only the open drop-down's value list is built.
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const searched = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((row) =>
      COLUMNS.some((column) => column.value(row).toLowerCase().includes(needle)),
    );
  }, [items, search]);

  const specs = useMemo(() => {
    const out: Record<string, ColumnSpec<Row>> = {};
    for (const column of COLUMNS) {
      out[column.key] = {
        value: column.value,
        sortValue: column.sort ?? column.number,
        total: column.number,
      };
    }
    return out;
  }, []);

  // Biggest shortage first, as the report has always opened.
  const {
    rows,
    totals,
    column: columnProps,
    filteredColumns,
    clearFilters,
  } = useLocalColumns(searched, specs, { key: 'net_shortage_qty', direction: 'desc' }, {
    activeColumn: openColumn,
  });

  const selection = useSheetSelection({
    rows,
    columnKeys: COLUMNS.map((column) => column.key),
    numberAt: (row, key) => BY_KEY.get(key)?.number?.(row) ?? null,
    textAt: (row, key) => BY_KEY.get(key)?.value(row) ?? '',
    reset: `${search}|${filteredColumns.join()}`,
  });

  const copySelection = useCallback(() => {
    const grid = selection.selectionGrid();
    if (!grid) return false;
    const picked = grid.columns.map((key) => BY_KEY.get(key));
    void copyBlock({
      rows: grid.cells,
      headers: picked.map((column) => column?.label ?? ''),
      alignRight: picked.map((column) => column?.align === 'right'),
    }).then((done) =>
      done
        ? toast.success(`Copied ${selection.address}`)
        : toast.error('That block could not be copied.'),
    );
    return true;
  }, [selection]);

  const { gridProps } = useSpreadsheetKeys({ copySelection });

  const summary = {
    total_items: rows.length,
    total_required_qty: totals.required_qty ?? 0,
    total_open_po_qty: totals.open_po_qty ?? 0,
    total_net_shortage_qty: totals.net_shortage_qty ?? 0,
  };

  return (
    <div className="space-y-4">
      <SalesPlanningRequirementMetaCards summary={isLoading ? undefined : summary} />

      {filteredColumns.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Filtered by{' '}
            {filteredColumns.map((key) => BY_KEY.get(key)?.label ?? key).join(', ')}
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Reading the report…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {filteredColumns.length > 0 || search.trim()
                ? 'No line matches that.'
                : 'No sales planning requirement data found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="max-h-[70vh] overflow-auto">
            {/* `select-none`: dragging picks cells, not the text inside them. */}
            <table {...gridProps} className={`w-full select-none text-sm ${gridProps.className}`}>
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="border-b text-[10px] text-muted-foreground">
                  <th
                    className="w-10 cursor-pointer border-r bg-muted px-1 py-0.5 text-center hover:bg-primary/20"
                    onClick={selection.pickAll}
                    title="Select the whole sheet"
                  >
                    ◤
                  </th>
                  {COLUMNS.map((column, index) => (
                    <th
                      key={column.key}
                      className={`cursor-pointer border-r px-1 py-0.5 text-center font-normal hover:bg-primary/20 ${
                        selection.isColumnPicked(index)
                          ? 'bg-primary/30'
                          : selection.isColumnTouched(index)
                            ? 'bg-primary/10'
                            : ''
                      }`}
                      onClick={(event) => selection.pickColumn(index, event.shiftKey)}
                      title={`Select column ${column.label}`}
                    >
                      {columnLetter(index)}
                    </th>
                  ))}
                </tr>
                <tr className="border-b text-left">
                  <th className="w-10 border-r bg-muted px-1 py-2" />
                  {COLUMNS.map((column) => (
                    <ColumnFilter
                      key={column.key}
                      {...columnProps(column.key, column.label, column.align ?? 'left')}
                      onOpen={() => setOpenColumn(column.key)}
                    />
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b hover:bg-muted/40',
                      isShortage(row) && 'bg-red-50/50 dark:bg-red-500/10',
                    )}
                  >
                    <th
                      scope="row"
                      className={`w-10 cursor-pointer border-r bg-muted/60 px-1 py-1 text-center text-[10px] font-normal text-muted-foreground hover:bg-primary/20 ${
                        selection.isRowPicked(index)
                          ? 'bg-primary/30'
                          : selection.isRowTouched(index)
                            ? 'bg-primary/10'
                            : ''
                      }`}
                      onClick={(event) => selection.pickRow(index, event.shiftKey)}
                      title={`Select row ${index + 1}`}
                    >
                      {index + 1}
                    </th>
                    {COLUMNS.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-3 py-1.5',
                          column.align === 'right' && 'text-right tabular-nums',
                          column.key === 'net_shortage_qty' && 'font-semibold',
                          column.key === 'item_code' && 'font-mono text-xs',
                          column.wide ? 'max-w-[320px] truncate' : 'whitespace-nowrap',
                          selection.cellClass(index, columnIndex),
                        )}
                        title={column.wide ? column.value(row) : undefined}
                        onMouseDown={(event) => {
                          window.getSelection()?.removeAllRanges();
                          selection.startCell(index, columnIndex, event.shiftKey);
                        }}
                        onMouseEnter={() => selection.extendCell(index, columnIndex)}
                      >
                        {column.key === 'status' ? <RequirementBadge row={row} /> : column.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

              {/* The footing line, over what is on screen. */}
              <tfoot className="sticky bottom-0 border-t bg-muted font-medium">
                <tr>
                  <th className="border-r px-1 py-2" />
                  {COLUMNS.map((column, index) => (
                    <td
                      key={column.key}
                      className={cn('px-3 py-2', column.align === 'right' && 'text-right tabular-nums')}
                    >
                      {index === 0
                        ? `${rows.length} ${rows.length === 1 ? 'line' : 'lines'}`
                        : column.number
                          ? formatNumber(totals[column.key] ?? 0, 0)
                          : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Excel's status bar: what is picked, and what it adds up to. */}
          <div className="flex flex-wrap items-center gap-4 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {selection.figures ? (
              <>
                <span className="font-mono text-foreground">{selection.address}</span>
                <span>{selection.describe()}</span>
                <span>Count {selection.figures.cells.toLocaleString('en-IN')}</span>
                <span>Numbers {selection.figures.numbers.toLocaleString('en-IN')}</span>
                <span className="font-medium text-foreground">
                  Sum {formatNumber(selection.figures.sum, 2)}
                </span>
                {selection.figures.average !== null && (
                  <span>Average {formatNumber(selection.figures.average, 2)}</span>
                )}
                <Button variant="ghost" size="sm" className="h-6" onClick={copySelection}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
                <Button variant="ghost" size="sm" className="h-6" onClick={selection.clear}>
                  Clear selection
                </Button>
              </>
            ) : (
              <span>
                Drag across cells to pick a block — or a row number, a column letter or the
                corner for the whole of one. Shift extends it; Ctrl+C copies it; the arrow
                keys walk the sheet.
              </span>
            )}
            <span className="ml-auto">
              {rows.length !== items.length ? `${rows.length} of ${items.length}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
