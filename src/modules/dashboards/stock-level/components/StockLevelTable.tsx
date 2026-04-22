import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from 'lucide-react';
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
}: StockLevelTableProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isGrouped = selectedWarehouses.length >= 2;
  const colCount = isGrouped ? 9 : 8;

  function toggleSort(col: StockSortCol) {
    if (sortCol === col) {
      onSortChange(col, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(col, 'asc');
    }
  }

  function SortIcon({ col }: { col: StockSortCol }) {
    if (sortCol !== col)
      return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    );
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
                  Item Code <SortIcon col="item_code" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('item_name')}
                >
                  Item Name <SortIcon col="item_name" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('warehouse')}
                >
                  Warehouse <SortIcon col="warehouse" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('on_hand')}
                >
                  On Hand <SortIcon col="on_hand" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('min_stock')}
                >
                  Min Stock <SortIcon col="min_stock" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">UOM</th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('health_ratio')}
                >
                  Health <SortIcon col="health_ratio" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                {isGrouped && <th className="w-10 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const canExpand = isGrouped && (item.warehouse_count ?? 1) > 1;
                const isExpanded = canExpand && expandedItem === item.item_code;

                return (
                  <Fragment key={`${item.item_code}-${item.warehouse}`}>
                    <tr className={cn('border-b transition-colors', rowStatusClasses(item.stock_status))}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.item_code}
                      </td>
                      <td className="px-4 py-3 font-medium">{item.item_name}</td>
                      <td className="px-4 py-3">{item.warehouse}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.on_hand.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.min_stock.toLocaleString()}
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
                      {isGrouped && (
                        <td className="px-4 py-3">
                          {canExpand && (
                            <button
                              className="rounded p-1 hover:bg-muted"
                              onClick={() => setExpandedItem(isExpanded ? null : item.item_code)}
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                      )}
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
              {totalItems.toLocaleString()} items &mdash; page {page} of {totalPages}
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

function StockHealthBadge({ status }: { status: StockItem['stock_status'] }) {
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
      label: 'No Minimum',
      classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400',
    },
  } as const;

  const { label, classes } = config[status];

  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', classes)}>{label}</span>
  );
}
