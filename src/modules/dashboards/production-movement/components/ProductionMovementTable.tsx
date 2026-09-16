import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { WMSTransferLine } from '@/modules/warehouse/types';
import { Badge } from '@/shared/components/ui';

interface ProductionMovementTableProps {
  direction?: 'all' | 'in' | 'out';
  isLoading?: boolean;
  onSearchSelect?: (term: string) => void;
  search?: string;
  transferLines: WMSTransferLine[];
}

interface TransferMovementEntry {
  key: string;
  date: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  counterpartyWarehouse: string;
  counterpartyLabel: 'From' | 'To';
  direction: 'IN' | 'OUT';
  quantity: number;
  docNum: number;
  comments: string;
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

type SortColumn =
  | 'date'
  | 'itemCode'
  | 'itemName'
  | 'warehouse'
  | 'counterpartyWarehouse'
  | 'direction'
  | 'quantity'
  | 'docNum';

interface SortState {
  col: SortColumn;
  dir: 'asc' | 'desc';
}

function formatDate(value: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeSearch(value?: string): string {
  return value?.trim().toUpperCase() ?? '';
}

function firstSearchWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value;
}

function sortValue(item: TransferMovementEntry, col: SortColumn): string | number {
  switch (col) {
    case 'date': {
      const time = new Date(item.date).getTime();
      return Number.isNaN(time) ? item.date : time;
    }
    case 'quantity':
    case 'docNum':
      return item[col] ?? 0;
    case 'itemCode':
    case 'itemName':
    case 'warehouse':
    case 'counterpartyWarehouse':
    case 'direction':
      return String(item[col] ?? '').toUpperCase();
    default:
      return '';
  }
}

function matchesSearch(item: TransferMovementEntry, search: string): boolean {
  if (!search) return true;
  return [
    item.itemCode,
    item.itemName,
    item.warehouse,
    item.counterpartyWarehouse,
    String(item.docNum),
    item.comments,
  ].some((value) => value.toUpperCase().includes(search));
}

function SortIcon({ col, sort }: { col: SortColumn; sort: SortState }) {
  if (sort.col !== col) {
    return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }
  return sort.dir === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
}

function HeaderSortButton({
  col,
  label,
  sort,
  align = 'left',
  onSort,
}: {
  col: SortColumn;
  label: string;
  sort: SortState;
  align?: 'left' | 'right';
  onSort: (col: SortColumn) => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-1 hover:text-foreground ${
        align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
      }`}
      onClick={() => onSort(col)}
    >
      <span>{label}</span>
      <SortIcon col={col} sort={sort} />
    </button>
  );
}

function buildTransferEntries(lines: WMSTransferLine[]): TransferMovementEntry[] {
  return lines.flatMap((line) => {
    const base = {
      comments: line.comments ?? '',
      date: line.doc_date,
      docNum: line.doc_num,
      itemCode: line.item_code,
      itemName: line.item_name,
      quantity: line.quantity,
    };

    return [
      {
        ...base,
        key: `${line.doc_entry}-${line.line_num}-out`,
        counterpartyLabel: 'To' as const,
        counterpartyWarehouse: line.to_warehouse,
        direction: 'OUT' as const,
        warehouse: line.from_warehouse,
      },
      {
        ...base,
        key: `${line.doc_entry}-${line.line_num}-in`,
        counterpartyLabel: 'From' as const,
        counterpartyWarehouse: line.from_warehouse,
        direction: 'IN' as const,
        warehouse: line.to_warehouse,
      },
    ];
  });
}

export function ProductionMovementTable({
  direction = 'all',
  isLoading,
  onSearchSelect,
  search,
  transferLines,
}: ProductionMovementTableProps) {
  const [sort, setSort] = useState<SortState>({ col: 'date', dir: 'desc' });

  const sortedItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);
    const normalizedDirection = direction.toUpperCase();

    return buildTransferEntries(transferLines)
      .filter((item) => direction === 'all' || item.direction === normalizedDirection)
      .filter((item) => matchesSearch(item, normalizedSearch))
      .sort((a, b) => {
        const aVal = sortValue(a, sort.col);
        const bVal = sortValue(b, sort.col);
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.dir === 'asc' ? cmp : -cmp;
      });
  }, [direction, search, sort, transferLines]);

  function toggleSort(col: SortColumn) {
    setSort((current) =>
      current.col === col
        ? { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="font-semibold">Movement Entries</h3>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton col="date" label="Date" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="itemCode"
                  label="Item Code"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="itemName"
                  label="Item Name"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="warehouse"
                  label="Warehouse"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="direction"
                  label="Direction"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="counterpartyWarehouse"
                  label="From / To"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton
                  col="quantity"
                  label="Quantity"
                  sort={sort}
                  align="right"
                  onSort={toggleSort}
                />
              </th>
              <th className="px-5 py-3 font-medium">
                <HeaderSortButton col="docNum" label="Reference" sort={sort} onSort={toggleSort} />
              </th>
              <th className="px-5 py-3 text-left font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  No transfer movement entries found.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => (
                <tr key={item.key} className="border-t">
                  <td className="whitespace-nowrap px-5 py-3">{formatDate(item.date)}</td>
                  <td
                    className="cursor-pointer whitespace-nowrap px-5 py-3 font-mono text-xs text-primary hover:bg-muted/40"
                    onClick={() => onSearchSelect?.(item.itemCode)}
                  >
                    {item.itemCode}
                  </td>
                  <td
                    className="min-w-64 cursor-pointer px-5 py-3 font-medium hover:bg-muted/40"
                    onClick={() => onSearchSelect?.(firstSearchWord(item.itemName))}
                  >
                    {item.itemName}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-medium">{item.warehouse}</td>
                  <td className="px-5 py-3">
                    <Badge
                      variant="outline"
                      className={
                        item.direction === 'IN'
                          ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }
                    >
                      {item.direction === 'IN' ? (
                        <ArrowDownToLine className="mr-1 h-3 w-3" />
                      ) : (
                        <ArrowUpFromLine className="mr-1 h-3 w-3" />
                      )}
                      {item.direction}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span className="text-xs text-muted-foreground">{item.counterpartyLabel}</span>{' '}
                    <span className="font-medium">{item.counterpartyWarehouse}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    {numberFormatter.format(item.quantity)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div>Doc {item.docNum}</div>
                    <div className="text-xs text-muted-foreground">{item.comments}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <Badge variant="outline" className="bg-background">
                      Transfer
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
