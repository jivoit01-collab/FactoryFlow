import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
} from 'lucide-react';
import { Fragment, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { StockItem, StockSortCol } from '../types';
import { StockItemDetailPanel } from './StockItemDetailPanel';

interface StockLevelTableProps {
  items: StockItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  selectedWarehouses?: string[];
  sortCol: StockSortCol;
  sortDir: 'asc' | 'desc';
  onSortChange: (col: StockSortCol, dir: 'asc' | 'desc') => void;
  onSearchSelect?: (term: string) => void;
}

function rowStatusClasses(status: StockItem['stock_status']): string {
  switch (status) {
    case 'critical':
      return 'bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-950/80';
    case 'low':
      return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50';
    case 'unset':
      return 'bg-muted/20 hover:bg-muted/40 dark:bg-muted/10 dark:hover:bg-muted/20';
    default:
      return 'hover:bg-muted/30';
  }
}

function stockDifferenceClasses(difference: number): string {
  if (difference < 0) return 'font-medium text-red-700 dark:text-red-400';
  if (difference > 0) return 'text-green-700 dark:text-green-400';
  return 'text-muted-foreground';
}

function formatStockDifference(difference: number): string {
  const formatted = Math.abs(difference).toLocaleString('en-IN');
  if (difference > 0) return `+${formatted}`;
  if (difference < 0) return `-${formatted}`;
  return formatted;
}

function stockDifference(item: StockItem): number {
  return item.on_hand - item.min_stock;
}

function firstSearchWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? '';
}

function SortIcon({
  col,
  sortCol,
  sortDir,
}: {
  col: StockSortCol;
  sortCol: StockSortCol;
  sortDir: 'asc' | 'desc';
}) {
  if (sortCol !== col)
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  return sortDir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

export function StockLevelTable({
  items,
  isLoading,
  page,
  totalPages,
  totalItems,
  onPageChange,
  selectedWarehouses = [],
  sortCol,
  sortDir,
  onSortChange,
  onSearchSelect,
}: StockLevelTableProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isGrouped = selectedWarehouses.length >= 2;
  const colCount = 10;

  function toggleSort(col: StockSortCol) {
    if (sortCol === col) {
      onSortChange(col, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(col, 'asc');
    }
  }

  function toggleExpandedItem(itemCode: string, canExpand: boolean) {
    if (!canExpand) return;
    setExpandedItem((current) => (current === itemCode ? null : itemCode));
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No matching items found.</p>
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
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('item_code')}
                >
                  Item Code <SortIcon col="item_code" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('item_name')}
                >
                  Item Name <SortIcon col="item_name" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('warehouse')}
                >
                  Warehouse <SortIcon col="warehouse" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('min_stock')}
                >
                  Benchmark <SortIcon col="min_stock" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('on_hand')}
                >
                  On Hand <SortIcon col="on_hand" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Difference
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">UOM</th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('health_ratio')}
                >
                  Health <SortIcon col="health_ratio" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Movement</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const canExpand = isGrouped && (item.warehouse_count ?? 1) > 1;
                const isExpanded = canExpand && expandedItem === item.item_code;
                const difference = stockDifference(item);

                return (
                  <Fragment key={`${item.item_code}-${item.warehouse}`}>
                    <tr
                      className={cn(
                        'border-b transition-colors',
                        rowStatusClasses(item.stock_status),
                        canExpand && 'cursor-pointer',
                      )}
                      onClick={() => toggleExpandedItem(item.item_code, canExpand)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleExpandedItem(item.item_code, canExpand);
                        }
                      }}
                      tabIndex={canExpand ? 0 : undefined}
                      aria-expanded={canExpand ? isExpanded : undefined}
                    >
                      <td
                        className="cursor-pointer px-4 py-3 font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSearchSelect?.(item.item_code);
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
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
                        onClick={(event) => {
                          event.stopPropagation();
                          onSearchSelect?.(firstSearchWord(item.item_name));
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSearchSelect?.(firstSearchWord(item.item_name));
                          }
                        }}
                      >
                        {item.item_name}
                      </td>
                      <td className="px-4 py-3">{item.warehouse}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.min_stock.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.on_hand.toLocaleString('en-IN')}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right tabular-nums',
                          stockDifferenceClasses(difference),
                        )}
                      >
                        {formatStockDifference(difference)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.uom}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {(item.health_ratio * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <StockHealthBadge status={item.stock_status} />
                          {item.has_warning && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StockMovementBadge item={item} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/20">
                        <td colSpan={colCount} className="px-2 py-1">
                          <StockItemDetailPanel
                            itemCode={item.item_code}
                            warehouses={selectedWarehouses}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {totalItems.toLocaleString('en-IN')} items &mdash; page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StockMovementBadge({ item }: { item: StockItem }) {
  const config = {
    recent: {
      label: 'Recently Used',
      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    slow: {
      label: 'Slow Moving',
      classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    },
  } as const;

  const status = item.movement_status ?? 'slow';
  const { label, classes } = config[status];

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs', classes)}
      >
        {label}
      </span>
      {item.days_since_last_consumption !== null &&
        item.days_since_last_consumption !== undefined && (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {item.days_since_last_consumption}d since use
          </span>
        )}
    </div>
  );
}

function StockHealthBadge({ status }: { status: StockItem['stock_status'] }) {
  if (status === 'none') return null;

  const config = {
    healthy: {
      label: 'Healthy',
      classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    low: {
      label: 'Low',
      classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    critical: {
      label: 'Critical',
      classes: 'bg-red-200 text-red-900 font-semibold dark:bg-red-900/60 dark:text-red-300',
    },
    unset: {
      label: 'No Benchmark Set',
      classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400',
    },
  } as const;

  const { label, classes } = config[status];

  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs', classes)}>
      {label}
    </span>
  );
}
