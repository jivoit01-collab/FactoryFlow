import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge, Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, formatNumber } from '@/shared/utils';

import type { SapReportCell, SapReportColumn } from '../api';

const PAGE_SIZE = 100;

interface Props {
  columns: SapReportColumn[];
  rows: SapReportCell[][];
  wasTruncated: boolean;
  rowLimit: number;
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

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.trim().toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => cell !== null && String(cell).toLowerCase().includes(needle)),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const isNumeric = columns[sort.index]?.type === 'number';
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((left, right) =>
      factor * compareCells(left[sort.index], right[sort.index], isNumeric),
    );
  }, [filtered, sort, columns]);

  // A filter or a new sort can leave the viewer on a page that no longer exists.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(index: number) {
    setPage(0);
    setSort((current) => {
      if (current?.index !== index) return { index, direction: 'asc' };
      return current.direction === 'asc' ? { index, direction: 'desc' } : null;
    });
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
          {wasTruncated && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Cut off at {rowLimit.toLocaleString()} rows — narrow the filters
            </Badge>
          )}
        </div>
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

      <div className="max-h-[65vh] overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
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
            {visible.map((row, rowIndex) => (
              <tr key={currentPage * PAGE_SIZE + rowIndex} className="border-t hover:bg-muted/40">
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
            ))}
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
