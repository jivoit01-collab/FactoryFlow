// ============================================================================
// PM Requirement board — API contract
// ============================================================================
//
// Mirrors the requirement serializers in `packing_material/serializers.py`.
//
// Two responses: the plan list fills the picker once, and the requirement is
// re-read whenever a different plan is chosen. Every quantity is in the item's
// SAP inventory unit — PIECES for caps, cartons, labels and bottles — never
// cases. The '20 PCS' in an item name is the carton configuration only.

/** One monthly production plan, as SAP holds it in `OFCT`. */
export interface PmReqPlan {
  abs_id: number;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  /** 'M' monthly, 'W' weekly. */
  form_view: string;
  item_count: number;
  planned_qty: number;
}

export interface PmReqPlanListMeta {
  company_code: string;
  /** The plan the requirement endpoint picks on its own. */
  default_abs_id: number | null;
  as_of: string;
  fetched_at: string;
}

export interface PmReqPlanListResponse {
  plans: PmReqPlan[];
  meta: PmReqPlanListMeta;
}

/** One finished good driving a component's requirement. */
export interface PmReqDriver {
  parent_code: string;
  parent_name: string;
  plan_qty: number;
  qty_per_unit: number;
  required_qty: number;
}

/**
 * One open purchase-order line behind a component's `PO` figure.
 *
 * `open_qty` is the part that still has to arrive, and it is what sums to
 * `open_po_qty` on the row — `ordered_qty` does not, because a line 80%
 * received is still open for the remaining fifth.
 */
export interface PmReqPoLine {
  doc_entry: number;
  /** What the buyer and the supplier both call the order. */
  doc_num: number;
  line_num: number;
  card_code: string;
  card_name: string;
  doc_date: string | null;
  /** SAP leaves this empty on plenty of open lines, which is itself a finding. */
  due_date: string | null;
  ordered_qty: number;
  received_qty: number;
  open_qty: number;
}

/**
 * One packing-material component the plan needs.
 *
 * The figures the buyer reads across, in order:
 *
 *   planning_qty            → Planning
 *   issued_pc_qty           → Issue (PC)
 *   rest_planning_qty       → Rest Planning   (planning − issued)
 *   on_hand_qty             → On hand         (the feeding stores only)
 *   benchmark_qty           → Benchmark       (SAP's minimum, same stores)
 *   req_after_benchmark_qty → Req             (on hand − rest planning − benchmark)
 *
 * `Req` is NEGATIVE when short — the sheet this replaces reads that way and
 * so does this board. `short_after_benchmark_qty` is the same shortfall as a
 * positive magnitude, which is what totals and sorting use so a surplus on
 * one row can never cancel a shortage on another.
 *
 * `req_qty` is the plan alone (no benchmark), and the PO figures below it are
 * still sent: the Plant Control board reads them, and the row dialog lists the
 * open orders. This page no longer nets orders off anything.
 */
export interface PmReqRow {
  item_code: string;
  item_name: string;
  sub_group: string;
  uom: string;
  unit_price: number;

  planning_qty: number;
  issued_pc_qty: number;
  rest_planning_qty: number;
  on_hand_qty: number;
  /** On hand less the rest of the plan — the plan alone, benchmark aside. */
  req_qty: number;
  /** `OITW.MinStock` over the same stores as On hand; 0 where SAP has none set. */
  benchmark_qty: number;
  /** What this page calls `Req`: `req_qty` less the benchmark. */
  req_after_benchmark_qty: number;
  short_after_benchmark_qty: number;
  short_after_benchmark_value: number;
  open_po_qty: number;
  req_after_po_qty: number;

  /** Transferred up from the stores vs. made in-house onto the floor. */
  issued_transfer_qty: number;
  issued_produced_qty: number;
  issued_other_qty: number;

  short_qty: number;
  short_value: number;

  /**
   * The buying question from the other end.
   *
   * `to_buy_qty` is what still has to be BOUGHT once the stores are counted
   * — 1,000 needed against 800 on hand is 200 — and `over_purchase_qty` is
   * what is on order beyond it. A 400 order against that 200 is 200 over.
   *
   * `over_purchased` is flagged on a whole-unit threshold rather than on
   * `> 0`: a BOM written per-bottle leaves thousandths behind, and a carton
   * over-ordered by 0.004 is rounding, not a purchasing decision.
   */
  to_buy_qty: number;
  over_purchase_qty: number;
  over_purchase_value: number;
  over_purchased: boolean;

  /** How many planned SKUs drive this component. */
  sku_count: number;
  po_lines: number;
  po_earliest_due: string | null;
  po_latest_due: string | null;

  /** The floor drew more than the plan called for. */
  over_issued: boolean;
  /** Short, but open orders close the gap. */
  po_covers_shortage: boolean;
  /** Those orders are not due until after the plan ends. */
  po_due_after_plan: boolean;
  /** Those orders are already past their due date. */
  po_overdue: boolean;

  drivers: PmReqDriver[];
  driver_count: number;

  /**
   * The orders behind `open_po_qty`, soonest due first and capped — a row
   * whose list is shorter than `po_lines` is showing the nearest few, not
   * all of them.
   */
  po_details: PmReqPoLine[];
}

export interface PmReqTotals {
  item_count: number;
  planning_qty: number;
  issued_pc_qty: number;
  issued_transfer_qty: number;
  issued_produced_qty: number;
  rest_planning_qty: number;
  on_hand_qty: number;
  open_po_qty: number;
  /** Short for the plan alone: `req_qty` below zero. */
  short_before_po_count: number;
  short_before_po_qty: number;
  short_before_po_value: number;
  /** Short once the benchmark is netted off too — the page's buying list. */
  short_after_benchmark_count: number;
  short_after_benchmark_qty: number;
  short_after_benchmark_value: number;
  /** Covered for the plan, short only of the benchmark. */
  benchmark_gap_count: number;
  /** Components SAP holds a benchmark for at all. */
  benchmark_count: number;
  benchmark_qty: number;
  short_after_po_count: number;
  short_after_po_qty: number;
  short_after_po_value: number;
  covered_by_po_count: number;
  po_due_after_plan_count: number;
  po_overdue_count: number;
  over_issued_count: number;
  surplus_count: number;
  /** Summed over the flagged rows only, so count and total describe one set. */
  over_purchased_count: number;
  over_purchase_qty: number;
  over_purchase_value: number;
}

export interface PmReqCoverageItem {
  item_code: string;
  item_name: string;
  plan_qty: number;
}

/** How much of the plan the requirement actually accounts for. */
export interface PmReqCoverage {
  plan_item_count: number;
  plan_qty: number;
  items_without_bom: number;
  items_without_bom_qty: number;
  items_without_bom_list: PmReqCoverageItem[];
  items_with_bom_without_pm: number;
  /** Share of planned QUANTITY, not of item count. */
  qty_covered_pct: number;
}

export interface PmReqUnplannedItem {
  item_code: string;
  item_name: string;
  sub_group: string;
  uom: string;
  unit_price: number;
  qty: number;
}

/** Packing material that reached the floor without being in the plan. */
export interface PmReqUnplanned {
  item_count: number;
  qty: number;
  items: PmReqUnplannedItem[];
}

export interface PmReqMeta {
  pm_item_group: number;
  pm_item_group_name: string;
  pm_item_group_matches: boolean;
  company_code: string;
  /** The window `Issue (PC)` counted — the plan's first day to today. */
  date_from: string;
  date_to: string;
  as_of: string;
  issue_warehouses: string[];
  supply_warehouses: string[];
  basis: string;
  issue_basis: string;
  /** False, and deliberately so — see the backend constants. */
  nets_committed: boolean;
  fetched_at: string;
}

export interface PmReqResponse {
  data: PmReqRow[];
  totals: PmReqTotals;
  coverage: PmReqCoverage;
  unplanned: PmReqUnplanned;
  plan: PmReqPlan;
  meta: PmReqMeta;
}

// ----------------------------------------------------------------------------
// Reading the table
// ----------------------------------------------------------------------------

/** Which column the table is sorted on. */
export type PmReqSortKey =
  | 'item_code'
  | 'item_name'
  | 'planning_qty'
  | 'issued_pc_qty'
  | 'rest_planning_qty'
  | 'on_hand_qty'
  | 'benchmark_qty'
  | 'req_after_benchmark_qty'
  | 'short_after_benchmark_value';

export type PmReqSortDir = 'asc' | 'desc';

export interface PmReqSort {
  key: PmReqSortKey;
  dir: PmReqSortDir;
}

/**
 * Which rows the table shows.
 *
 * `short` is the buying list — anything short once the rest of the plan AND
 * the benchmark are counted. It splits exactly in two: `plan-short`, where the
 * stores cannot make the plan at all, and `benchmark`, where they can but
 * would be left under their minimum.
 */
export type PmReqFilter = 'all' | 'short' | 'plan-short' | 'benchmark' | 'surplus' | 'over-issued';

/** What one row is, in a word, for the status column. */
export type PmReqStatus = 'short' | 'benchmark' | 'over-issued' | 'covered';
