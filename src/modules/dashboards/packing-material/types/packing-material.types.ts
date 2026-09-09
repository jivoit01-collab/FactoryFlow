// ============================================================================
// Packing Material board — API contract
// ============================================================================
//
// Mirrors `packing_material/serializers.py`. Three responses, because the
// board makes three requests: the stock cards are a snapshot of now, and the
// two top lists are a period.

/** Which register the dispatch section counted. */
export type PackingMaterialSource = 'sap' | 'app';

/**
 * What the number on screen actually is.
 *
 * `issued` is the goods issue out of the consumption store. `invoiced` is
 * A/R invoices net of credit notes. `gated-out` is the bills that physically
 * went out through docking. Three different facts, so the panel headings are
 * driven off this rather than hardcoded.
 */
export type PackingMaterialBasis = 'issued' | 'invoiced' | 'gated-out';

/** Which item group was counted, and whether SAP still agrees it is that. */
export interface PackingMaterialGroupMeta {
  pm_item_group: number;
  pm_item_group_name: string;
  pm_item_group_matches: boolean;
}

// ----------------------------------------------------------------------------
// Stock — the four cards
// ----------------------------------------------------------------------------

export interface PmStockItem {
  item_code: string;
  item_name: string;
  sub_group: string;
  uom: string;
  unit_price: number;
  stock_qty: number;
  stock_value: number;
}

/**
 * One item's share of one store, for the split shown on a combined row.
 */
export interface PmStockSplit {
  code: string;
  stock_qty: number;
  stock_value: number;
}

/**
 * One item added up across every store.
 *
 * The whole point of the total drill-down: a pet bottle sitting 3 in BH-PC, 5
 * in BH-BS and 2 in BH-PM is ten bottles the factory has, and this is the row
 * that says so — with the split kept alongside, so "ten" can always be traced
 * back to where the ten are.
 */
export interface PmCombinedStockItem extends PmStockItem {
  /** Only the stores actually holding some, in card order. */
  splits: PmStockSplit[];
}

export interface PmStockWarehouse {
  code: string;
  name: string;
  /** SAP has this store flagged decommissioned; its balance is frozen. */
  inactive: boolean;
  /** False when SAP has no such warehouse in this company at all. */
  exists: boolean;
  item_count: number;
  total_qty: number;
  total_value: number;
  share_pct: number;
  items: PmStockItem[];
}

export interface PmStockTotal {
  warehouse_count: number;
  /** DISTINCT items across the stores, not the sum of their counts. */
  item_count: number;
  total_qty: number;
  total_value: number;
}

export interface PmStockMeta extends PackingMaterialGroupMeta {
  company_code: string;
  stock_warehouses: string[];
  ranked_by: string;
  fetched_at: string;
}

export interface PmStockResponse {
  warehouses: PmStockWarehouse[];
  total: PmStockTotal;
  meta: PmStockMeta;
}

// ----------------------------------------------------------------------------
// The two top lists
// ----------------------------------------------------------------------------

export interface PmTopItem {
  rank: number;
  item_code: string;
  item_name: string;
  sub_group: string;
  uom: string;
  unit_price: number;
  qty: number;
  value: number;
  /** Share of the whole period, not of the rows shown. */
  share_pct: number;
}

export interface PmTopTotals {
  item_count: number;
  total_qty: number;
  total_value: number;
  shown_qty: number;
  shown_value: number;
  shown_share_pct: number;
}

export interface PmPeriodMeta extends PackingMaterialGroupMeta {
  company_code: string;
  date_from: string;
  date_to: string;
  top_n: number;
  ranked_by: string;
  basis: PackingMaterialBasis;
  fetched_at: string;
}

export interface PmProductionMeta extends PmPeriodMeta {
  consumption_warehouses: string[];
}

export interface PmProductionResponse {
  items: PmTopItem[];
  totals: PmTopTotals;
  meta: PmProductionMeta;
}

export interface PmDispatchCoverage {
  fg_items: number;
  fg_items_with_bom: number;
  fg_items_without_bom: string[];
  fg_items_without_bom_count: number;
  /** Absolute volume, not the net figure — see the backend serializer. */
  qty_total: number;
  qty_with_bom: number;
  qty_covered_pct: number;
  /** Packaging invoiced as itself rather than inside a finished good. */
  direct_pm_items: number;
  direct_pm_qty: number;
  /** Lines that are neither finished goods nor packaging. */
  other_item_count: number;
  other_qty: number;
}

export interface PmDispatchSummary {
  fg_dispatched_qty: number;
  fg_intercompany_qty: number;
  fg_third_party_qty: number;
  fg_returns_qty: number;
  fg_item_count: number;
  /** Bills: SAP invoices, or the bill documents on the trucks that left. */
  document_count: number;
  /** Trucks. Null on SAP, which has no such thing. */
  gate_out_count: number | null;
}

export interface PmDispatchMeta extends PmPeriodMeta {
  source: PackingMaterialSource;
  include_intercompany: boolean;
  /** False on the FactoryFlow source, which cannot tell a group truck apart. */
  intercompany_known: boolean;
}

export interface PmDispatchResponse {
  items: PmTopItem[];
  totals: PmTopTotals;
  coverage: PmDispatchCoverage;
  summary: PmDispatchSummary;
  meta: PmDispatchMeta;
}

// ----------------------------------------------------------------------------
// Request
// ----------------------------------------------------------------------------

export interface PmPeriod {
  date_from: string;
  date_to: string;
}

export interface PmPeriodQuery extends PmPeriod {
  top: number;
}

export interface PmDispatchQuery extends PmPeriodQuery {
  source: PackingMaterialSource;
}

/**
 * Which column the two tables are sorted on.
 *
 * The API ranks on quantity — the factory's own way of counting packaging —
 * and returns the value on every row. Re-sorting the ten rows that came back
 * is a client-side reading of the same ten items, never a different request,
 * so the "top ten" stays the top ten by quantity whichever way it is read.
 */
export type PmSortKey = 'qty' | 'value';
