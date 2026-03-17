// ============================================================================
// Status Types
// ============================================================================

export type RunStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

export type MachineStatus = 'RUNNING' | 'IDLE' | 'BREAKDOWN' | 'CHANGEOVER';

export type MachineType =
  | 'FILLER'
  | 'CAPPER'
  | 'CONVEYOR'
  | 'LABELER'
  | 'CODING'
  | 'SHRINK_PACK'
  | 'STICKER_LABELER'
  | 'TAPPING_MACHINE';

export type BreakdownType = 'LINE' | 'EXTERNAL';

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
  ItemName: string;
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
  brand: string;
  pack: string;
  sap_order_no: string;
  rated_speed: string;
  total_production: number;
  total_breakdown_time: number;
  status: RunStatus;
  created_by: number | null;
  created_at: string;
}

export interface ProductionRunDetail extends ProductionRun {
  total_minutes_pe: number;
  total_minutes_me: number;
  line_breakdown_time: number;
  external_breakdown_time: number;
  unrecorded_time: number;
  updated_at: string;
  logs: ProductionLog[];
  breakdowns: MachineBreakdown[];
}

// ============================================================================
// Hourly Production Logs
// ============================================================================

export interface ProductionLog {
  id: number;
  production_run: number;
  time_slot: string;
  time_start: string;
  time_end: string;
  produced_cases: number;
  machine_status: MachineStatus;
  recd_minutes: number;
  breakdown_detail: string;
  remarks: string;
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
  start_time: string;
  end_time: string;
  breakdown_minutes: number;
  type: BreakdownType;
  is_unrecovered: boolean;
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
  batch_number: number;
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
  date: string;
  line: number;
  line_name?: string;
  sap_doc_entry: number | null;
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
  material_code: string;
  material_name: string;
  wastage_qty: string;
  uom: string;
  reason: string;
  engineer_sign: string;
  engineer_signed_at: string | null;
  am_sign: string;
  am_signed_at: string | null;
  store_sign: string;
  store_signed_at: string | null;
  hod_sign: string;
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
  created_at: string;
}

export interface ResourceWater {
  id: number;
  production_run: number;
  description: string;
  volume_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  created_at: string;
}

export interface ResourceGas {
  id: number;
  production_run: number;
  description: string;
  qty_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  created_at: string;
}

export interface ResourceCompressedAir {
  id: number;
  production_run: number;
  description: string;
  units_consumed: string;
  rate_per_unit: string;
  total_cost: string;
  created_at: string;
}

export interface ResourceLabour {
  id: number;
  production_run: number;
  worker_name: string;
  hours_worked: string;
  rate_per_hour: string;
  total_cost: string;
  created_at: string;
}

export interface ResourceMachineCost {
  id: number;
  production_run: number;
  machine_name: string;
  hours_used: string;
  rate_per_hour: string;
  total_cost: string;
  created_at: string;
}

export interface ResourceOverhead {
  id: number;
  production_run: number;
  expense_name: string;
  amount: string;
  created_at: string;
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
  sap_doc_entry: number;
  line_id: number;
  date: string;
  brand: string;
  pack: string;
  sap_order_no: string;
  rated_speed?: string;
}

export interface UpdateRunRequest {
  line_id?: number;
  brand?: string;
  pack?: string;
  rated_speed?: string;
}

export interface CreateLogRequest {
  time_slot: string;
  time_start: string;
  time_end: string;
  produced_cases: number;
  machine_status: MachineStatus;
  recd_minutes: number;
  breakdown_detail?: string;
  remarks?: string;
}

export interface CreateBreakdownRequest {
  machine_id: number;
  start_time: string;
  end_time: string;
  breakdown_minutes: number;
  type: BreakdownType;
  reason: string;
  remarks?: string;
  is_unrecovered?: boolean;
}

export interface CreateMaterialUsageRequest {
  material_code: string;
  material_name: string;
  opening_qty: string;
  issued_qty: string;
  closing_qty: string;
  uom: string;
  batch_number: number;
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
  date: string;
  line_id: number;
  sap_doc_entry?: number;
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
  worker_name: string;
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
// Filter/Query Params
// ============================================================================

export interface AnalyticsParams {
  date_from?: string;
  date_to?: string;
  line?: number;
}
