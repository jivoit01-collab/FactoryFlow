/** Smart Supply Chain dashboard — steps 6 (lead-time alarms) and 7 (line capacity).
 *
 * Quantities arrive as strings: they are DECIMAL(24,6) server-side and JavaScript
 * numbers cannot hold that range without silently rounding, so they are displayed
 * as given and only parsed when something genuinely needs arithmetic.
 */

/** Step 6 verdict for one material. */
export type AlarmState =
  | 'OVERDUE'
  | 'ORDER_NOW'
  | 'SCHEDULED'
  | 'NO_LEAD_TIME'
  | 'COVERED';

/** Which reading of the brief's floor rule the numbers came from. */
export type FloorSource = 'PROCEDURE' | 'POLICY';

export type FloorConvention = 'ADDITIVE' | 'SUBTRACTIVE' | 'INDETERMINATE';

export interface ProcurementRow {
  item_code: string;
  item_name: string;
  material_type: string;
  supplier_name: string;
  required_qty: string;
  stock_in_hand: string;
  min_stock: string;
  floor_source: FloorSource;
  open_po_qty: string;
  shortage_qty: string;
  order_qty: string;
  moq: string;
  unit: string;
  lead_time_days: number | null;
  required_by: string | null;
  /** The date the order must be PLACED — lead time counted back from required_by. */
  order_by: string | null;
  days_until_order_by: number | null;
  alarm: AlarmState;
}

export interface ProcurementTotals {
  materials: number;
  overdue: number;
  order_now: number;
  no_lead_time: number;
  scheduled: number;
  covered: number;
}

export interface CapacitySku {
  sku_code: string;
  sku_name: string;
  quantity: string;
  rate_per_hour: string;
  hours: string;
}

export interface CapacityLine {
  machine_id: string;
  name: string;
  location: string;
  available_hours: string;
  changeover_hours: string;
  usable_hours: string;
  required_hours: string;
  utilisation_percent: string;
  shortfall_hours: string;
  feasible: boolean;
  sku_count: number;
  alternates_available: string[];
  skus: CapacitySku[];
}

export interface UnmappedSku {
  sku_code: string;
  sku_name: string;
  quantity: string;
  primary_machine_id: string;
  reason: string;
}

export interface FloorAuditRow {
  item_code: string;
  three_month_sales: string;
  policy_floor: string;
  procedure_min_stock: string;
  difference: string;
  matches_policy: boolean;
}

export interface SupplyChainDashboard {
  company_code: string;
  generated_at: string;
  policy: {
    floor_percent: string;
    floor_basis: string;
    floor_source: FloorSource;
    urgency_window_days: number;
    use_net_of_open_po: boolean;
    apply_moq_rounding: boolean;
    include_changeover_in_capacity: boolean;
  };
  procurement: { rows: ProcurementRow[]; totals: ProcurementTotals };
  production: {
    machines: CapacityLine[];
    unmapped_skus: UnmappedSku[];
    totals: {
      machines: number;
      over_capacity: number;
      unmapped_skus: number;
      feasible: boolean;
    };
  };
  floors: {
    rows: FloorAuditRow[];
    totals: { compared: number; divergent: number; no_trend_on_file: number };
  };
  floor_convention: {
    totals: {
      checked: number;
      additive: number;
      subtractive: number;
      indeterminate: number;
    };
    verdict: FloorConvention;
  };
  headline: {
    needs_ordering_today: number;
    missing_lead_times: number;
    lines_over_capacity: number;
    plan_is_feasible: boolean;
    floors_below_policy: number;
  };
}

export interface AlarmPreviewEntry {
  subscription: string;
  sent: boolean;
  reason?: string;
  title?: string;
  body?: string;
  matched?: number;
  recipients?: number;
}

export interface AlarmPreviewResponse {
  subscriptions: AlarmPreviewEntry[];
}
