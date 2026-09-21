import { Copy, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ColumnFilter, type ColumnSpec, useLocalColumns } from '@/shared/components/sheetGrid';
import { Badge, Button, Checkbox, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import type { SapReportCell, SapReportColumn, SapReportReferenceMatch } from '../api';
import { useSapReportReferences } from '../api';
import { cellNumber, cellText } from '../utils/cells';
import { buildClipboardText, copyToClipboard } from '../utils/clipboard';
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
export function ReportResultTable({ columns, rows, wasTruncated, rowLimit }: Props) {
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

      <div className="max-h-[65vh] overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted">
            <ReportTotalsRow
              columns={columns}
              totals={totals}
              rowCount={totalledRows.length}
              isSelection={selected.size > 0}
              isFiltered={totalledRows.length < rows.length}
            />
            <tr>
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
                        )}
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

function renderCell(cell: SapReportCell | undefined, column: SapReportColumn) {
  const text = cellText(cell, column);
  if (!text) return <span className="text-muted-foreground">—</span>;
  return text;
}
