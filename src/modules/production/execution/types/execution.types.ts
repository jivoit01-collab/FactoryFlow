// ============================================================================
// Status Types
// ============================================================================

export type RunStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

export type LiveStatus = 'DRAFT' | 'RUNNING' | 'BREAKDOWN' | 'STOPPED' | 'COMPLETED';

export type MachineType =
  | 'FILLER'
  | 'CAPPER'
  | 'CONVEYOR'
  | 'LABELER'
  | 'CODING'
  | 'SHRINK_PACK'
  | 'STICKER_LABELER'
  | 'TAPPING_MACHINE';

export type ChecklistFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type ChecklistStatus = 'OK' | 'NOT_OK' | 'NA';

export type ClearanceResult = 'YES' | 'NO' | 'NA';

export type ClearanceStatus = 'DRAFT' | 'SUBMITTED' | 'CLEARED' | 'NOT_CLEARED';

export type WasteApprovalStatus = 'PENDING' | 'PARTIALLY_APPROVED' | 'FULLY_APPROVED';

export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export type QCResult = 'PASS' | 'FAIL' | 'NA';

export type FinalQCResult = 'PASS' | 'FAIL' | 'CONDITIONAL';

// ============================================================================
// Master Data
// ============================================================================

export interface ProductionLine {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: number;
  name: string;
  machine_type: MachineType;
  line: number;
  line_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: number;
  machine_type: MachineType;
  task: string;
  frequency: ChecklistFrequency;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SAP Production Orders
// ============================================================================

export interface SAPProductionOrder {
  DocEntry: number;
  DocNum: number;
  ItemCode: string;
  ProdName: string;
  PlannedQty: number;
  CmpltQty: number;
  RjctQty: number;
  RemainingQty: number;
  StartDate: string;
  DueDate: string;
  Warehouse: string;
  Status: string;
}

export interface SAPOrderComponent {
  ItemCode: string;
  ItemName: string;
  PlannedQty: number;
  IssuedQty: number;
  Warehouse: string;
  UomCode: string;
}

export interface SAPOrderDetail {
  header: SAPProductionOrder;
  components: SAPOrderComponent[];
}

export interface SAPItem {
  ItemCode: string;
  ItemName: string;
  UomCode: string;
}

export interface SAPBOMComponent {
  ItemCode: string;
  ItemName: string;
  PlannedQty: number;
  IssuedQty?: number;
  UomCode: string;
}

export interface SAPBOMResponse {
  item_code: string;
  component_count: number;
  components: SAPBOMComponent[];
}

// ============================================================================
// Production Runs
// ============================================================================

export interface ProductionRun {
  id: number;
  sap_doc_entry: number | null;
  run_number: number;
  date: string;
  line: number;
  line_name: string;
  product: string;
  rated_speed: string;
  total_production: string;
  total_running_minutes: number;
  total_breakdown_time: number;
  rejected_qty: string;
  reworked_qty: string;
  status: RunStatus;
  live_status: LiveStatus;
  created_by: number | null;
  created_at: string;
}

export interface ProductionRunDetail extends ProductionRun {
  labour_count: number;
  other_manpower_count: number;
  supervisor: string;
  operators: string;
  machine_ids: number[];
  updated_at: string;
  segments: ProductionSegment[];
  breakdowns: MachineBreakdown[];
}

// ============================================================================
// Production Segments
// ============================================================================

export interface ProductionSegment {
  id: number;
  start_time: string;
  end_time: string | null;
  produced_cases: string;
  is_active: boolean;
  duration_minutes: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateSegmentRequest {
  remarks?: string;
  produced_cases?: string;
}

export interface UpdateBreakdownRemarksRequest {
  remarks: string;
}

// ============================================================================
// Breakdown Categories
// ============================================================================

export interface BreakdownCategory {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Machine Breakdowns
// ============================================================================

export interface MachineBreakdown {
  id: number;
  production_run: number;
  machine: number;
  machine_name?: string;
  breakdown_category: number | null;
  breakdown_category_name: string;
  start_time: string;
  end_time: string;
  breakdown_minutes: number;
  is_unrecovered: boolean;
  is_active: boolean;
  reason: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Material Usage
// ============================================================================

export interface MaterialUsage {
  id: number;
  production_run: number;
  material_code: string;
  material_name: string;
  opening_qty: string;
  issued_qty: string;
  closing_qty: string;
  wastage_qty: string;
  uom: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Machine Runtime
// ============================================================================

export interface MachineRuntime {
  id: number;
  production_run: number;
  machine: number | null;
  machine_type: MachineType;
  runtime_minutes: number;
  downtime_minutes: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Manpower
// ============================================================================

export interface Manpower {
  id: number;
  production_run: number;
  shift: Shift;
  worker_count: number;
  supervisor: string;
  engineer: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Line Clearance
// ============================================================================

export interface LineClearanceItem {
  id: number;
  checkpoint: string;
  sort_order: number;
  result: ClearanceResult;
  remarks: string;
}

export interface LineClearance {
  id: number;
  production_run: number | null;
  run_number: number | null;
  date: string;
  line: number;
  line_name?: string;
  document_id: string;
  status: ClearanceStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface LineClearanceDetail extends LineClearance {
  verified_by: number | null;
  qa_approved: boolean;
  qa_approved_by: number | null;
  qa_approved_at: string | null;
  production_supervisor_sign: string;
  production_incharge_sign: string;
  items: LineClearanceItem[];
}

// ============================================================================
// Machine Checklists
// ============================================================================

export interface MachineChecklistEntry {
  id: number;
  machine: number;
  machine_name?: string;
  machine_type: MachineType;
  date: string;
  month: number;
  year: number;
  template: number;
  task_description: string;
  frequency: ChecklistFrequency;
  status: ChecklistStatus;
  operator: string;
  shift_incharge: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Waste Management
// ============================================================================

export interface WasteLog {
  id: number;
  production_run: number;
  run_number?: number;
  run_date?: string;
  run_product?: string;
  material_code: string;
  material_name: string;
  wastage_qty: string;
  uom: string;
  reason: string;
  engineer_sign: string;
  engineer_signed_by: number | null;
  engineer_signed_at: string | null;
  am_sign: string;
  am_signed_by: number | null;
  am_signed_at: string | null;
  store_sign: string;
  store_signed_by: number | null;
  store_signed_at: string | null;
  hod_sign: string;
  hod_signed_by: number | null;
  hod_signed_at: string | null;
  wastage_approval_status: WasteApprovalStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Resources
// ============================================================================

export interface ResourceElectricity {
  id: number;
  production_run: number;
  description: string;
  units_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceWater {
  id: number;
  production_run: number;
  description: string;
  volume_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceGas {
  id: number;
  production_run: number;
  description: string;
  qty_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceCompressedAir {
  id: number;
  production_run: number;
  description: string;
  units_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceLabour {
  id: number;
  production_run: number;
  description: string;
  worker_count: number;
  hours_worked: string;
  rate_per_hour: string;
  total_cost: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceMachineCost {
  id: number;
  production_run: number;
  machine_name: string;
  hours_used: string;
  rate_per_hour: string;
  total_cost: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceOverhead {
  id: number;
  production_run: number;
  expense_name: string;
  amount: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Cost Summary
// ============================================================================

export interface ProductionRunCost {
  id: number;
  raw_material_cost: string;
  labour_cost: string;
  machine_cost: string;
  electricity_cost: string;
  water_cost: string;
  gas_cost: string;
  compressed_air_cost: string;
  overhead_cost: string;
  total_cost: string;
  produced_qty: string;
  per_unit_cost: string;
  calculated_at: string;
}

// ============================================================================
// QC Checks
// ============================================================================

export interface InProcessQCCheck {
  id: number;
  production_run: number;
  checked_at: string;
  parameter: string;
  acceptable_min: string | null;
  acceptable_max: string | null;
  actual_value: string | null;
  result: QCResult;
  remarks: string;
  checked_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FinalQCParameter {
  name: string;
  expected: string;
  actual: string;
  result: QCResult;
}

export interface FinalQCCheck {
  id: number;
  production_run: number;
  checked_at: string;
  overall_result: FinalQCResult;
  parameters: FinalQCParameter[];
  remarks: string;
  checked_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Reports & Analytics
// ============================================================================

export interface DailyProductionReport {
  date: string;
  runs: ProductionRun[];
  total_production: number;
  total_breakdown_time: number;
}

export interface YieldReport {
  run: ProductionRun;
  materials: MaterialUsage[];
  total_wastage: string;
}

export interface OEERunData {
  run_id: number;
  run_number: number;
  date: string;
  line: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface OEEAnalytics {
  per_run_oee: OEERunData[];
}

export interface DowntimeReason {
  reason: string;
  count: number;
  total_minutes: number;
}

export interface DowntimeAnalytics {
  breakdowns: DowntimeReason[];
  total_count: number;
  total_minutes: number;
}

export interface WasteMaterialSummary {
  material_name: string;
  uom: string;
  total_waste: string;
  count: number;
}

export interface WasteStatusSummary {
  wastage_approval_status: WasteApprovalStatus;
  count: number;
}

export interface WasteAnalytics {
  by_material: WasteMaterialSummary[];
  by_approval_status: WasteStatusSummary[];
  total_waste_logs: number;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateLineRequest {
  name: string;
  description?: string;
}

export interface CreateMachineRequest {
  name: string;
  machine_type: MachineType;
  line_id: number;
}

export interface CreateTemplateRequest {
  machine_type: MachineType;
  task: string;
  frequency: ChecklistFrequency;
  sort_order: number;
}

export interface CreateRunRequest {
  sap_doc_entry?: number | null;
  line_id: number;
  date: string;
  product?: string;
  rated_speed?: string;
  machine_ids?: number[];
  labour_count?: number;
  other_manpower_count?: number;
  supervisor?: string;
  operators?: string;
  materials?: MaterialInput[];
}

export interface UpdateRunRequest {
  product?: string;
  rated_speed?: string;
  machine_ids?: number[];
  labour_count?: number;
  other_manpower_count?: number;
  supervisor?: string;
  operators?: string;
}

export interface AddBreakdownRequest {
  breakdown_category_id: number;
  machine_id: number;
  reason: string;
  produced_cases?: string;
  remarks?: string;
}

export interface ResolveBreakdownRequest {
  action: 'start_production' | 'stop_production' | 'stop_unrecovered';
}

export interface StopProductionRequest {
  produced_cases: string;
  remarks?: string;
}

export interface CompleteRunRequest {
  total_production: string;
}

export interface CreateBreakdownCategoryRequest {
  name: string;
}

export interface CreateMaterialUsageRequest {
  material_code: string;
  material_name: string;
  opening_qty: string;
  issued_qty: string;
  closing_qty?: string;
  uom: string;
}

export interface MaterialInput {
  material_code: string;
  material_name: string;
  opening_qty: string;
  issued_qty: string;
  uom: string;
}

export interface CreateRuntimeRequest {
  machine_id: number;
  machine_type: MachineType;
  runtime_minutes: number;
  downtime_minutes: number;
  remarks?: string;
}

export interface CreateManpowerRequest {
  shift: Shift;
  worker_count: number;
  supervisor: string;
  engineer: string;
  remarks?: string;
}

export interface CreateLineClearanceRequest {
  production_run_id?: number;
  date: string;
  line_id: number;
}

export interface UpdateLineClearanceRequest {
  items?: { id: number; result: ClearanceResult; remarks?: string }[];
  production_supervisor_sign?: string;
  production_incharge_sign?: string;
}

export interface CreateChecklistEntryRequest {
  machine_id: number;
  machine_type: MachineType;
  date: string;
  template_id: number;
  task_description: string;
  frequency: ChecklistFrequency;
  status: ChecklistStatus;
  operator?: string;
  shift_incharge?: string;
  remarks?: string;
}

export interface BulkChecklistRequest {
  entries: CreateChecklistEntryRequest[];
}

export interface CreateWasteLogRequest {
  production_run_id: number;
  material_code: string;
  material_name: string;
  wastage_qty: string;
  uom: string;
  reason: string;
}

export interface WasteApprovalRequest {
  sign: string;
}

export interface CreateElectricityRequest {
  description: string;
  units_consumed: string;
  rate_per_unit: string;
}

export interface CreateWaterRequest {
  description: string;
  volume_consumed: string;
  rate_per_unit: string;
}

export interface CreateGasRequest {
  description: string;
  qty_consumed: string;
  rate_per_unit: string;
}

export interface CreateCompressedAirRequest {
  description: string;
  units_consumed: string;
  rate_per_unit: string;
}

export interface CreateLabourRequest {
  description?: string;
  worker_count: number;
  hours_worked: string;
  rate_per_hour: string;
}

export interface CreateMachineCostRequest {
  machine_name: string;
  hours_used: string;
  rate_per_hour: string;
}

export interface CreateOverheadRequest {
  expense_name: string;
  amount: string;
}

export interface CreateInProcessQCRequest {
  checked_at: string;
  parameter: string;
  acceptable_min?: string;
  acceptable_max?: string;
  actual_value?: string;
  result: QCResult;
  remarks?: string;
}

export interface CreateFinalQCRequest {
  checked_at: string;
  overall_result: FinalQCResult;
  parameters: FinalQCParameter[];
  remarks?: string;
}

export interface ApproveClearanceRequest {
  approved: boolean;
  remarks?: string;
}

// ============================================================================
// Phase 1 Reports
// ============================================================================

export interface DailyResourceData {
  date: string;
  total_production: number;
  electricity_units: number;
  electricity_cost: number;
  water_volume: number;
  water_cost: number;
  gas_units: number;
  gas_cost: number;
  compressed_air_units: number;
  compressed_air_cost: number;
  labour_hours: number;
  labour_cost: number;
  waste_qty: number;
  total_resource_cost: number;
  cost_per_case: number;
}

export interface ResourceConsumptionReport {
  daily_data: DailyResourceData[];
  summary: {
    total_days: number;
    total_production: number;
    grand_total_cost: number;
    avg_cost_per_case: number;
  };
}

export interface MonthSummary {
  month: number;
  month_name: string;
  total_runs: number;
  total_production: number;
  avg_oee: number;
  total_cost: number;
  cost_per_unit: number;
  total_waste: number;
  electricity_cost: number;
  water_cost: number;
  gas_cost: number;
  compressed_air_cost: number;
  labour_cost: number;
  machine_cost: number;
  overhead_cost: number;
  total_breakdown_minutes: number;
}

export interface MonthlySummaryReport {
  year: number;
  months: MonthSummary[];
  annual_summary: {
    total_runs: number;
    total_production: number;
    avg_oee: number;
    grand_total_cost: number;
  };
}

export interface PlanVsProductionItem {
  sap_doc_entry: number;
  sap_doc_num: string;
  item_code: string;
  product_name: string;
  planned_qty: number;
  actual_production: number;
  variance: number;
  achievement_pct: number;
  status: 'on_track' | 'behind' | 'exceeded';
}

export interface PlanVsProductionReport {
  items: PlanVsProductionItem[];
  summary: {
    total_orders: number;
    avg_achievement_pct: number;
    total_planned: number;
    total_actual: number;
  };
}

export interface ProcurementItem {
  item_code: string;
  item_name: string;
  uom: string;
  bom_planned_qty: number;
  procured_qty: number;
  consumed_qty: number;
  procurement_fulfillment_pct: number;
  excess_shortage: number;
  consumption_vs_planned_pct: number;
  status: 'fulfilled' | 'shortage' | 'excess';
}

export interface ProcurementVsPlannedReport {
  sap_doc_entry: number;
  sap_doc_num: string;
  product_name: string;
  items: ProcurementItem[];
  summary: {
    total_items: number;
    fully_fulfilled: number;
    shortage_items: number;
  };
}

// ============================================================================
// Phase 2 Reports
// ============================================================================

// OEE Trend
export interface OEETrendPoint {
  period: string;
  avg_oee: number;
  avg_availability: number;
  avg_performance: number;
  avg_quality: number;
  run_count: number;
}

export interface OEEByLine {
  line: string;
  avg_oee: number;
  min_oee: number;
  max_oee: number;
  run_count: number;
}

export interface OEERunDetail {
  run_id: number;
  run_number: number;
  date: string;
  line: string;
  line_id: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface OEETrendReport {
  trend: OEETrendPoint[];
  by_line: OEEByLine[];
  per_run: OEERunDetail[];
  summary: {
    total_runs: number;
    avg_oee: number;
    group_by: string;
  };
}

// Downtime Pareto
export interface DowntimeParetoItem {
  category: string;
  count: number;
  total_minutes: number;
  percentage: number;
  cumulative_pct: number;
}

export interface DowntimeByMachine {
  machine: string;
  count: number;
  total_minutes: number;
}

export interface DowntimeTrendPoint {
  date: string;
  count: number;
  total_minutes: number;
}

export interface DowntimeParetoReport {
  pareto: DowntimeParetoItem[];
  by_machine: DowntimeByMachine[];
  trend: DowntimeTrendPoint[];
  summary: {
    total_breakdowns: number;
    total_breakdown_minutes: number;
    total_running_minutes: number;
    mtbf_minutes: number;
    mttr_minutes: number;
  };
}

// Cost Analysis
export interface CostRunDetail {
  run_id: number;
  run_number: number;
  date: string;
  line: string;
  product: string;
  produced_qty: number;
  raw_material_cost: number;
  labour_cost: number;
  machine_cost: number;
  electricity_cost: number;
  water_cost: number;
  gas_cost: number;
  compressed_air_cost: number;
  overhead_cost: number;
  total_cost: number;
  per_unit_cost: number;
}

export interface CostTrendPoint {
  date: string;
  total_cost: number;
  production: number;
  per_unit_cost: number;
  run_count: number;
}

export interface CostByLine {
  line: string;
  total_cost: number;
  production: number;
  avg_per_unit: number;
  run_count: number;
}

export interface CostDistributionItem {
  amount: number;
  percentage: number;
}

export interface CostAnalysisReport {
  per_run: CostRunDetail[];
  trend: CostTrendPoint[];
  by_line: CostByLine[];
  cost_distribution: Record<string, CostDistributionItem>;
  summary: {
    total_cost: number;
    avg_per_unit: number;
    total_production: number;
    run_count: number;
  };
}

// Waste Trend
export interface WasteMaterialDetail {
  material_name: string;
  uom: string;
  total_qty: number;
  count: number;
}

export interface WasteByReason {
  reason: string;
  total_qty: number;
  count: number;
}

export interface WasteTrendPoint {
  date: string;
  total_qty: number;
  count: number;
}

export interface WasteByStatus {
  status: string;
  count: number;
  total_qty: number;
}

export interface WasteTrendReport {
  by_material: WasteMaterialDetail[];
  by_reason: WasteByReason[];
  trend: WasteTrendPoint[];
  by_approval_status: WasteByStatus[];
  summary: {
    total_waste_qty: number;
    total_waste_logs: number;
    unique_materials: number;
    approval_rate: number;
    waste_vs_production_pct: number;
    total_production: number;
  };
}

// ============================================================================
// Filter/Query Params
// ============================================================================

export interface AnalyticsParams {
  date_from?: string;
  date_to?: string;
  line?: number;
}
