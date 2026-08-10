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

/* ── The daily operating loop ─────────────────────────────────────────────── */

export type RunStatus = 'GENERATED' | 'REVIEWED' | 'PUBLISHED' | 'BLOCKED';
export type CoverVerdict = 'RED' | 'AMBER' | 'GREEN' | 'UNKNOWN';
export type VerdictOutcome = 'REAL' | 'WRONG_DATA' | 'ALREADY_HANDLED';

export interface RowVerdict {
  outcome: VerdictOutcome;
  note: string;
  supplier_promised_date: string | null;
  recorded_by: string;
  recorded_at: string;
}

/** One material in one run. Every intermediate number is present so the row can
 *  be checked on paper — which is the whole point of this method. */
export interface DailyRunRow {
  id: number;
  sku_code: string;
  material_code: string;
  material_name: string;
  material_type: string;
  supplier_name: string;
  unit: string;
  units_per_day: string;
  quantity_per_unit: string;
  consumption_per_day: string;
  on_hand: string;
  committed: string;
  free_stock: string;
  days_of_cover: string;
  cover_calendar_days: string;
  lead_time_days: number | null;
  lead_time_source: string;
  lead_time_samples: number;
  stockout_date: string | null;
  order_by_date: string | null;
  days_late: number;
  verdict: CoverVerdict;
  owner: string;
  row_verdict: RowVerdict | null;
}

export interface DataQualityIssue {
  id: number;
  code: string;
  sku_code: string;
  item_code: string;
  message: string;
  blocking: boolean;
}

export interface DailyRun {
  id: number;
  company_code: string;
  run_date: string;
  status: RunStatus;
  red_count: number;
  amber_count: number;
  green_count: number;
  unknown_count: number;
  issue_count: number;
  comment: string;
  parameters_snapshot: Record<string, unknown>;
  is_credible: boolean;
  generated_at: string;
  reviewed_by: string;
  reviewed_at: string | null;
  published_by: string;
  published_at: string | null;
  recipients: number;
}

export interface DailyRunPayload {
  run: DailyRun;
  rows: DailyRunRow[];
  issues: DataQualityIssue[];
  verdict_progress: {
    red_rows: number;
    verdicts_recorded: number;
    outstanding: number;
    complete: boolean;
  };
  unassigned_red_rows: number;
  message?: { title: string; body: string; recipients: number };
}

export interface WeeklyReview {
  from: string;
  to: string;
  runs: number;
  weeks: {
    week_starting: string;
    total: number;
    real: number;
    wrong_data: number;
    already_handled: number;
    real_share_percent: number;
  }[];
  totals: {
    verdicts: number;
    real: number;
    wrong_data: number;
    already_handled: number;
    real_share_percent: number;
  };
  recommendation: string;
}
