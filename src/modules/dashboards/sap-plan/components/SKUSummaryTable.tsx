import { ChevronDown, ChevronsUpDown,ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';

import type { SummaryOrder } from '../types';
import { OrderStatusBadge } from './OrderStatusBadge';
import { SKUDetailPanel } from './SKUDetailPanel';

interface SKUSummaryTableProps {
  orders: SummaryOrder[];
  isLoading: boolean;
  statusFilter?: string[];
}

type SortCol = keyof Pick<
  SummaryOrder,
  'prod_order_num' | 'sku_code' | 'planned_qty' | 'due_date' | 'status' | 'components_with_shortfall'
>;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export function SKUSummaryTable({ orders, isLoading, statusFilter }: SKUSummaryTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({
    col: 'due_date',
    dir: 'asc',
  });

  const filtered = useMemo(() => {
    if (!statusFilter?.length) return orders;
    return orders.filter((order) => statusFilter.includes(order.status));
  }, [orders, statusFilter]);

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
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    );
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sort.col !== col) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
    return sort.dir === 'asc'
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-b p-4">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No production orders match the current filters.</p>
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
                  onClick={() => toggleSort('prod_order_num')}
                >
                  Order <SortIcon col="prod_order_num" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('sku_code')}
                >
                  SKU <SortIcon col="sku_code" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('planned_qty')}
                >
                  Planned Qty <SortIcon col="planned_qty" />
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Completed
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Components
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('due_date')}
                >
                  Due Date <SortIcon col="due_date" />
                </th>
                <th
scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('status')}
                >
                  Status <SortIcon col="status" />
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Warehouse
                </th>
                <th scope="col" className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((order) => {
                const isExpanded = expandedRow === order.prod_order_entry;
                return (
                  <>
                    <tr
                      key={order.prod_order_entry}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        PO-{order.prod_order_num}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order.sku_code}</div>
                        <div className="text-xs text-muted-foreground">{order.sku_name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{order.planned_qty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{order.completed_qty.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {order.components_with_shortfall > 0 ? (
                          <span className="text-red-600">
                            {order.total_components} ({order.components_with_shortfall} short)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{order.total_components}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatDate(order.due_date)}</td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{order.warehouse}</td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded p-1 hover:bg-muted"
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : order.prod_order_entry)
                          }
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.prod_order_entry}-detail`} className="bg-muted/20">
                        <td colSpan={9} className="px-2 py-1">
                          <SKUDetailPanel docEntry={order.prod_order_entry} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
