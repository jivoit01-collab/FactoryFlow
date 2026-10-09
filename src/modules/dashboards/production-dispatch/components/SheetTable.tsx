import { Copy } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  ColumnFilter,
  columnLetter,
  type ColumnSpec,
  copyBlock,
  type SortState,
  useLocalColumns,
  useSheetSelection,
  useSpreadsheetKeys,
} from '@/shared/components/sheetGrid';
import { Button } from '@/shared/components/ui';
import { cn, formatNumber } from '@/shared/utils';

export interface SheetColumn<Row> {
  key: string;
  label: string;
  /** The cell's text: what it filters, searches and copies by. */
  value: (row: Row) => string;
  /** The figure behind a number cell: what it sorts, sums and selects by. */
  number?: (row: Row) => number | null;
  /** Sort by this instead, when the text would sort wrongly (a date). */
  sort?: (row: Row) => string | number | null;
  /**
   * The foot of a number column. Omitted, a number column shows its sum; a
   * ratio or an average must say what it is over the rows, or stay blank.
   */
  footer?: (rows: Row[]) => string;
  /** Places for the column's sum in the foot. */
  decimals?: number;
  /** Draw the cell as something other than its text -- a pill, a link. */
  render?: (row: Row) => ReactNode;
  align?: 'right';
  wide?: boolean;
  mono?: boolean;
  /** Draw the column's figures stronger: the one the sheet is about. */
  strong?: boolean;
}

/**
 * One of the report's tabs as a sheet, read the way the workbook was.
 *
 * Every column has a funnel and a sort, so the header row is the filter bar;
 * the margins select rows, columns or everything, with the figures for the
 * pick at the foot; the arrow keys walk the cells and Ctrl+C copies them. The
 * footing line adds up the rows that survived the filters, not the whole tab:
 * a total that ignored the funnels would contradict every line on screen.
 *
 * DRAWN IN PAGES. A quarter of the Summary is close to two thousand lines of
 * twenty-seven cells, and drawing them all made the sheet take seconds to open
 * and seconds to answer a click. So the first `pageSize` lines are drawn and
 * the rest wait behind "Show more". Filters, sort and the footing line still
 * work on every line, drawn or not; a block picked or copied covers what is
 * drawn.
 */
export function SheetTable<Row>({
  rows: allRows,
  columns,
  rowKey,
  initialSort,
  countNoun,
  emptyText,
  rowClassName,
  pageSize = 200,
}: {
  rows: Row[];
  columns: SheetColumn<Row>[];
  rowKey: (row: Row) => string;
  initialSort: SortState;
  /** What a row is, for the foot: ['SKU', 'SKUs']. */
  countNoun: [string, string];
  emptyText: string;
  rowClassName?: (row: Row) => string | undefined;
  /** Lines drawn at first, and added by each "Show more". */
  pageSize?: number;
}) {
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const byKey = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);

  const specs = useMemo(() => {
    const out: Record<string, ColumnSpec<Row>> = {};
    for (const column of columns) {
      out[column.key] = {
        value: column.value,
        sortValue: column.sort ?? column.number,
        total: column.number,
      };
    }
    return out;
  }, [columns]);

  const {
    rows,
    totals,
    column: columnProps,
    filteredColumns,
    clearFilters,
  } = useLocalColumns(allRows, specs, initialSort, { activeColumn: openColumn });

  // How many lines are drawn. It starts again from one page whenever the lines
  // themselves change -- a new range, a filter -- without an effect: the count
  // is only honoured while the key it was raised under still holds.
  const pageKey = `${allRows.length}|${filteredColumns.join()}`;
  const [drawn, setDrawn] = useState({ key: pageKey, count: pageSize });
  const limit = drawn.key === pageKey ? drawn.count : pageSize;
  const visible = rows.length > limit ? rows.slice(0, limit) : rows;
  const hidden = rows.length - visible.length;

  const selection = useSheetSelection({
    rows: visible,
    columnKeys: columns.map((column) => column.key),
    numberAt: (row, key) => byKey.get(key)?.number?.(row) ?? null,
    textAt: (row, key) => byKey.get(key)?.value(row) ?? '',
    reset: filteredColumns.join(),
  });

  const copySelection = useCallback(() => {
    const grid = selection.selectionGrid();
    if (!grid) return false;
    const picked = grid.columns.map((key) => byKey.get(key));
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
  }, [selection, byKey]);

  const { gridProps } = useSpreadsheetKeys({ copySelection });

  const [one, many] = countNoun;

  return (
    <div className="space-y-2">
      {filteredColumns.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Filtered by {filteredColumns.map((key) => byKey.get(key)?.label ?? key).join(', ')}
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

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
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    className={cn(
                      'cursor-pointer border-r px-1 py-0.5 text-center font-normal hover:bg-primary/20',
                      selection.isColumnPicked(index)
                        ? 'bg-primary/30'
                        : selection.isColumnTouched(index) && 'bg-primary/10',
                    )}
                    onClick={(event) => selection.pickColumn(index, event.shiftKey)}
                    title={`Select column ${column.label}`}
                  >
                    {columnLetter(index)}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-left">
                <th className="w-10 border-r bg-muted px-1 py-2" />
                {columns.map((column) => (
                  <ColumnFilter
                    key={column.key}
                    {...columnProps(column.key, column.label, column.align ?? 'left')}
                    onOpen={() => setOpenColumn(column.key)}
                  />
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="p-10 text-center text-muted-foreground"
                  >
                    {filteredColumns.length > 0 ? 'No line matches that.' : emptyText}
                  </td>
                </tr>
              ) : (
                visible.map((row, index) => (
                  <tr
                    key={rowKey(row)}
                    className={cn('border-b hover:bg-muted/40', rowClassName?.(row))}
                  >
                    <th
                      scope="row"
                      className={cn(
                        'w-10 cursor-pointer border-r bg-muted/60 px-1 py-1 text-center text-[10px] font-normal text-muted-foreground hover:bg-primary/20',
                        selection.isRowPicked(index)
                          ? 'bg-primary/30'
                          : selection.isRowTouched(index) && 'bg-primary/10',
                      )}
                      onClick={(event) => selection.pickRow(index, event.shiftKey)}
                      title={`Select row ${index + 1}`}
                    >
                      {index + 1}
                    </th>
                    {columns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-3 py-1.5',
                          column.align === 'right' && 'text-right tabular-nums',
                          column.mono && 'font-mono text-xs',
                          column.strong && 'font-semibold',
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
                        {column.render ? column.render(row) : column.value(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {hidden > 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="sticky left-0 px-3 py-3 text-sm text-muted-foreground"
                  >
                    Showing {visible.length.toLocaleString('en-IN')} of{' '}
                    {rows.length.toLocaleString('en-IN')} {many} — the total below counts them all.
                    Narrow it with a column filter, or export to Excel for every line.
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3"
                      onClick={() => setDrawn({ key: pageKey, count: limit + pageSize })}
                    >
                      Show {Math.min(pageSize, hidden).toLocaleString('en-IN')} more
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>

            {/* The footing line, over what is on screen. */}
            <tfoot className="sticky bottom-0 border-t bg-muted font-medium">
              <tr>
                <th className="border-r px-1 py-2" />
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      'whitespace-nowrap px-3 py-2',
                      column.align === 'right' && 'text-right tabular-nums',
                    )}
                  >
                    {index === 0
                      ? `${rows.length} ${rows.length === 1 ? one : many}`
                      : column.footer
                        ? column.footer(rows)
                        : column.number
                          ? formatNumber(totals[column.key] ?? 0, column.decimals ?? 0)
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
              Drag across cells to pick a block — or a row number, a column letter or the corner for
              the whole of one. Shift extends it; Ctrl+C copies it.
            </span>
          )}
          <span className="ml-auto">
            {rows.length !== allRows.length ? `${rows.length} of ${allRows.length}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
