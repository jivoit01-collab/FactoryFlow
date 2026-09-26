import { Copy } from 'lucide-react';
import { type ComponentProps, type ReactNode, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import type { CashEntry } from '@/modules/accounts/api';
import {
  CASH_SHEET_COLUMNS,
  type CashSheetColumn,
} from '@/modules/accounts/components/cashSheetColumns';
import {
  ColumnFilter,
  columnLetter,
  copyBlock,
  useSheetSelection,
  useSpreadsheetKeys,
} from '@/shared/components/sheetGrid';
import { Button } from '@/shared/components/ui';
import { formatNumber } from '@/shared/utils';

/**
 * The cash book read as a sheet.
 *
 * The same kit the dispatch sheet is built from, composed the same way: the
 * letters across the top, the numbers down the side, a dragged block, and
 * Excel's status bar at the foot saying what is picked and what it comes to.
 *
 * It is a second way of reading the register rather than a replacement for
 * it. The register proper carries the tick boxes; a grid you drag a selection
 * across is no place for them. The row buttons are here, but in a column of
 * their own past the last lettered one: a cell that is both a selection target
 * and a button is neither, so that column is never picked, summed or copied.
 */
export function CashSheetTable({
  rows,
  resetKey,
  column,
  onOpenColumn,
  actions,
}: {
  rows: CashEntry[];
  /**
   * The register's own column helper, so a filter or a sort here is the same
   * act as on the register.
   *
   * It has to be the register's rather than a local one: the book is paged,
   * and a sort worked out in the browser would only shuffle the fifty rows
   * that happened to land on this page.
   */
  column: (
    key: string,
    label: string,
    align?: 'left' | 'right',
  ) => Omit<ComponentProps<typeof ColumnFilter>, 'onOpen'>;
  /** Told which drop-down opened, so only that column's values are fetched. */
  onOpenColumn: (key: string) => void;
  /**
   * Changes whenever the rows are a different set of lines — a new page, a
   * filter, a sort. "Rows 3 to 10" means nothing afterwards, so the selection
   * goes with it.
   */
  resetKey: string;
  /** The register's own Actions cell for a row; absent, the column is not drawn. */
  actions?: (row: CashEntry) => ReactNode;
}) {
  const byKey = useMemo(() => {
    const map = new Map<string, CashSheetColumn>();
    for (const column of CASH_SHEET_COLUMNS) map.set(column.key, column);
    return map;
  }, []);

  const selection = useSheetSelection({
    rows,
    columnKeys: CASH_SHEET_COLUMNS.map((column) => column.key),
    numberAt: (row, key) => byKey.get(key)?.number?.(row) ?? null,
    textAt: (row, key) => byKey.get(key)?.value(row) ?? '',
    reset: resetKey,
  });

  /**
   * Copy the picked block the way Excel copies one: on the clipboard in every
   * form at once, so a spreadsheet pastes cells, a chat window pastes a
   * readable picture, and a plain text box pastes the text.
   */
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

  // Nothing picked falls back to the cell under the cursor.
  const { gridProps } = useSpreadsheetKeys({ copySelection });

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table {...gridProps} className={`w-full select-none text-sm ${gridProps.className}`}>
          <thead className="sticky top-0 z-10 bg-muted">
            {/* The letters across the top of a sheet. Clicking one picks the
                column; the corner picks everything. */}
            <tr className="border-b text-[10px] text-muted-foreground">
              <th
                className="w-10 cursor-pointer border-r bg-muted px-1 py-0.5 text-center hover:bg-primary/20"
                onClick={selection.pickAll}
                title="Select the whole sheet"
              >
                ◤
              </th>
              {CASH_SHEET_COLUMNS.map((column, index) => (
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
              {/* No letter: this column is not part of the sheet. */}
              {actions && <th className="px-1 py-0.5" />}
            </tr>
            {/* The headings, each with its own sort and filter -- the same
                ones the register uses, because they are the register's. */}
            <tr className="border-b text-left">
              <th className="w-10 border-r bg-muted px-1 py-2" />
              {CASH_SHEET_COLUMNS.map((sheetColumn) => {
                const key = sheetColumn.filterKey ?? sheetColumn.key;
                return (
                  <ColumnFilter
                    key={sheetColumn.key}
                    {...column(key, sheetColumn.label, sheetColumn.align ?? 'left')}
                    onOpen={() => onOpenColumn(key)}
                  />
                );
              })}
              {actions && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b hover:bg-muted/40 ${
                  row.is_active ? '' : 'text-muted-foreground line-through'
                }`}
              >
                {/* The numbers down the left. Clicking one picks the row. */}
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
                {CASH_SHEET_COLUMNS.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={`px-3 py-1.5 ${
                      column.align === 'right' ? 'text-right tabular-nums' : ''
                    } ${column.wide ? 'max-w-[280px] truncate' : 'whitespace-nowrap'} ${selection.cellClass(
                      index,
                      columnIndex,
                    )}`}
                    title={column.wide ? column.value(row) : undefined}
                    onMouseDown={(event) => {
                      // Anything the browser had highlighted elsewhere is let
                      // go, so there is one selection on screen and it is this.
                      window.getSelection()?.removeAllRanges();
                      selection.startCell(index, columnIndex, event.shiftKey);
                    }}
                    onMouseEnter={() => selection.extendCell(index, columnIndex)}
                  >
                    {column.value(row)}
                  </td>
                ))}
                {actions && <td className="whitespace-nowrap px-3 py-0.5">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
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
              Sum {formatNumber(selection.figures.sum)}
            </span>
            {selection.figures.average !== null && (
              <span>Average {formatNumber(selection.figures.average)}</span>
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
            the whole of one. Shift extends it; Ctrl+C copies it as cells for Excel and as a picture
            for chat; the arrow keys walk the sheet.
          </span>
        )}
        <span className="ml-auto">
          {rows.length} {rows.length === 1 ? 'line' : 'lines'} on this page
        </span>
      </div>
    </div>
  );
}
