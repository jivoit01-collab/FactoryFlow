import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatNumber } from '@/shared/utils';

import type {
  SalesPlanningRequirementItem,
  SalesPlanningRequirementMeta,
} from '../types';

interface SalesPlanningRequirementTableProps {
  items: SalesPlanningRequirementItem[];
  meta?: SalesPlanningRequirementMeta;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearchSelect?: (term: string) => void;
}

type SortCol =
  | 'item_code'
  | 'item_name'
  | 'planned_qty'
  | 'base_required_qty'
  | 'required_qty'
  | 'open_po_qty'
  | 'net_shortage_qty';

interface SortState {
  col: SortCol;
  dir: 'asc' | 'desc';
}

function SortIcon({ col, sort }: { col: SortCol; sort: SortState }) {
  if (sort.col !== col) {
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  }
  return sort.dir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function RequirementBadge({ shortage }: { shortage: number }) {
  const isShortage = shortage > 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        isShortage
          ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
          : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      )}
    >
      {isShortage ? 'Shortage' : 'PO Covered'}
    </Badge>
  );
}

function HeaderSortButton({
  col,
  label,
  sort,
  onSort,
  align = 'left',
}: {
  col: SortCol;
  label: string;
  sort: SortState;
  onSort: (col: SortCol) => void;
  align?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
        align === 'right' && 'justify-end',
      )}
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} sort={sort} />
    </button>
  );
}

function firstSearchWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? '';
}

export function SalesPlanningRequirementTable({
  items,
  meta,
  isLoading,
  onPageChange,
  onSearchSelect,
}: SalesPlanningRequirementTableProps) {
  const [sort, setSort] = useState<SortState>({
    col: 'net_shortage_qty',
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aValue = a[sort.col] ?? '';
      const bValue = b[sort.col] ?? '';
      const comparison =
        typeof aValue === 'string'
          ? aValue.localeCompare(String(bValue))
          : Number(aValue) - Number(bValue);
      return sort.dir === 'asc' ? comparison : -comparison;
    });
  }, [items, sort]);

  function toggleSort(col: SortCol) {
    setSort((current) =>
      current.col === col
        ? { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'item_code' || col === 'item_name' ? 'asc' : 'desc' },
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex gap-4 border-b p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No sales planning requirement data found for the selected filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="min-w-32 px-4 py-3 text-left">
                  <HeaderSortButton
                    col="item_code"
                    label="Item Code"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>
                <th className="min-w-72 px-4 py-3 text-left">
                  <HeaderSortButton
                    col="item_name"
                    label="Item Name"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>
                <th className="min-w-40 px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Planning Month
                </th>
                <th className="min-w-28 px-4 py-3 text-right">
                  <HeaderSortButton
                    col="planned_qty"
                    label="Planned"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                </th>
                <th className="min-w-32 px-4 py-3 text-right">
                  <HeaderSortButton
                    col="base_required_qty"
                    label="Base Req."
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                </th>
                <th className="min-w-28 px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  Min Stock
                </th>
                <th className="min-w-32 px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  Stock In Hand
                </th>
                <th className="min-w-32 px-4 py-3 text-right">
                  <HeaderSortButton
                    col="required_qty"
                    label="Required"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                </th>
                <th className="min-w-28 px-4 py-3 text-right">
                  <HeaderSortButton
                    col="open_po_qty"
                    label="Open PO"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                </th>
                <th className="min-w-32 px-4 py-3 text-right">
                  <HeaderSortButton
                    col="net_shortage_qty"
                    label="Net Shortage"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                </th>
                <th className="min-w-28 px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="min-w-36 px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Loaded
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/30',
                    item.net_shortage_qty > 0 && 'bg-red-50/50 dark:bg-red-500/10',
                  )}
                >
                  <td
                    className="cursor-pointer px-4 py-3 font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSearchSelect?.(item.item_code)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSearchSelect?.(item.item_code);
                      }
                    }}
                  >
                    {item.item_code}
                  </td>
                  <td
                    className="cursor-pointer px-4 py-3 font-medium underline-offset-2 hover:text-primary hover:underline"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSearchSelect?.(firstSearchWord(item.item_name))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSearchSelect?.(firstSearchWord(item.item_name));
                      }
                    }}
                  >
                    {item.item_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.planning_month}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.planned_qty, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.base_required_qty, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.min_stock, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.stock_in_hand, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.required_qty, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.open_po_qty, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatNumber(item.net_shortage_qty, 0)}
                  </td>
                  <td className="px-4 py-3">
                    <RequirementBadge shortage={item.net_shortage_qty} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTimeShort(item.loaded_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.total_pages} · {formatNumber(meta.total_items, 0)} rows
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.has_previous}
                onClick={() => onPageChange(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.has_next}
                onClick={() => onPageChange(meta.page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
