import { ChevronDown, ChevronsUpDown,ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { NonMovingItem } from '../types';

interface NonMovingTableProps {
  items: NonMovingItem[];
  isLoading: boolean;
}

type SortCol = keyof Pick<
  NonMovingItem,
  'item_code' | 'item_name' | 'branch' | 'warehouse' | 'quantity' | 'value' | 'days_since_last_movement' | 'consumption_ratio'
>;

function rowAgeClasses(days: number): string {
  if (days >= 365) return 'bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-950/80';
  if (days >= 180) return 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50';
  return 'hover:bg-muted/30';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function NonMovingTable({ items, isLoading }: NonMovingTableProps) {
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({
    col: 'days_since_last_movement',
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sort.col] ?? '';
      const bVal = b[sort.col] ?? '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [items, sort]);

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
            No non-moving items found for the selected filters.
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
scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('item_code')}
                >
                  Item Code <SortIcon col="item_code" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('item_name')}
                >
                  Item Name <SortIcon col="item_name" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('branch')}
                >
                  Branch <SortIcon col="branch" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('warehouse')}
                >
                  Warehouse <SortIcon col="warehouse" />
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Sub Group
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('quantity')}
                >
                  Quantity <SortIcon col="quantity" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('value')}
                >
                  Value <SortIcon col="value" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('days_since_last_movement')}
                >
                  Days Idle <SortIcon col="days_since_last_movement" />
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Last Movement
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('consumption_ratio')}
                >
                  Consumption <SortIcon col="consumption_ratio" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr
                  key={`${item.item_code}-${item.branch}-${item.warehouse}`}
                  className={cn('border-b transition-colors', rowAgeClasses(item.days_since_last_movement))}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {item.item_code}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.item_name}</td>
                  <td className="px-4 py-3">{item.branch}</td>
                  <td className="px-4 py-3">{item.warehouse}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.sub_group}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.days_since_last_movement.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.last_movement_date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(item.consumption_ratio * 100).toFixed(1)}%
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
