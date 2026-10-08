import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { formatInrCompact, formatPct, formatQtyCompact } from '../../packing-material/utils';
import type { PiecesWarehouse } from '../types';

export interface PiecesWarehouseStripProps {
  warehouses: PiecesWarehouse[];
  selected: string[];
  onToggle: (code: string) => void;
}

/**
 * One tile per store that holds packaging, largest first. A tile is a filter:
 * picking one or more reads the family split and the table through those
 * stores only. The bar is the store's share of every piece the company holds.
 */
export function PiecesWarehouseStrip({ warehouses, selected, onToggle }: PiecesWarehouseStripProps) {
  if (!warehouses.length) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        SAP reports no packing material on hand in any warehouse.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {warehouses.map((warehouse) => {
        const active = selected.includes(warehouse.code);
        return (
          <button
            key={warehouse.code}
            type="button"
            onClick={() => onToggle(warehouse.code)}
            aria-pressed={active}
            className={cn(
              'min-w-0 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-all',
              'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active && 'border-primary ring-1 ring-primary',
              selected.length > 0 && !active && 'opacity-60',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{warehouse.code}</p>
              {warehouse.inactive && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  inactive in SAP
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{warehouse.name}</p>
            <p className="mt-2 text-xl font-bold tabular-nums">
              {formatQtyCompact(warehouse.pcs_qty)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">pcs</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.min(100, Math.max(0, warehouse.share_pct))}%` }}
              />
            </div>
            <p className="mt-1.5 truncate text-xs tabular-nums text-muted-foreground">
              {formatPct(warehouse.share_pct)} · {formatInrCompact(warehouse.stock_value)} ·{' '}
              {warehouse.item_count} items
              {warehouse.unconverted_item_count > 0 &&
                ` · ${warehouse.unconverted_item_count} not in pcs`}
            </p>
          </button>
        );
      })}
    </div>
  );
}
