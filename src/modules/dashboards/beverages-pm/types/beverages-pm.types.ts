// ============================================================================
// Beverages PM Stock — API contract
// ============================================================================
//
// Mirrors the pieces serializers in `packing_material/serializers.py`.

import type { PackingMaterialGroupMeta } from '../../packing-material/types';

/**
 * How an item reached its piece count.
 *
 * `pieces` — stocked in pieces already. `uom_group` — converted through the
 * item's SAP unit-of-measure group. `none` — no route to pieces; the item
 * keeps its own unit and stays out of every pieces total.
 */
export type PiecesConversion = 'pieces' | 'uom_group' | 'none';

export interface PiecesItemWarehouse {
  code: string;
  /** In the item's own SAP unit. */
  stock_qty: number;
  /** Null exactly when the item has no route to pieces. */
  pcs_qty: number | null;
  stock_value: number;
}

export interface PiecesItem {
  item_code: string;
  item_name: string;
  sub_group: string;
  uom: string;
  conversion: PiecesConversion;
  pieces_per_uom: number | null;
  stock_qty: number;
  pcs_qty: number | null;
  stock_value: number;
  warehouses: PiecesItemWarehouse[];
}

export interface PiecesWarehouse {
  code: string;
  name: string;
  inactive: boolean;
  item_count: number;
  unconverted_item_count: number;
  pcs_qty: number;
  stock_value: number;
  share_pct: number;
}

export interface PiecesFamily {
  sub_group: string;
  item_count: number;
  unconverted_item_count: number;
  pcs_qty: number;
  stock_value: number;
  share_pct: number;
}

export interface PiecesTotal {
  warehouse_count: number;
  item_count: number;
  converted_item_count: number;
  unconverted_item_count: number;
  pcs_qty: number;
  stock_value: number;
  unconverted_value: number;
}

export interface PiecesMeta extends PackingMaterialGroupMeta {
  company_code: string;
  /** Stores left out of everything on the page — wastage. */
  excluded_warehouses: string[];
  fetched_at: string;
  piece_uom_codes: string[];
}

export interface PiecesResponse {
  /** Converted items by pieces, then the unconverted ones by value. */
  items: PiecesItem[];
  warehouses: PiecesWarehouse[];
  sub_groups: PiecesFamily[];
  total: PiecesTotal;
  meta: PiecesMeta;
}

// ----------------------------------------------------------------------------
// Page state
// ----------------------------------------------------------------------------

/** Which items the table shows by unit. */
export type PiecesUnitFilter = 'all' | 'converted' | 'unconverted';

export type PiecesSortKey = 'pcs' | 'value' | 'name';

export interface PiecesFilters {
  search: string;
  /** Empty means every store. */
  warehouses: string[];
  /** Empty means every family. */
  families: string[];
  unit: PiecesUnitFilter;
  sort: PiecesSortKey;
}
