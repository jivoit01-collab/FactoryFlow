import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { StockItem } from '../types';

interface StockLevelTableProps {
  items: StockItem[];
  isLoading: boolean;
  statusFilter?: string[];
}

type SortCol = keyof Pick<
  StockItem,
  'item_code' | 'item_name' | 'warehouse' | 'on_hand' | 'min_stock' | 'health_ratio'
>;

/**
 * Returns row background classes based on stock health status.
 *
 * - healthy:  no highlight
 * - low:      soft red (below min stock)
 * - critical: intense red (below 60% of min stock — "about to die")
 */
function rowStatusClasses(status: StockItem['stock_status']): string {
  switch (status) {
    case 'critical':
      return 'bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-950/80';
    case 'low':
      return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50';
    default:
      return 'hover:bg-muted/30';
  }
}

export function StockLevelTable({ items, isLoading, statusFilter }: StockLevelTableProps) {
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({
    col: 'health_ratio',
    dir: 'asc',
  });

  const filtered = useMemo(() => {
    if (!statusFilter?.length) return items;
    return items.filter((item) => statusFilter.includes(item.stock_status));
  }, [items, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sort.col] ?? '';
      const bVal = b[sort.col] ?? '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  function toggleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    );
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sort.col !== col)
      return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
    return sort.dir === 'asc' ? (
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

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No items with minimum stock thresholds found.
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
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr
                  key={`${item.item_code}-${item.warehouse}`}
                  className={cn('border-b transition-colors', rowStatusClasses(item.stock_status))}
                >
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
                    <StockHealthBadge status={item.stock_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  } as const;

  const { label, classes } = config[status];

  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', classes)}>{label}</span>
  );
}
