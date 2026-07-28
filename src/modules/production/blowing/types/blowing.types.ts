// Blowing module types — mirror of the `blowing` Django app serializers.

export type BlowingRunStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
export type LiveStatus = 'DRAFT' | 'RUNNING' | 'BREAKDOWN' | 'STOPPED' | 'COMPLETED';
export type WarehouseApprovalStatus =
  | 'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';

export interface BlowingSegment {
  id: number;
  start_time: string;
  end_time: string | null;
  produced_pcs: string;
  is_active: boolean;
  duration_minutes: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface BlowingBreakdown {
  id: number;
  machine: number | null;
  machine_name: string | null;
  breakdown_category: number | null;
  breakdown_category_name: string;
  start_time: string;
  end_time: string | null;
  breakdown_minutes: number;
  is_active: boolean;
  is_unrecovered: boolean;
  reason: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface BlowingBreakdownCategory {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface StopProductionRequest { produced_pcs: string; remarks?: string }
export interface AddBreakdownRequest {
  breakdown_category_id?: number | null;
  machine_id?: number | null;
  reason: string;
  produced_pcs?: string;
  remarks?: string;
}
export interface AddManualSegmentRequest {
  start_time: string;
  end_time: string;
  produced_pcs?: string;
  remarks?: string;
}
export interface AddManualBreakdownRequest {
  start_time: string;
  end_time: string;
  breakdown_category_id?: number | null;
  machine_id?: number | null;
  reason: string;
  remarks?: string;
}
export interface ResolveBreakdownRequest {
  action: 'start_production' | 'stop_production' | 'stop_unrecovered';
}
export interface UpdateSegmentRequest { produced_pcs?: string; remarks?: string }
export interface CompleteRunRequest {
  total_counter_production: number;
  rejection_pcs?: number;
  operator_count?: number;
  contract_labour_count?: number;
  own_labour_count?: number;
  machine_start_reading?: number | string | null;
  machine_stop_reading?: number | string | null;
  utility_units?: number | string;
  scrap_carton_value?: number | string;
}
export interface CreateBreakdownCategoryRequest { name: string }

export interface AuditChange { old: unknown; new: unknown }
export interface BlowingAuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: 'CREATE' | 'UPDATE';
  changes: Record<string, AuditChange>;
  user_name: string;
  created_at: string;
}

export interface BlowingMachine {
  id: number;
  company_code: string;
  name: string;
  heads: number | null;
  sap_warehouse_code: string;
  depreciation_per_day: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMachineRequest {
  name: string;
  heads?: number | null;
  sap_warehouse_code?: string;
  depreciation_per_day?: number | string;
}

export interface PreformSpec {
  id: number;
  make: string;
  gram: string;
  preforms_per_box: number;
  sap_item_code: string;
  sap_item_name: string;
  bottle_weight_g: string | null;
  bottles_per_kg: string | null;
  mould_cost: string | null;
  mould_life_bottles: number | null;
  std_make_cost_per_bottle: string | null;
  std_reject_pct: string | null;
  std_units_per_bottle: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePreformSpecRequest {
  make: string;
  gram: number | string;
  preforms_per_box: number;
  sap_item_code?: string;
  sap_item_name?: string;
  bottle_weight_g?: number | string | null;
  bottles_per_kg?: number | string | null;
  mould_cost?: number | string | null;
  mould_life_bottles?: number | null;
  std_make_cost_per_bottle?: number | string | null;
  std_reject_pct?: number | string | null;
  std_units_per_bottle?: number | string | null;
}

export interface BlowingRateConfig {
  id: number;
  effective_from: string;
  operator_rate_per_day: string;
  labour_rate_per_day: string;
  electricity_rate_per_unit: string;
  preform_rate_per_kg: string;
  scrap_rate_per_bottle: string;
  packing_rate_per_bottle: string;
  maintenance_per_day: string;
  factory_overhead_per_day: string;
  qa_cost_per_day: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRateConfigRequest {
  effective_from: string;
  operator_rate_per_day: number | string;
  labour_rate_per_day: number | string;
  electricity_rate_per_unit: number | string;
  preform_rate_per_kg: number | string;
  scrap_rate_per_bottle: number | string;
  packing_rate_per_bottle: number | string;
  maintenance_per_day?: number | string;
  factory_overhead_per_day?: number | string;
  qa_cost_per_day?: number | string;
}

export interface BlowingRunCost {
  operator_cost: string;
  labour_cost: string;
  wastage_cost: string;
  electricity_cost: string;
  total_cost: string;
  scrap_bottle_value: string;
  scrap_total: string;
  net_cost: string;
  blowing_cost_per_bottle: string;
  packing_cost: string;
  per_bottle_cost: string;
  // fully-loaded make cost (Phase 1)
  good_bottles: number;
  preform_cost: string;
  mould_amortization: string;
  machine_depreciation: string;
  maintenance_cost: string;
  overhead_cost: string;
  qa_cost: string;
  variable_cost_total: string;
  fixed_cost_total: string;
  fully_loaded_cost: string;
  variable_cost_per_bottle: string;
  make_cost_per_bottle: string;
  calculated_at: string;
}

export interface BottleBuyPrice {
  id: number;
  preform_spec: number;
  preform_make: string;
  preform_gram: string;
  supplier_name: string;
  effective_from: string;
  buy_price: string;
  freight_per_bottle: string;
  duties_per_bottle: string;
  carrying_pct_annual: string;
  inventory_days: number;
  qa_allowance_pct: string;
  risk_premium_per_bottle: string;
  landed_cost_per_bottle: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBuyPriceRequest {
  preform_spec_id: number;
  supplier_name?: string;
  effective_from: string;
  buy_price: number | string;
  freight_per_bottle?: number | string;
  duties_per_bottle?: number | string;
  carrying_pct_annual?: number | string;
  inventory_days?: number;
  qa_allowance_pct?: number | string;
  risk_premium_per_bottle?: number | string;
}

export type MakeVsBuyVerdict = 'MAKE' | 'BUY' | 'NO_BUY_PRICE';

export interface MakeVsBuyRow {
  preform_spec_id: number;
  make: string;
  gram: number;
  good_bottles: number;
  make_cost_per_bottle: number;
  variable_cost_per_bottle: number;
  preform_per_bottle: number;
  electricity_per_bottle: number;
  fixed_cost_total: number;
  buy_landed_per_bottle: number | null;
  supplier: string;
  delta_per_bottle: number | null;
  breakeven_bottles: number | null;
  period_savings: number | null;
  verdict: MakeVsBuyVerdict;
}

export interface MakeVsBuyReport {
  date_from: string;
  date_to: string;
  rows: MakeVsBuyRow[];
  totals: {
    good_bottles: number;
    make_cost: number;
    buy_cost: number;
    period_savings: number;
    verdict: MakeVsBuyVerdict;
  };
}

export interface BlowingRun {
  id: number;
  run_number: number;
  date: string;
  machine: number;
  machine_name: string;
  preform_spec: number;
  preform_make: string;
  preform_gram: string;
  preform_boxes_used: string;
  preform_used_g: string;
  total_units: string;
  total_counter_production: number;
  rejection_pcs: number;
  rejection_pct: string;
  total_manpower: number;
  status: BlowingRunStatus;
  live_status: LiveStatus;
  warehouse_approval_status: WarehouseApprovalStatus;
  net_cost: string | null;
  per_bottle_cost: string | null;
  created_at: string;
}

export interface BlowingRunDetail extends BlowingRun {
  live_status: LiveStatus;
  warehouse_approval_status: WarehouseApprovalStatus;
  total_running_minutes: number;
  total_breakdown_time: number;
  segments: BlowingSegment[];
  breakdowns: BlowingBreakdown[];
  machine_start_reading: string | null;
  machine_stop_reading: string | null;
  machine_units: string;
  utility_units: string;
  operator_count: number;
  contract_labour_count: number;
  own_labour_count: number;
  scrap_carton_value: string;
  remarks: string;
  rate_config: number | null;
  operator_rate_per_day: string;
  labour_rate_per_day: string;
  electricity_rate_per_unit: string;
  preform_rate_per_kg: string;
  scrap_rate_per_bottle: string;
  packing_rate_per_bottle: string;
  sap_preform_item_code: string;
  sap_bottle_item_code: string;
  cost: BlowingRunCost | null;
  updated_at: string;
}

export interface CreateRunRequest {
  date: string;
  machine_id: number;
  preform_spec_id: number;
  preform_boxes_used?: number | string;
  machine_start_reading?: number | string | null;
  machine_stop_reading?: number | string | null;
  utility_units?: number | string;
  total_counter_production?: number;
  rejection_pcs?: number;
  operator_count?: number;
  contract_labour_count?: number;
  own_labour_count?: number;
  scrap_carton_value?: number | string;
  remarks?: string;
  status?: BlowingRunStatus;
}

export type UpdateRunRequest = Partial<CreateRunRequest>;

export interface RunListParams {
  date_from?: string;
  date_to?: string;
  machine_id?: number;
  status?: BlowingRunStatus;
}

export interface SAPItem {
  ItemCode: string;
  ItemName: string;
  InvntryUom?: string;
}

// --- Reports -----------------------------------------------------------------
export interface DailyReportTotals {
  total_production: number;
  total_rejection: number;
  total_preform_g: number;
  total_units: number;
  operator_cost: number;
  labour_cost: number;
  wastage_cost: number;
  electricity_cost: number;
  total_cost: number;
  scrap_total: number;
  net_cost: number;
  avg_per_bottle_cost: number;
  run_count: number;
}

export interface DailyReport {
  date: string;
  totals: DailyReportTotals;
  by_machine: Array<{
    machine_id: number;
    machine_name: string;
    total_production: number;
    total_rejection: number;
    net_cost: number;
  }>;
  by_preform: Array<{
    make: string;
    gram: number;
    total_production: number;
    total_rejection: number;
    net_cost: number;
  }>;
}

export interface VarianceCell {
  actual: number;
  std: number | null;
  variance: number | null;
  variance_pct: number | null;
  breach: boolean;
}

export interface VarianceRow {
  run_id: number;
  date: string;
  run_number: number;
  machine_name: string;
  preform: string;
  make_cost: VarianceCell;
  reject_pct: VarianceCell;
  units_per_bottle: VarianceCell;
  any_breach: boolean;
}

export interface VarianceReport {
  date_from: string;
  date_to: string;
  rows: VarianceRow[];
  summary: { runs: number; breaches: number };
}

export interface MonthlyReport {
  year: number;
  month: number;
  days_in_month: number;
  totals: DailyReportTotals;
  daywise: Array<{
    date: string;
    total_production: number;
    total_rejection: number;
    total_units: number;
    net_cost: number;
    avg_per_bottle_cost: number;
  }>;
}
