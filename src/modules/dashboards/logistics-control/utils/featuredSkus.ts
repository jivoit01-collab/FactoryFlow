import type { WarehouseOccupancyItem } from '../../production-control/types';

/** One SKU a scope pins to the Stock on hand tile. */
export interface FeaturedSku {
  /** What the tile prints above its figure. */
  label: string;
  /** The SAP item code. */
  itemCode: string;
}

/** A featured SKU's stock across the board's ticked warehouses. */
export interface FeaturedSkuStock {
  label: string;
  /** Whether any stock row carried this code. False means none on these floors. */
  found: boolean;
  pieces: number;
  /** Null where a matching row has no pack factor, so cases cannot be counted. */
  cases: number | null;
}

const codeOf = (value: string | null | undefined) => (value ?? '').trim().toUpperCase();

/**
 * Each featured SKU's stock in the given rows, matched on item code.
 *
 * Several rows can carry one code — the same item in two ticked warehouses —
 * and they are added.
 */
export function featuredSkuStock(
  rows: readonly WarehouseOccupancyItem[],
  skus: readonly FeaturedSku[],
): FeaturedSkuStock[] {
  return skus.map((sku) => {
    const matched = rows.filter((row) => codeOf(row.item_code) === codeOf(sku.itemCode));
    const pieces = matched.reduce((total, row) => total + (row.on_hand || 0), 0);
    const boxed = matched.every((row) => row.pieces_per_box !== null && row.pieces_per_box > 0);
    return {
      label: sku.label,
      found: matched.length > 0,
      pieces,
      cases: boxed
        ? matched.reduce((total, row) => total + (row.on_hand || 0) / (row.pieces_per_box ?? 1), 0)
        : null,
    };
  });
}
