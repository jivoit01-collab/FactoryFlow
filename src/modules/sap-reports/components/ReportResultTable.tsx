import { ArrowDown, ArrowUp, Copy, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge, Button, Checkbox, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, formatNumber } from '@/shared/utils';

import type { SapReportCell, SapReportColumn } from '../api';
import { buildClipboardText, copyToClipboard } from '../utils/clipboard';

const PAGE_SIZE = 100;

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
  const [sort, setSort] = useState<{ index: number; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);
  // The selection is held against the rows it was made on, so a fresh run —
  // which hands down a new array — drops last run's ticks without an effect.
  const [selection, setSelection] = useState<Selection>(() => emptySelection(rows));
  const { ids: selected, anchor } = selection.rows === rows ? selection : emptySelection(rows);
  // Shift-click picks a block. The checkbox reports only its new state, so the
  // modifier is caught on the way down and read back on the change.
  const shiftHeld = useRef(false);

  const indexed = useMemo<IndexedRow[]>(() => rows.map((row, index) => ({ row, index })), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return indexed;
    const needle = search.trim().toLowerCase();
    return indexed.filter(({ row }) =>
      row.some((cell) => cell !== null && String(cell).toLowerCase().includes(needle)),
    );
  }, [indexed, search]);

  const docNumIndex = useMemo(
    () => columns.findIndex((column) => column.key.toLowerCase() === 'docnum'),
    [columns],
  );

  const uniqueDocNums = useMemo(() => {
    if (docNumIndex === -1) return null;
    const values = new Set<string>();
    for (const { row } of filtered) {
      const cell = row[docNumIndex];
      if (cell !== null && cell !== undefined && cell !== '') values.add(String(cell));
    }
    return values.size;
  }, [filtered, docNumIndex]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const isNumeric = columns[sort.index]?.type === 'number';
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((left, right) =>
      factor * compareCells(left.row[sort.index], right.row[sort.index], isNumeric),
    );
  }, [filtered, sort, columns]);

  // A filter or a new sort can leave the viewer on a page that no longer exists.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const allShownSelected = sorted.length > 0 && sorted.every(({ index }) => selected.has(index));

  function toggleSort(index: number) {
    setPage(0);
    setSort((current) => {
      if (current?.index !== index) return { index, direction: 'asc' };
      return current.direction === 'asc' ? { index, direction: 'desc' } : null;
    });
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

    const copied = await copyToClipboard(
      buildClipboardText(
        chosen.map(({ row }) => row),
        columns,
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
            <tr>
              <th className="w-9 px-3 py-2">
                <Checkbox
                  checked={allShownSelected}
                  onCheckedChange={toggleAllShown}
                  aria-label="Select every row shown"
                />
              </th>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-2 font-medium',
                    column.type === 'number' ? 'text-right' : 'text-left',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(index)}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {column.label}
                    {sort?.index === index &&
                      (sort.direction === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </th>
              ))}
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
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={cn(
                        'whitespace-nowrap px-3 py-1.5',
                        column.type === 'number' && 'text-right tabular-nums',
                      )}
                    >
                      {renderCell(row[index], column)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
  if (cell === null || cell === undefined || cell === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (column.type === 'number' && typeof cell === 'number') {
    // Whole numbers are counts and document numbers; decimals are money or
    // quantities. Showing "626080206.00" for an invoice number reads as a bug.
    return Number.isInteger(cell) ? cell.toLocaleString() : formatNumber(cell);
  }
  return String(cell);
}

function compareCells(left: SapReportCell, right: SapReportCell, isNumeric: boolean): number {
  const leftEmpty = left === null || left === undefined || left === '';
  const rightEmpty = right === null || right === undefined || right === '';
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;

  if (isNumeric) {
    return Number(left) - Number(right);
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true });
}
