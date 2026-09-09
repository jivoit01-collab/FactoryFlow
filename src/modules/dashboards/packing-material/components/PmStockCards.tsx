import { Boxes, Layers, PackageOpen, Warehouse } from 'lucide-react';

import { ACCENTS, KpiStat } from '@/shared/components/dashboard';

import type { PmStockResponse, PmStockWarehouse } from '../types';
import { formatInrCompact, formatQtyCompact, shortWarehouseName } from '../utils';

/**
 * Card accents, in card order, so a store keeps its colour between loads.
 * Read by index rather than by warehouse code: the codes are configuration
 * and differ per company, and a map keyed on them would leave an unknown
 * store unpainted.
 */
const WAREHOUSE_ACCENTS = [ACCENTS.blue, ACCENTS.violet, ACCENTS.teal, ACCENTS.cyan] as const;
const WAREHOUSE_ICONS = [PackageOpen, Layers, Warehouse, Boxes] as const;

export interface PmStockCardsProps {
  stock?: PmStockResponse;
  isLoading: boolean;
  onOpenWarehouse: (warehouse: PmStockWarehouse) => void;
  onOpenTotal: () => void;
}

function SkeletonCard({ delayMs }: { delayMs: number }) {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className="h-[8.5rem] animate-pulse rounded-2xl border border-border/60 bg-muted/40"
    />
  );
}

/**
 * The stock strip: one card per packaging store, then the total of them.
 *
 * Driven off the warehouses the API returned rather than a hardcoded four, so
 * a company with two packaging stores gets two cards and a total instead of
 * two cards and two empty ones. Every card opens.
 *
 * The headline is the piece count and the rupee value sits under it. Both are
 * there because neither answers on its own: 1.18 Cr pieces says nothing about
 * what it is worth, and ₹3.46 Cr says nothing about whether the line is about
 * to run out of caps.
 */
export function PmStockCards({
  stock,
  isLoading,
  onOpenWarehouse,
  onOpenTotal,
}: PmStockCardsProps) {
  if (isLoading && !stock) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <SkeletonCard key={index} delayMs={index * 60} />
        ))}
      </div>
    );
  }

  if (!stock) return null;

  const warehouses = stock.warehouses;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {warehouses.map((warehouse, index) => {
        const accent = WAREHOUSE_ACCENTS[index % WAREHOUSE_ACCENTS.length];
        const Icon = WAREHOUSE_ICONS[index % WAREHOUSE_ICONS.length];

        // A store SAP does not have, or has decommissioned, says so on the
        // card. A bare zero would read as "we are out of packaging" when it
        // means "nobody is looking at the right warehouse".
        const note = !warehouse.exists
          ? 'Not a warehouse in this company'
          : warehouse.inactive
            ? `${formatInrCompact(warehouse.total_value)} · inactive in SAP`
            : `${formatInrCompact(warehouse.total_value)} · ${warehouse.item_count} items`;

        return (
          <KpiStat
            key={warehouse.code}
            icon={Icon}
            accent={accent}
            delayMs={index * 60}
            label={`${warehouse.code} — ${shortWarehouseName(warehouse.name)}`}
            value={formatQtyCompact(warehouse.total_qty)}
            sub={note}
            onClick={() => onOpenWarehouse(warehouse)}
          />
        );
      })}

      <KpiStat
        icon={Boxes}
        accent={ACCENTS.amber}
        delayMs={warehouses.length * 60}
        label="Total packing material stock"
        value={formatQtyCompact(stock.total.total_qty)}
        sub={`${formatInrCompact(stock.total.total_value)} · ${stock.total.item_count} items across ${stock.total.warehouse_count}`}
        onClick={onOpenTotal}
      />
    </div>
  );
}
