// ============================================================================
// Filters
// ============================================================================

/**
 * Where the quantities come from.
 *
 * Only the quantities: the recipe, the stock, the open purchase orders and the
 * in-house flag come from SAP whatever this is set to, because the app either
 * has no copy or has only a per-run copy that would disagree with itself
 * between periods.
 */
export type PmDemandSource = 'sap' | 'app';

/**
 * What the consumption column measures.
 *
 * SAP records the goods issue. The app records only the BOM the warehouse
 * approved -- its `issued_qty` is written by nothing at all -- which is a
 * different fact, so the screen renames the column rather than pretending.
 */
export type ConsumptionBasis = 'issued' | 'approved';

export interface PmDemandFilters {
  /** First document date counted, inclusive. ISO yyyy-mm-dd. */
  date_from: string;
  /** Last document date counted, inclusive. ISO yyyy-mm-dd. */
  date_to: string;
  /** How many rows each top list returns. */
  top: number;
  /**
   * Count invoices to group companies as dispatch.
   *
   * True by default, and that is deliberate: this board measures packing
   * material physically leaving the factory, and an intercompany truck leaves
   * just as loaded as any other. On the Oil company two thirds of a month's
   * finished goods are invoiced to Jivo Mart, so excluding them would imply a
   * million pieces piling up in the godown that are not there.
   */
  include_intercompany: boolean;
  source: PmDemandSource;
  /** Client-side only: free text over item code, name and family. */
  search?: string;
  /** Client-side only: restrict to these packaging families. */
  sub_group?: string[];
}

// ============================================================================
// Items
// ============================================================================

/**
 * One packing-material item, across all three columns the board compares.
 *
 * `consumed_*`   what the line issued -- fact, from SAP movements
 * `bom_*`        what the recipes say production should have taken -- standard
 * `dispatched_*` what the recipes say went out inside invoiced finished goods
 *
 * Quantities are in the item's own inventory unit, so they are NOT comparable
 * between items -- tape is metres, caps are pieces. Values are, which is why
 * the ranking runs on value.
 */
export interface PmDemandItem {
  item_code: string;
  item_name: string;
  /** Packaging family from `OITM.U_Sub_Group`: LABEL, CAPS, CARTON, ... */
  sub_group: string;
  uom: string;
  unit_price: number;
  /**
   * The factory's own output covers at least half this item's consumption.
   *
   * A share, not a flag on any receipt at all: most packaging items carry a
   * small production receipt for rework and line returns, so "any receipt"
   * marked nearly every row and said nothing. At half, it picks out the
   * bottles the plant genuinely blows -- whose real demand is preform demand.
   */
  in_house: boolean;
  /** Received from the factory's own production in the period. */
  in_house_qty: number;

  consumed_qty: number;
  consumed_value: number;
  bom_qty: number;
  bom_value: number;
  /** consumed - bom. Positive is over-issue against the recipe. */
  variance_qty: number;
  variance_value: number;
  /** Null when no recipe calls for the item, rather than infinite. */
  variance_pct: number | null;
  wastage_qty: number;
  wastage_value: number;
  dispatched_qty: number;
  dispatched_value: number;
  /**
   * consumed - dispatched: packaging sitting in the finished-goods godown.
   * Negative means the period shipped more than it made, drawing stock down.
   */
  retained_qty: number;
  retained_value: number;
  /** Consumption per 1,000 pieces of finished goods produced. */
  per_1000_fg: number | null;
  /** Share of the period's total, not of the truncated top list. */
  share_pct: number;

  // -- Cover ----------------------------------------------------------------
  /** On hand now in the stock warehouses `meta.stock_warehouses` lists. */
  stock_qty: number;
  stock_value: number;
  /**
   * Consumption per WORKING day over the period, not per calendar day --
   * Sunday consumes nothing, so August is 26 days and not 31.
   *
   * Null when nothing was consumed.
   */
  avg_daily_qty: number | null;
  /**
   * Working days the stock on hand lasts at that rate.
   *
   * Null means nothing was consumed in the period, NOT that cover is
   * unbounded: an item with stock and no burn rate has no run-out date, and
   * showing a huge number would rank a dead item as the safest in the store.
   */
  days_cover: number | null;
  /**
   * Cover once what is already bought arrives -- and the figure `cover_status`
   * and the watch list are both based on.
   *
   * On-hand cover alone is a false-alarm machine: bulk-bought packaging sits
   * at under a day on the shelf for a day before every delivery. The real
   * PM0000085 had 5,660 on hand against 21,936 a working day AND 1,148,000
   * units on open purchase orders.
   */
  days_cover_incl_po: number | null;
  open_po_qty: number;
  open_po_lines: number;
  /** ISO date of the earliest open line, or null if nothing is on order. */
  open_po_earliest_due: string | null;
  /**
   * The earliest open line's due date has passed. Flagged, never netted off:
   * a late supplier and a purchase order nobody closed look identical from
   * here, and that judgement belongs to the buyer.
   */
  open_po_overdue: boolean;
  cover_status: CoverStatus;
}

/** Which band an item's cover falls in -- the thing a buyer acts on. */
export type CoverStatus = 'critical' | 'low' | 'ok' | 'unknown';

/** One item consumed at the blowing line -- its own stage, in no total. */
export interface PmDemandUpstreamItem {
  item_code: string;
  item_name: string;
  sub_group: string;
  uom: string;
  unit_price: number;
  consumed_qty: number;
  consumed_value: number;
  share_pct: number;
}

/** One packaging family, rolled up from the item rows. */
export interface PmDemandFamily {
  sub_group: string;
  item_count: number;
  consumed_value: number;
  bom_value: number;
  variance_value: number;
  dispatched_value: number;
  wastage_value: number;
  consumed_share_pct: number;
}

// ============================================================================
// Summary
// ============================================================================

export interface PmDemandSummary {
  fg_produced_qty: number;
  /** Dispatch on the scope asked for -- with or without intercompany. */
  fg_dispatched_qty: number;
  fg_dispatched_all_qty: number;
  fg_dispatched_intercompany_qty: number;
  fg_dispatched_third_party_qty: number;
  fg_returns_qty: number;
  /** Over 100% means the period shipped stock it did not make. */
  dispatch_ratio_pct: number | null;

  pm_items: number;
  pm_consumed_value: number;
  pm_bom_value: number;
  pm_variance_value: number;
  pm_variance_pct: number | null;
  pm_dispatched_value: number;
  pm_retained_value: number;
  pm_wastage_value: number;
  /** Stock value of the items on this board only, not of the whole store. */
  pm_stock_value: number;
  pm_items_critical_cover: number;
  pm_items_low_cover: number;
  pm_items_overdue_po: number;
}

// ============================================================================
// Meta
// ============================================================================

/**
 * How much of the finished-goods quantity could be exploded through a BOM.
 * Not decoration: an FG with no recipe contributes nothing, so a board that
 * did not state its coverage would silently under-report that SKU's packaging.
 */
export interface PmDemandCoverage {
  fg_items: number;
  fg_items_with_bom: number;
  fg_items_without_bom: string[];
  qty_total: number;
  qty_with_bom: number;
  qty_covered_pct: number;
}

export interface PmDemandMeta {
  company_code: string;
  date_from: string;
  date_to: string;
  top_n: number;
  include_intercompany: boolean;
  source: PmDemandSource;
  consumption_basis: ConsumptionBasis;
  /** Plain sentences on what this reading can and cannot tell you. */
  source_notes: string[];
  /** 'value' normally; 'quantity' only if nothing carries a price. */
  ranked_by: 'value' | 'quantity';
  pm_item_group: number;
  pm_item_group_name: string;
  fg_warehouses: string[];
  consumption_warehouses: string[];
  wastage_warehouses: string[];
  upstream_warehouses: string[];
  /** Where cover reads stock from. Deliberately not planning_purchase's list. */
  stock_warehouses: string[];
  /** Days the factory ran in the period -- the burn rate's denominator. */
  period_working_days: number;
  cover_critical_days: number;
  cover_low_days: number;
  intercompany_card_codes: string[];
  production_bom_coverage: PmDemandCoverage;
  dispatch_bom_coverage: PmDemandCoverage;
  fetched_at: string;
}

// ============================================================================
// Response
// ============================================================================

export interface PmDemandReportResponse {
  summary: PmDemandSummary;
  production_top: PmDemandItem[];
  dispatch_top: PmDemandItem[];
  families: PmDemandFamily[];
  /** Closest to running out first. The one list NOT ranked by value. */
  cover_watch: PmDemandItem[];
  upstream: PmDemandUpstreamItem[];
  meta: PmDemandMeta;
}
