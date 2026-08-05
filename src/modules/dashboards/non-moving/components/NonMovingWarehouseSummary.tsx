import { ChevronDown, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { NonMovingItem, WarehouseGroup } from '../types';
import { rowAgeClasses } from '../utils/movementStatus';
import { NonMovingStatusBadge } from './NonMovingStatusBadge';

interface NonMovingWarehouseSummaryProps {
  warehouses: WarehouseGroup[];
  isLoading?: boolean;
  onItemSelect?: (term: string) => void;
}

type WarehouseSortCol = 'warehouse' | 'item_count' | 'total_quantity' | 'total_value';

type ItemSortCol = keyof Pick<
  NonMovingItem,
  | 'item_code'
  | 'item_name'
  | 'branch'
  | 'quantity'
  | 'value'
  | 'days_since_last_movement'
  | 'consumption_ratio'
>;

interface SortState<Col> {
  col: Col;
  dir: 'asc' | 'desc';
}

const COLUMN_COUNT = 4;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuantity(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function formatConsumptionRatio(value: number): string {
  return `${value.toFixed(2)}%`;
}

function firstSearchWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? '';
}

function SortIcon<Col>({ col, sort }: { col: Col; sort: SortState<Col> }) {
  if (sort.col !== col) {
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  }

  return sort.dir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function WarehouseItemsPanel({
  items,
  sort,
  onSortChange,
  onItemSelect,
}: {
  items: NonMovingItem[];
  sort: SortState<ItemSortCol>;
  onSortChange: (col: ItemSortCol) => void;
  onItemSelect?: (term: string) => void;
}) {
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sort.col] ?? '';
      const bVal = b[sort.col] ?? '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [items, sort]);

  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-muted-foreground">
        No item breakdown available for this warehouse.
      </p>
    );
  }

  function sortableHeader(col: ItemSortCol, label: string, align: 'left' | 'right' = 'left') {
    return (
      <th
        className={cn(
          'cursor-pointer whitespace-nowrap px-4 py-2 font-medium text-muted-foreground hover:text-foreground',
          align === 'right' ? 'text-right' : 'text-left',
        )}
        onClick={() => onSortChange(col)}
      >
        {label} <SortIcon col={col} sort={sort} />
      </th>
    );
  }

  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/60 backdrop-blur">
          <tr className="border-b">
            {sortableHeader('item_code', 'Item Code')}
            {sortableHeader('item_name', 'Item Name')}
            {sortableHeader('branch', 'Branch')}
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sub Group</th>
            {sortableHeader('quantity', 'Quantity', 'right')}
            {sortableHeader('value', 'Value', 'right')}
            {sortableHeader('days_since_last_movement', 'Days Idle', 'right')}
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Last Movement</th>
            {sortableHeader('consumption_ratio', 'Consumption', 'right')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.item_code}
              className={cn(
                'border-b transition-colors last:border-b-0',
                rowAgeClasses(item.days_since_last_movement),
              )}
            >
              <td
                className="cursor-pointer px-4 py-2 font-mono text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                role="button"
                tabIndex={0}
                onClick={() => onItemSelect?.(item.item_code)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onItemSelect?.(item.item_code);
                  }
                }}
              >
                {item.item_code}
              </td>
              <td
                className="cursor-pointer px-4 py-2 font-medium underline-offset-2 hover:text-primary hover:underline"
                role="button"
                tabIndex={0}
                onClick={() => onItemSelect?.(firstSearchWord(item.item_name))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onItemSelect?.(firstSearchWord(item.item_name));
                  }
                }}
              >
                {item.item_name}
              </td>
              <td className="px-4 py-2">{item.branch}</td>
              <td className="px-4 py-2 text-muted-foreground">{item.sub_group}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatQuantity(item.quantity)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(item.value)}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {item.days_since_last_movement.toLocaleString('en-IN')}
              </td>
              <td className="px-4 py-2">
                <NonMovingStatusBadge days={item.days_since_last_movement} />
              </td>
              <td className="px-4 py-2 text-muted-foreground">{item.last_movement_date ?? '-'}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatConsumptionRatio(item.consumption_ratio)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NonMovingWarehouseSummary({
  warehouses,
  isLoading,
  onItemSelect,
}: NonMovingWarehouseSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [openWarehouse, setOpenWarehouse] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<WarehouseSortCol>>({
    col: 'total_value',
    dir: 'desc',
  });
  const [itemSort, setItemSort] = useState<SortState<ItemSortCol>>({
    col: 'value',
    dir: 'desc',
  });

  const sortedWarehouses = useMemo(() => {
    return [...warehouses].sort((a, b) => {
      const aValue = a[sort.col];
      const bValue = b[sort.col];
      const comparison =
        typeof aValue === 'string'
          ? aValue.localeCompare(String(bValue))
          : Number(aValue) - Number(bValue);

      return sort.dir === 'asc' ? comparison : -comparison;
    });
  }, [sort, warehouses]);

  // A filter change can drop the open warehouse from the list entirely.
  const activeWarehouse = warehouses.some((w) => w.warehouse === openWarehouse)
    ? openWarehouse
    : null;

  function toggleSort(col: WarehouseSortCol) {
    setSort((current) =>
      current.col === col
        ? { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'warehouse' ? 'asc' : 'desc' },
    );
  }

  function toggleItemSort(col: ItemSortCol) {
    setItemSort((current) =>
      current.col === col
        ? { col, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    );
  }

  function toggleWarehouse(warehouse: string) {
    setOpenWarehouse((current) => (current === warehouse ? null : warehouse));
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (warehouses.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No factory-warehouse items found for the selected filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-3 transition-colors hover:bg-muted/20"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsExpanded((current) => !current);
          }
        }}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span>
            Warehouse Breakdown
            <span className="ml-2 font-normal text-muted-foreground">
              factory warehouses only - click one to see its items
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180',
            )}
          />
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-2 text-left font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('warehouse')}
                  >
                    Warehouse <SortIcon col="warehouse" sort={sort} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('item_count')}
                  >
                    Items <SortIcon col="item_count" sort={sort} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('total_quantity')}
                  >
                    Quantity <SortIcon col="total_quantity" sort={sort} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-2 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('total_value')}
                  >
                    Value <SortIcon col="total_value" sort={sort} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWarehouses.map((warehouse) => {
                  const isOpen = activeWarehouse === warehouse.warehouse;

                  return (
                    <Fragment key={warehouse.warehouse}>
                      <tr
                        className={cn(
                          'cursor-pointer border-b transition-colors hover:bg-muted/30',
                          isOpen && 'bg-muted/40',
                        )}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        onClick={() => toggleWarehouse(warehouse.warehouse)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleWarehouse(warehouse.warehouse);
                          }
                        }}
                      >
                        <td className="px-4 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                isOpen && 'rotate-90',
                              )}
                            />
                            <div>
                              <div>{warehouse.warehouse}</div>
                              {warehouse.warehouse_name && (
                                <div className="text-xs font-normal text-muted-foreground">
                                  {warehouse.warehouse_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {warehouse.item_count.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatQuantity(warehouse.total_quantity)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatCurrency(warehouse.total_value)}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b">
                          <td colSpan={COLUMN_COUNT} className="bg-muted/10 p-0">
                            <WarehouseItemsPanel
                              items={warehouse.items}
                              sort={itemSort}
                              onSortChange={toggleItemSort}
                              onItemSelect={onItemSelect}
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
        </CardContent>
      )}
    </Card>
  );
}
