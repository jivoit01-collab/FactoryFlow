import { Info } from 'lucide-react';

import type { ApiError } from '@/core/api';
import { cn } from '@/shared/utils';

import { useStockItemDetail } from '../api';
import type { StockItem } from '../types';

interface StockItemDetailPanelProps {
  itemCode: string;
  warehouses: string[];
}

function StatusBadge({ status }: { status: StockItem['stock_status'] }) {
  const config = {
    healthy: { label: 'Healthy', classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    low: { label: 'Low', classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    critical: { label: 'Critical', classes: 'bg-red-200 text-red-900 font-semibold dark:bg-red-900/60 dark:text-red-300' },
    unset: { label: 'No Minimum', classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400' },
  } as const;
  const { label, classes } = config[status];
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', classes)}>{label}</span>;
}

export function StockItemDetailPanel({ itemCode, warehouses }: StockItemDetailPanelProps) {
  const { data, isLoading, error } = useStockItemDetail(itemCode, warehouses);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  const apiError = error as ApiError | null;
  if (apiError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load warehouse details.
      </div>
    );
  }

  const items = data?.data ?? [];
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        No warehouse details found for this item.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 pr-3 text-left font-medium">Warehouse</th>
            <th className="pb-2 pr-3 text-right font-medium">On Hand</th>
            <th className="pb-2 pr-3 text-right font-medium">Min Stock</th>
            <th className="pb-2 pr-3 text-right font-medium">Health</th>
            <th className="pb-2 pr-3 text-left font-medium">UOM</th>
            <th className="pb-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.warehouse} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">{item.warehouse}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{item.on_hand.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{item.min_stock.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{(item.health_ratio * 100).toFixed(0)}%</td>
              <td className="py-2 pr-3 text-muted-foreground">{item.uom}</td>
              <td className="py-2">
                <StatusBadge status={item.stock_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
