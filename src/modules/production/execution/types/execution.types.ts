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

export type ClearanceResult = 'YES' | 'NO' | 'NA';

export type ClearanceStatus = 'DRAFT' | 'SUBMITTED' | 'CLEARED' | 'NOT_CLEARED';

export type ChecklistStatus = 'OK' | 'NOT_OK' | 'NA';

export type ChecklistFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type WasteApprovalStatus = 'PENDING' | 'PARTIALLY_APPROVED' | 'FULLY_APPROVED';

export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

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
  line_name: string;
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
// Production Run
// ============================================================================

export interface ProductionRun {
  id: number;
  production_plan: number;
  plan_item_name: string;
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
  created_by: number;
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
// Hourly Production Log
// ============================================================================

export interface ProductionLog {
  id: number;
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
// Machine Breakdown
// ============================================================================

export interface MachineBreakdown {
  id: number;
  machine: number;
  machine_name: string;
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
// Material Usage (Yield)
// ============================================================================

export interface ProductionMaterialUsage {
  id: number;
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
  machine: number;
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

export interface ProductionManpower {
  id: number;
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

export interface LineClearance {
  id: number;
  date: string;
  line: number;
  line_name: string;
  production_plan: number;
  document_id: string;
  status: ClearanceStatus;
  qa_approved: boolean;
  created_by: number;
  created_at: string;
}

export interface ClearanceChecklistItem {
  id: number;
  checkpoint: string;
  sort_order: number;
  result: ClearanceResult;
  remarks: string;
}

export interface LineClearanceDetail extends LineClearance {
  verified_by: number | null;
  qa_approved_by: number | null;
  qa_approved_at: string | null;
  production_supervisor_sign: string;
  production_incharge_sign: string;
  updated_at: string;
  items: ClearanceChecklistItem[];
}

// ============================================================================
// Machine Checklist
// ============================================================================

export interface MachineChecklistEntry {
  id: number;
  machine: number;
  machine_name: string;
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
// Reports / Analytics
// ============================================================================

export interface AnalyticsData {
  total_runs: number;
  total_production: number;
  total_pe_minutes: number;
  total_breakdown_minutes: number;
  total_line_breakdown_minutes: number;
  total_external_breakdown_minutes: number;
  available_time_minutes: number;
  operating_time_minutes: number;
  availability_percent: number;
}

export interface YieldReportData {
  run: ProductionRun;
  materials: ProductionMaterialUsage[];
  machine_runtimes: MachineRuntime[];
  manpower: ProductionManpower[];
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateRunRequest {
  production_plan_id: number;
  line_id: number;
  date: string;
  brand?: string;
  pack?: string;
  sap_order_no?: string;
  rated_speed?: number;
}

export interface UpdateRunRequest {
  brand?: string;
  pack?: string;
  sap_order_no?: string;
  rated_speed?: number;
}

export interface CreateLogRequest {
  time_slot: string;
  time_start: string;
  time_end: string;
  produced_cases?: number;
  machine_status?: MachineStatus;
  recd_minutes?: number;
  breakdown_detail?: string;
  remarks?: string;
}

export interface CreateBreakdownRequest {
  machine_id: number;
  start_time: string;
  end_time?: string;
  breakdown_minutes?: number;
  type: BreakdownType;
  is_unrecovered?: boolean;
  reason: string;
  remarks?: string;
}

export interface UpdateBreakdownRequest {
  machine_id?: number;
  start_time?: string;
  end_time?: string;
  breakdown_minutes?: number;
  type?: BreakdownType;
  is_unrecovered?: boolean;
  reason?: string;
  remarks?: string;
}

export interface CreateMaterialUsageRequest {
  material_code?: string;
  material_name: string;
  opening_qty?: number;
  issued_qty?: number;
  closing_qty?: number;
  uom?: string;
  batch_number?: number;
}

export interface UpdateMaterialUsageRequest {
  material_code?: string;
  material_name?: string;
  opening_qty?: number;
  issued_qty?: number;
  closing_qty?: number;
  uom?: string;
  batch_number?: number;
}

export interface CreateMachineRuntimeRequest {
  machine_id?: number;
  machine_type: MachineType;
  runtime_minutes?: number;
  downtime_minutes?: number;
  remarks?: string;
}

export interface CreateManpowerRequest {
  shift: Shift;
  worker_count?: number;
  supervisor?: string;
  engineer?: string;
  remarks?: string;
}

export interface CreateClearanceRequest {
  date: string;
  line_id: number;
  production_plan_id: number;
  document_id?: string;
}

export interface UpdateClearanceRequest {
  items?: { id: number; result: ClearanceResult; remarks?: string }[];
  production_supervisor_sign?: string;
  production_incharge_sign?: string;
}

export interface ApproveClearanceRequest {
  approved: boolean;
}

export interface CreateChecklistEntryRequest {
  machine_id: number;
  template_id: number;
  date: string;
  status?: ChecklistStatus;
  operator?: string;
  shift_incharge?: string;
  remarks?: string;
}

export interface CreateWasteLogRequest {
  production_run_id: number;
  material_code?: string;
  material_name: string;
  wastage_qty: number;
  uom?: string;
  reason?: string;
}

export interface ApproveWasteRequest {
  sign: string;
  remarks?: string;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

export interface RunsQueryParams {
  date?: string;
  line_id?: number;
  status?: RunStatus;
  production_plan_id?: number;
}

export interface ClearanceQueryParams {
  date?: string;
  line_id?: number;
  status?: ClearanceStatus;
}

export interface ChecklistQueryParams {
  machine_id?: number;
  month?: number;
  year?: number;
  frequency?: ChecklistFrequency;
}

export interface WasteQueryParams {
  run_id?: number;
  approval_status?: WasteApprovalStatus;
}

export interface ReportQueryParams {
  date: string;
  line_id?: number;
}

export interface AnalyticsQueryParams {
  date_from: string;
  date_to: string;
  line_id?: number;
}
