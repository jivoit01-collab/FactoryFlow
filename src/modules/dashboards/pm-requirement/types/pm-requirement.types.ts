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
 * One packing-material component the plan needs.
 *
 * The seven figures the buyer reads across, in order:
 *
 *   planning_qty      → Planning
 *   issued_pc_qty     → Issue (PC)
 *   rest_planning_qty → Rest Planning   (planning − issued)
 *   on_hand_qty       → On hand         (the feeding stores only)
 *   req_qty           → Req             (on hand − rest planning)
 *   open_po_qty       → PO
 *   req_after_po_qty  → REQ after PO    (req + PO)
 *
 * `req_qty` and `req_after_po_qty` are NEGATIVE when short — the sheet this
 * replaces reads that way and so does this board. `short_qty` is the same
 * shortfall as a positive magnitude, which is what totals and sorting use so
 * a surplus on one row can never cancel a shortage on another.
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
  req_qty: number;
  open_po_qty: number;
  req_after_po_qty: number;

  /** Transferred up from the stores vs. made in-house onto the floor. */
  issued_transfer_qty: number;
  issued_produced_qty: number;
  issued_other_qty: number;

  short_qty: number;
  short_value: number;

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
  short_before_po_count: number;
  short_before_po_qty: number;
  short_after_po_count: number;
  short_after_po_qty: number;
  short_after_po_value: number;
  covered_by_po_count: number;
  po_due_after_plan_count: number;
  po_overdue_count: number;
  over_issued_count: number;
  surplus_count: number;
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
  | 'req_qty'
  | 'open_po_qty'
  | 'req_after_po_qty'
  | 'short_value';

export type PmReqSortDir = 'asc' | 'desc';

export interface PmReqSort {
  key: PmReqSortKey;
  dir: PmReqSortDir;
}

/**
 * Which rows the table shows.
 *
 * `short` is the buying list — anything still short once open orders are
 * netted off. `at-risk` is narrower and is the one worth acting on today:
 * short, or leaning on an order that is late or lands after the plan closes.
 */
export type PmReqFilter = 'all' | 'short' | 'at-risk' | 'surplus' | 'over-issued';

/** What one row is, in a word, for the status column. */
export type PmReqStatus = 'short' | 'po-covered' | 'po-risk' | 'over-issued' | 'covered';
