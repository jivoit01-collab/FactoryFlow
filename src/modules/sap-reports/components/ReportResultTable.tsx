import { Copy, Download, Search } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { Badge, Button, Checkbox, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, formatNumber, toClipboardCell } from '@/shared/utils';

import type { SapReportCell, SapReportColumn, SapReportReferenceMatch } from '../api';
import { useSapReportReferences } from '../api';
import { cellNumber, cellText } from '../utils/cells';
import { buildClipboardText, copyToClipboard } from '../utils/clipboard';
import { downloadReportRows } from '../utils/download';
import { findReferenceColumn } from '../utils/references';
import { sumNumericColumns } from '../utils/totals';
import { ReferenceRecordDialog } from './ReferenceRecordDialog';
import { ReportTotalsRow } from './ReportTotalsRow';

const PAGE_SIZE = 100;

/**
 * The sort key standing for "however SAP handed the rows over".
 *
 * The kit's sort always points at some column; a report's own ORDER BY is an
 * answer in itself — a ledger comes back in date order because it was asked
 * for that way — so this key sorts by the row's place in the result and gives
 * the third click on a heading somewhere to go back to.
 */
const SAP_ORDER = '__sap_order';

interface Props {
  columns: SapReportColumn[];
  rows: SapReportCell[][];
  wasTruncated: boolean;
  rowLimit: number;
  /** The report's name, for the file the Download button hands over. */
  title?: string;
}

/** A row kept beside its place in the original result, which is what selection is keyed on. */
interface IndexedRow {
  row: SapReportCell[];
  index: number;
}

/** Ticked rows, the result they belong to, and where a shift-click measures from. */
interface Selection {
  rows: SapReportCell[][];
  ids: ReadonlySet<number>;
  anchor: number | null;
}

function emptySelection(rows: SapReportCell[][]): Selection {
  return { rows, ids: new Set(), anchor: null };
}

/**
 * The result grid for a report whose columns are only known once it has run.
 *
 * Filtering, sorting and paging are all client-side and deliberate: the rows are
 * already here, and re-running the query on the shared SAP box just to sort a
 * column would be far more expensive than sorting in the browser.
 */
export function ReportResultTable({ columns, rows, wasTruncated, rowLimit, title }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 250);
  const [page, setPage] = useState(0);
  // Which column's filter is open, so only that column's value list is counted.
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  // The selection is held against the rows it was made on, so a fresh run —
  // which hands down a new array — drops last run's ticks without an effect.
  const [selection, setSelection] = useState<Selection>(() => emptySelection(rows));
  const { ids: selected, anchor } = selection.rows === rows ? selection : emptySelection(rows);
  // Shift-click picks a block. The checkbox reports only its new state, so the
  // modifier is caught on the way down and read back on the change.
  const shiftHeld = useRef(false);
  // The report row whose app record is open over the grid.
  const [openReference, setOpenReference] = useState<string | null>(null);

  const indexed = useMemo<IndexedRow[]>(() => rows.map((row, index) => ({ row, index })), [rows]);

  const searched = useMemo(() => {
    if (!search.trim()) return indexed;
    const needle = search.trim().toLowerCase();
    return indexed.filter(({ row }) =>
      row.some((cell) => cell !== null && String(cell).toLowerCase().includes(needle)),
    );
  }, [indexed, search]);

  // One spec per column, built from the result itself — a report's columns are
  // only known once it has run, so they cannot be written out by hand the way
  // the cash book's and the dispatch sheet's are.
  const specs = useMemo(() => {
    const out: Record<string, ColumnSpec<IndexedRow>> = {
      [SAP_ORDER]: {
        value: ({ index }) => String(index),
        sortValue: ({ index }) => index,
      },
    };
    columns.forEach((column, index) => {
      out[column.key] = {
        value: ({ row }) => cellText(row[index], column),
        // Sorted as a number, not as the text of one: "1,234.50" beside "90"
        // sorts the way a dictionary would, which is not a sort of amounts.
        sortValue:
          column.type === 'number' ? ({ row }: IndexedRow) => cellNumber(row[index]) : undefined,
      };
    });
    return out;
  }, [columns]);

  const {
    rows: sorted,
    column: columnProps,
    filteredColumns,
    clearFilters,
    sort,
    setSort,
  } = useLocalColumns(
    searched,
    specs,
    { key: SAP_ORDER, direction: 'asc' },
    {
      activeColumn: openColumn,
    },
  );

  // Where each column sits in a row, by key — the sheet selection speaks in
  // column keys, and a report's cells are positional.
  const columnKeys = useMemo(() => columns.map((column) => column.key), [columns]);
  const columnIndex = useMemo(
    () => new Map(columns.map((column, index) => [column.key, index])),
    [columns],
  );

  // A new run, a new search or a different set of filtered columns is a
  // different set of lines, so "rows 3 to 10" no longer means anything and the
  // picked block goes. Paging does not move it: its rows are positions in the
  // whole sorted result, the numbers down the margin, not on one page.
  const filterKey = filteredColumns.join('\u0000');
  const sheetReset = useMemo(() => ({ rows, search, filterKey }), [rows, search, filterKey]);

  /**
   * Cells picked the way a sheet picks them — a dragged block, a row number,
   * a column letter or the corner — with Excel's status-bar figures for it.
   *
   * This is not the tick column. A tick says which rows the totals, Copy and
   * Download work on, and can be any rows at all; a picked block is one
   * rectangle, there to be read off at the foot and copied as cells.
   */
  const sheet = useSheetSelection({
    rows: sorted,
    columnKeys,
    numberAt: ({ row }, key) => {
      const index = columnIndex.get(key);
      return index === undefined || columns[index].type !== 'number'
        ? null
        : cellNumber(row[index]);
    },
    // The raw value, not the grouped spelling on screen: "1,23,456.00" pastes
    // into a sheet as text rather than a number, as the Copy button knows.
    textAt: ({ row }, key) => {
      const index = columnIndex.get(key);
      return index === undefined ? '' : toClipboardCell(row[index]);
    },
    reset: sheetReset,
  });

  /**
   * Copy the picked block the way Excel copies one: on the clipboard in every
   * form at once, so a spreadsheet pastes cells, a chat window pastes a
   * readable picture of the table, and a plain text box pastes the text.
   */
  const copyPicked = useCallback(() => {
    const grid = sheet.selectionGrid();
    if (!grid) return false;
    const picked = grid.columns.map((key) => columns[columnIndex.get(key) ?? -1]);
    void copyBlock({
      rows: grid.cells,
      headers: picked.map((column) => column?.label ?? ''),
      alignRight: picked.map((column) => column?.type === 'number'),
    }).then((done) =>
      done
        ? toast.success(`Copied ${sheet.address}`)
        : toast.error('That block could not be copied.'),
    );
    return true;
  }, [sheet, columns, columnIndex]);

  // Nothing picked falls back to the cell under the cursor.
  const { gridProps } = useSpreadsheetKeys({ copySelection: copyPicked });

  const docNumIndex = useMemo(
    () => columns.findIndex((column) => column.key.toLowerCase() === 'docnum'),
    [columns],
  );

  const uniqueDocNums = useMemo(() => {
    if (docNumIndex === -1) return null;
    const values = new Set<string>();
    for (const { row } of sorted) {
      const cell = row[docNumIndex];
      if (cell !== null && cell !== undefined && cell !== '') values.add(String(cell));
    }
    return values.size;
  }, [sorted, docNumIndex]);

  // A filter or a new sort can leave the viewer on a page that no longer exists.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  // Totals cover the ticked rows if there are any, and otherwise whatever the
  // search and the column filters left — the same "what I am looking at" the
  // copy button works on.
  const totalledRows = useMemo(
    () =>
      (selected.size ? sorted.filter(({ index }) => selected.has(index)) : sorted).map(
        ({ row }) => row,
      ),
    [sorted, selected],
  );
  const totals = useMemo(() => sumNumericColumns(columns, totalledRows), [columns, totalledRows]);

  const referenceIndex = useMemo(() => findReferenceColumn(columns), [columns]);

  // Only what is on screen: a truncated report can be thousands of rows, and
  // the viewer can only click the hundred in front of them. Sorted so paging
  // back to a page already seen hits the cache instead of re-asking.
  const visibleReferences = useMemo(() => {
    if (referenceIndex === -1) return [];
    const values = new Set<string>();
    for (const { row } of visible) {
      const cell = row[referenceIndex];
      if (cell !== null && cell !== undefined && cell !== '') values.add(String(cell));
    }
    return [...values].sort();
  }, [visible, referenceIndex]);

  // A failure here leaves every row unlinked, which is exactly how the grid
  // behaved before — the report itself is unaffected.
  const { data: referenceMatches } = useSapReportReferences(visibleReferences);

  const openMatches: SapReportReferenceMatch[] =
    (openReference && referenceMatches?.[openReference]) || [];

  const allShownSelected = sorted.length > 0 && sorted.every(({ index }) => selected.has(index));

  /**
   * Up, down, and back to SAP's own order — the third click on a heading undoes
   * the sort rather than starting the cycle again.
   */
  function handleSort(columnKey: string, next: { key: string; direction: 'asc' | 'desc' }) {
    if (sort.key === columnKey && sort.direction === 'desc') {
      setSort({ key: SAP_ORDER, direction: 'asc' });
      return;
    }
    setSort(next);
  }

  /** Tick or untick one row — or, on a shift-click, everything back to the last one. */
  function toggleRow(positionInSorted: number, checked: boolean) {
    const from = shiftHeld.current ? (anchor ?? positionInSorted) : positionInSorted;
    shiftHeld.current = false;

    const start = Math.min(from, positionInSorted);
    const end = Math.max(from, positionInSorted);
    const next = new Set(selected);
    for (let position = start; position <= end; position += 1) {
      const entry = sorted[position];
      if (!entry) continue;
      if (checked) next.add(entry.index);
      else next.delete(entry.index);
    }
    setSelection({ rows, ids: next, anchor: positionInSorted });
  }

  /** The header tick covers what the search is showing, not the whole result. */
  function toggleAllShown(checked: boolean) {
    const next = new Set(selected);
    for (const { index } of sorted) {
      if (checked) next.add(index);
      else next.delete(index);
    }
    setSelection({ rows, ids: next, anchor: null });
  }

  /** An Excel file of the same rows the totals cover: ticked, or else everything shown. */
  function handleDownload() {
    if (!totalledRows.length) return;
    downloadReportRows({ columns, rows: totalledRows, title: title ?? 'SAP report' });
  }

  async function handleCopy() {
    // Nothing ticked means "what I am looking at" — the rows the search left,
    // in the order the sort put them.
    const chosen = selected.size ? sorted.filter(({ index }) => selected.has(index)) : sorted;
    if (!chosen.length) return;

    // The column headings lead, so the pasted block names its own columns
    // instead of arriving as a bare grid the user has to label by hand.
    const copied = await copyToClipboard(
      buildClipboardText(
        chosen.map(({ row }) => row),
        columns,
        { includeHeaders: true },
      ),
    );
    if (!copied) {
      toast.error(
        'The browser would not let us reach the clipboard. Use the Excel export instead.',
      );
      return;
    }
    toast.success(
      `${chosen.length.toLocaleString()} ${chosen.length === 1 ? 'row' : 'rows'} copied — paste into your sheet.`,
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        SAP returned no rows for these filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {sorted.length === rows.length
              ? `${rows.length.toLocaleString()} rows`
              : `${sorted.length.toLocaleString()} of ${rows.length.toLocaleString()} rows`}
          </span>
          {uniqueDocNums !== null && <span>· {uniqueDocNums.toLocaleString()} unique DocNums</span>}
          {selected.size > 0 && <span>· {selected.size.toLocaleString()} selected</span>}
          {filteredColumns.length > 0 && (
            <span>
              · Filtered by{' '}
              {filteredColumns
                .map((key) => columns[columnIndex.get(key) ?? -1]?.label ?? key)
                .join(', ')}
            </span>
          )}
          {filteredColumns.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => {
                setPage(0);
                clearFilters();
              }}
            >
              Clear {filteredColumns.length === 1 ? 'filter' : `${filteredColumns.length} filters`}
            </Button>
          )}
          {wasTruncated && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Cut off at {rowLimit.toLocaleString()} rows — narrow the filters
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!sorted.length}
            title="Copies the rows only, tab-separated, ready to paste into a sheet"
          >
            <Copy className="mr-1.5 h-4 w-4" />
            {selected.size
              ? `Copy ${selected.size.toLocaleString()} selected`
              : `Copy ${sorted.length.toLocaleString()} rows`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!sorted.length}
            title="An Excel file of the rows on screen, searched, filtered and sorted as they are. The Excel button above runs the report on SAP again for the whole result."
          >
            <Download className="mr-1.5 h-4 w-4" />
            {selected.size ? `Download ${selected.size.toLocaleString()} selected` : 'Download'}
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search these rows…"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(0);
              }}
              className="w-[240px] pl-8"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="max-h-[65vh] overflow-auto">
          {/* `select-none` always, not only mid-drag: dragging picks cells, as
              it does in a sheet, and the browser's own text highlight would
              fight it. Nothing is lost — copying is what Copy and Ctrl+C are
              for. */}
          <table {...gridProps} className={cn('w-full select-none text-sm', gridProps.className)}>
            <thead className="sticky top-0 z-10 bg-muted">
              <ReportTotalsRow
                columns={columns}
                totals={totals}
                rowCount={totalledRows.length}
                isSelection={selected.size > 0}
                isFiltered={totalledRows.length < rows.length}
              />
              {/* The letters across the top of a sheet. Clicking one picks the
                  column, the whole of it and not only this page; the corner
                  picks everything. A row of their own, so clicking a heading
                  still sorts it. */}
              <tr className="border-b text-[10px] text-muted-foreground">
                <th
                  className="w-10 cursor-pointer border-r bg-muted px-1 py-0.5 text-center hover:bg-primary/20"
                  onClick={sheet.pickAll}
                  title="Select the whole sheet"
                >
                  ◤
                </th>
                <th className="w-9 border-r" />
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    className={cn(
                      'cursor-pointer border-r px-1 py-0.5 text-center font-normal hover:bg-primary/20',
                      sheet.isColumnPicked(index)
                        ? 'bg-primary/30'
                        : sheet.isColumnTouched(index) && 'bg-primary/10',
                    )}
                    onClick={(event) => sheet.pickColumn(index, event.shiftKey)}
                    title={`Select column ${column.label}`}
                  >
                    {columnLetter(index)}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="w-10 border-r bg-muted" />
                <th className="w-9 px-3 py-2">
                  <Checkbox
                    checked={allShownSelected}
                    onCheckedChange={toggleAllShown}
                    aria-label="Select every row shown"
                  />
                </th>
                {columns.map((column) => {
                  const props = columnProps(
                    column.key,
                    column.label,
                    column.type === 'number' ? 'right' : 'left',
                  );
                  // Sorting or filtering makes page 7 a different seven hundred
                  // rows, so the reader goes back to the first page rather than
                  // into the middle of a result they have not seen yet.
                  return (
                    <ColumnFilter
                      key={column.key}
                      {...props}
                      onSort={(next) => {
                        setPage(0);
                        handleSort(column.key, next);
                      }}
                      onSelect={(picked) => {
                        setPage(0);
                        props.onSelect(picked);
                      }}
                      onOpen={() => setOpenColumn(column.key)}
                    />
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map(({ row, index: rowIndex }, offset) => {
                const positionInSorted = currentPage * PAGE_SIZE + offset;
                const isSelected = selected.has(rowIndex);
                return (
                  <tr
                    key={rowIndex}
                    className={cn('border-t hover:bg-muted/40', isSelected && 'bg-primary/5')}
                  >
                    {/* The numbers down the left, counted through the whole
                        sorted result so page 2 starts at 101. Clicking one
                        picks the row. */}
                    <th
                      scope="row"
                      className={cn(
                        'w-10 cursor-pointer border-r bg-muted/60 px-1 py-1 text-center text-[10px] font-normal text-muted-foreground hover:bg-primary/20',
                        sheet.isRowPicked(positionInSorted)
                          ? 'bg-primary/30'
                          : sheet.isRowTouched(positionInSorted) && 'bg-primary/10',
                      )}
                      onClick={(event) => sheet.pickRow(positionInSorted, event.shiftKey)}
                      title={`Pick row ${positionInSorted + 1}`}
                    >
                      {positionInSorted + 1}
                    </th>
                    <td
                      className="px-3 py-1.5 align-middle"
                      onMouseDown={(event) => {
                        shiftHeld.current = event.shiftKey;
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleRow(positionInSorted, checked)}
                        aria-label={`Select row ${positionInSorted + 1}`}
                      />
                    </td>
                    {columns.map((column, index) => {
                      const cell = row[index];
                      // A reference this app knows a record for becomes the way
                      // into it. Everything else stays plain text — most document
                      // numbers in SAP predate this app and match nothing.
                      const matches =
                        index === referenceIndex && cell !== null && cell !== undefined && cell !== ''
                          ? referenceMatches?.[String(cell)]
                          : undefined;
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            'whitespace-nowrap px-3 py-1.5',
                            column.type === 'number' && 'text-right tabular-nums',
                            sheet.cellClass(positionInSorted, index),
                          )}
                          onMouseDown={(event) => {
                            // Whatever the browser had highlighted elsewhere on
                            // the page is let go, so there is one selection on
                            // screen and it is this one.
                            window.getSelection()?.removeAllRanges();
                            sheet.startCell(positionInSorted, index, event.shiftKey);
                          }}
                          onMouseEnter={() => sheet.extendCell(positionInSorted, index)}
                        >
                          {matches?.length ? (
                            <button
                              type="button"
                              className="text-primary underline underline-offset-2 hover:no-underline"
                              title={matches.map((m) => `${m.entry_no} — ${m.summary}`).join(' · ')}
                              onClick={() => setOpenReference(String(cell))}
                            >
                              {renderCell(cell, column)}
                            </button>
                          ) : (
                            renderCell(cell, column)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Excel's status bar: what is picked, and what it adds up to. */}
        <div className="flex flex-wrap items-center gap-4 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {sheet.figures ? (
            <>
              {/* The address first, as a sheet's name box has it. */}
              <span className="font-mono text-foreground">{sheet.address}</span>
              <span>{sheet.describe()}</span>
              <span>Count {sheet.figures.cells.toLocaleString('en-IN')}</span>
              <span>Numbers {sheet.figures.numbers.toLocaleString('en-IN')}</span>
              <span className="font-medium text-foreground">Sum {figure(sheet.figures.sum)}</span>
              {sheet.figures.average !== null && (
                <span>Average {figure(sheet.figures.average)}</span>
              )}
              <Button variant="ghost" size="sm" className="h-6" onClick={copyPicked}>
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
              <Button variant="ghost" size="sm" className="h-6" onClick={sheet.clear}>
                Clear selection
              </Button>
            </>
          ) : (
            <span>
              Drag across cells to pick a block — or a row number, a column letter or the corner
              for the whole of one. Shift extends it; Ctrl+C copies it as cells for Excel and as a
              picture for chat; the arrow keys walk the sheet.
            </span>
          )}
        </div>
      </div>

      {openReference && openMatches.length > 0 && (
        <ReferenceRecordDialog
          reference={openReference}
          matches={openMatches}
          open
          onOpenChange={(next) => !next && setOpenReference(null)}
        />
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Whole figures stay whole; the rest carry two decimals. Grouped the Indian
 * way throughout, as `formatNumber` is, so one status bar never reads
 * "7,10,934.55" beside "126,594".
 */
function figure(value: number): string {
  // Adding floats drifts — 0.1 + 0.2 is 0.30000000000000004 — and that drift
  // is what decides whether the figure prints as whole.
  const rounded = Math.round(value * 1e6) / 1e6;
  return Number.isInteger(rounded) ? rounded.toLocaleString('en-IN') : formatNumber(rounded);
}

function renderCell(cell: SapReportCell | undefined, column: SapReportColumn) {
  const text = cellText(cell, column);
  if (!text) return <span className="text-muted-foreground">—</span>;
  return text;
}
