import { Info } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { NonMovingItem } from '../types';
import { rowAgeClasses } from '../utils/movementStatus';
import { NonMovingStatusBadge } from './NonMovingStatusBadge';

interface NonMovingItemDetailPanelProps {
  /** The warehouse rows folded into the line the user expanded. */
  items: NonMovingItem[];
}

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

/**
 * The per-warehouse split behind one folded line. Everything here is already
 * on the client — the report answers at (item, warehouse) grain — so there is
 * no second request to make.
 */
export function NonMovingItemDetailPanel({ items }: NonMovingItemDetailPanelProps) {
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
            <th className="pb-2 pr-3 text-right font-medium">Quantity</th>
            <th className="pb-2 pr-3 text-right font-medium">Value</th>
            <th className="pb-2 pr-3 text-right font-medium">Days Idle</th>
            <th className="pb-2 pr-3 text-left font-medium">Last Movement</th>
            <th className="pb-2 pr-3 text-right font-medium">Consumption</th>
            <th className="pb-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.warehouse}
              className={cn('border-b last:border-0', rowAgeClasses(item.days_since_last_movement))}
            >
              <td className="py-2 pr-3 font-medium">
                {item.warehouse}
                {item.warehouse_name && item.warehouse_name !== item.warehouse && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {item.warehouse_name}
                  </span>
                )}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatQuantity(item.quantity)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(item.value)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {item.days_since_last_movement.toLocaleString('en-IN')}
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{item.last_movement_date ?? '-'}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {item.consumption_ratio.toFixed(2)}%
              </td>
              <td className="py-2">
                <NonMovingStatusBadge days={item.days_since_last_movement} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
