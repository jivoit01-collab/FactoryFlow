import { ChevronDown, ChevronsUpDown,ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui';

import type { ProcurementItem } from '../types';
import { ShortfallCell } from './ShortfallCell';
import { StockStatusBadge } from './StockStatusBadge';

interface ProcurementTableProps {
  items: ProcurementItem[];
  isLoading: boolean;
}

type SortCol = keyof Pick<
  ProcurementItem,
  'component_code' | 'component_name' | 'total_required_qty' | 'shortfall_qty' | 'suggested_purchase_qty'
>;

export function ProcurementTable({ items, isLoading }: ProcurementTableProps) {
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({
    col: 'shortfall_qty',
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
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' },
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
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
          <p className="text-sm text-muted-foreground">No procurement items found.</p>
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
                  onClick={() => toggleSort('component_code')}
                >
                  Code <SortIcon col="component_code" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('component_name')}
                >
                  Component <SortIcon col="component_name" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('total_required_qty')}
                >
                  Total Required <SortIcon col="total_required_qty" />
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Available
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('shortfall_qty')}
                >
                  Shortfall <SortIcon col="shortfall_qty" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort('suggested_purchase_qty')}
                >
                  Suggested Purchase <SortIcon col="suggested_purchase_qty" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">UOM</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Related Orders
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.component_code} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {item.component_code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.component_name}</div>
                    {item.default_vendor && (
                      <div className="text-xs text-muted-foreground">
                        Vendor: {item.default_vendor || '—'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{item.total_required_qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{item.net_available.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <ShortfallCell value={item.shortfall_qty} uom={item.uom} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold">
                      {item.suggested_purchase_qty.toLocaleString()}
                    </span>
                    <div className="text-xs text-muted-foreground">{item.uom}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.uom}</td>
                  <td className="px-4 py-3">
                    <StockStatusBadge
                      status={item.shortfall_qty > 0 ? (item.net_available > 0 ? 'partial' : 'stockout') : 'sufficient'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.related_prod_orders.map((po) => (
                        <span
                          key={po}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs"
                        >
                          PO-{po}
                        </span>
                      ))}
                    </div>
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
