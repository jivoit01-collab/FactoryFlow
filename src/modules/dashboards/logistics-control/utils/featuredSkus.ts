import type { WarehouseOccupancyItem } from '../../production-control/types';

/** One SKU a scope pins to the Stock on hand tile. */
export interface FeaturedSku {
  /** What the tile prints above its figure. */
  label: string;
  /** A word the SAP item name must contain, matched ignoring case and spacing. */
  name: string;
  /** The pack size, in millilitres. */
  ml: number;
}

/** A featured SKU's stock across the board's ticked warehouses. */
export interface FeaturedSkuStock {
  label: string;
  /** Item codes that matched. Empty means SAP holds none of it on these floors. */
  itemCodes: string[];
  pieces: number;
  /** Null where a matching row has no pack factor, so cases cannot be counted. */
  cases: number | null;
}

const squash = (value: string) => value.toUpperCase().replace(/[^A-Z0-9.]/g, '');

/**
 * The pack size an item name states, in millilitres, or null.
 *
 * Read off the name first because that is what the floor reads: "500 ML",
 * "1 LTR", "1L", "1000ML". `SalPackUn` is the fallback, since it is not filled
 * in for every Beverages item.
 */
export function packMillilitres(
  row: Pick<WarehouseOccupancyItem, 'item_name' | 'litres_per_piece'>,
): number | null {
  const match = /(\d+(?:\.\d+)?)\s*(ML|LTRS?|LITRES?|LITERS?|L)\b/i.exec(row.item_name ?? '');
  if (match) {
    const size = Number(match[1]);
    return /^ML$/i.test(match[2]) ? size : size * 1000;
  }
  return row.litres_per_piece !== null && row.litres_per_piece > 0
    ? row.litres_per_piece * 1000
    : null;
}

/**
 * Each featured SKU's stock in the given rows.
 *
 * Matched by name and pack size rather than item code because the codes are
 * not to hand; a row counts for a SKU when its name contains the SKU's word
 * and states the same pack size. Several rows can match one SKU — the same item
 * in two warehouses, or two codes for one product — and they are added.
 */
export function featuredSkuStock(
  rows: readonly WarehouseOccupancyItem[],
  skus: readonly FeaturedSku[],
): FeaturedSkuStock[] {
  return skus.map((sku) => {
    const word = squash(sku.name);
    const matched = rows.filter(
      (row) => squash(row.item_name ?? '').includes(word) && packMillilitres(row) === sku.ml,
    );
    const pieces = matched.reduce((total, row) => total + (row.on_hand || 0), 0);
    const boxed = matched.every((row) => row.pieces_per_box !== null && row.pieces_per_box > 0);
    return {
      label: sku.label,
      itemCodes: [...new Set(matched.map((row) => row.item_code))],
      pieces,
      cases: boxed
        ? matched.reduce((total, row) => total + (row.on_hand || 0) / (row.pieces_per_box ?? 1), 0)
        : null,
    };
  });
}
