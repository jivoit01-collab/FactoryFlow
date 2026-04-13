import { ChevronDown, ChevronsUpDown,ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { InventoryAgeItem } from '../types';

interface InventoryAgeTableProps {
  items: InventoryAgeItem[];
  isLoading: boolean;
}

type SortCol = keyof Pick<
  InventoryAgeItem,
  | 'item_code'
  | 'item_name'
  | 'item_group'
  | 'sub_group'
  | 'warehouse'
  | 'on_hand'
  | 'litres'
  | 'in_stock_value'
  | 'calc_price'
  | 'days_age'
>;

/**
 * Row background based on stock age:
 *  - 365+  days → red    (dead stock)
 *  - 180+  days → orange (old stock)
 *  - 90+   days → yellow (aging)
 *  - <90   days → default
 */
function rowAgeClasses(days: number): string {
  if (days >= 365) return 'bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-950/80';
  if (days >= 180)
    return 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50';
  if (days >= 90)
    return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40';
  return 'hover:bg-muted/30';
}

function formatINR(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function InventoryAgeTable({ items, isLoading }: InventoryAgeTableProps) {
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({
    col: 'days_age',
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
          <p className="text-sm text-muted-foreground">No inventory items found.</p>
        </CardContent>
      </Card>
    );
  }

  const thClass =
    'cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground';
  const thRightClass =
    'cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground';

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className={thClass} onClick={() => toggleSort('item_code')}>
                  Item Code <SortIcon col="item_code" />
                </th>
                <th className={thClass} onClick={() => toggleSort('item_name')}>
                  Item Name <SortIcon col="item_name" />
                </th>
                <th className={thClass} onClick={() => toggleSort('item_group')}>
                  Group <SortIcon col="item_group" />
                </th>
                <th className={thClass} onClick={() => toggleSort('sub_group')}>
                  Sub Group <SortIcon col="sub_group" />
                </th>
                <th className={thClass} onClick={() => toggleSort('warehouse')}>
                  Warehouse <SortIcon col="warehouse" />
                </th>
                <th className={thRightClass} onClick={() => toggleSort('on_hand')}>
                  On Hand <SortIcon col="on_hand" />
                </th>
                <th className={thRightClass} onClick={() => toggleSort('litres')}>
                  Litres <SortIcon col="litres" />
                </th>
                <th className={thRightClass} onClick={() => toggleSort('in_stock_value')}>
                  Value (₹) <SortIcon col="in_stock_value" />
                </th>
                <th className={thRightClass} onClick={() => toggleSort('calc_price')}>
                  Price <SortIcon col="calc_price" />
                </th>
                <th className={thRightClass} onClick={() => toggleSort('days_age')}>
                  Age (Days) <SortIcon col="days_age" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => (
                <tr
                  key={`${item.item_code}-${item.warehouse}-${idx}`}
                  className={cn('border-b transition-colors', rowAgeClasses(item.days_age))}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {item.item_code}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3 font-medium" title={item.item_name}>
                    {item.item_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.item_group}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.sub_group}</td>
                  <td className="px-4 py-3">{item.warehouse}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.on_hand.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.litres ? item.litres.toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatINR(item.in_stock_value)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatINR(item.calc_price)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <AgeBadge days={item.days_age} />
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

function AgeBadge({ days }: { days: number }) {
  let classes: string;
  if (days >= 365) {
    classes = 'bg-red-200 text-red-900 font-semibold dark:bg-red-900/60 dark:text-red-300';
  } else if (days >= 180) {
    classes = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  } else if (days >= 90) {
    classes = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  } else {
    classes = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  }

  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', classes)}>
      {days}
    </span>
  );
}
