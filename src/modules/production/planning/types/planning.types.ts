// ============================================================================
// Status Types
// ============================================================================

export type PlanStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

export type SAPPostingStatus = 'NOT_POSTED' | 'POSTED' | 'FAILED';

export type WeeklyPlanStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

// ============================================================================
// Dropdown Types (from SAP)
// ============================================================================

export interface ItemDropdown {
  item_code: string;
  item_name: string;
  uom: string;
  item_group: string;
  make_item: boolean;
  purchase_item: boolean;
}

export interface UoMDropdown {
  uom_code: string;
  uom_name: string;
}

export interface WarehouseDropdown {
  warehouse_code: string;
  warehouse_name: string;
}

// ============================================================================
// BOM (Bill of Materials from SAP)
// ============================================================================

export interface BOMComponent {
  component_code: string;
  component_name: string;
  uom: string;
  qty_per_unit: number;
  required_qty: number;
  available_stock: number;
  shortage_qty: number;
  has_shortage: boolean;
}

export interface BOMResponse {
  item_code: string;
  item_name: string;
  planned_qty: number;
  bom_found: boolean;
  has_shortage: boolean;
  components: BOMComponent[];
}

// ============================================================================
// Production Plan
// ============================================================================

export interface ProductionPlan {
  id: number;
  item_code: string;
  item_name: string;
  uom: string;
  warehouse_code: string;
  planned_qty: string;
  completed_qty: string;
  progress_percent: number;
  target_start_date: string;
  due_date: string;
  status: PlanStatus;
  sap_posting_status: SAPPostingStatus;
  sap_doc_num: number | null;
  sap_error_message: string | null;
  created_by: number | null;
  created_at: string;
}

export interface PlanMaterial {
  id: number;
  component_code: string;
  component_name: string;
  required_qty: string;
  uom: string;
  warehouse_code: string;
}

export interface WeeklyPlan {
  id: number;
  week_number: number;
  week_label: string;
  start_date: string;
  end_date: string;
  target_qty: string;
  produced_qty: string;
  progress_percent: number;
  status: WeeklyPlanStatus;
  created_by: number | null;
  created_at: string;
}

export interface ProductionPlanDetail extends ProductionPlan {
  sap_doc_entry: number | null;
  sap_status: string | null;
  branch_id: number | null;
  remarks: string;
  closed_by: number | null;
  closed_at: string | null;
  materials: PlanMaterial[];
  weekly_plans: WeeklyPlan[];
}

// ============================================================================
// Daily Production Entry
// ============================================================================

export interface DailyProductionEntry {
  id: number;
  production_date: string;
  produced_qty: string;
  shift: Shift | null;
  remarks: string;
  recorded_by: number | null;
  created_at: string;
}

export interface WeeklyPlanProgress {
  week_target: string;
  produced_so_far: string;
  remaining: string;
  progress_percent: number;
}

export interface PlanProgress {
  plan_target: string;
  produced_so_far: string;
  progress_percent: number;
}

export interface DailyEntryResponse extends DailyProductionEntry {
  weekly_plan_progress: WeeklyPlanProgress;
  plan_progress: PlanProgress;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateMaterialRequest {
  component_code: string;
  component_name: string;
  required_qty: number;
  uom?: string;
  warehouse_code?: string;
}

export interface CreatePlanRequest {
  item_code: string;
  item_name: string;
  uom?: string;
  warehouse_code?: string;
  planned_qty: number;
  target_start_date: string;
  due_date: string;
  branch_id?: number | null;
  remarks?: string;
  materials?: CreateMaterialRequest[];
}

export interface UpdatePlanRequest {
  item_code?: string;
  item_name?: string;
  uom?: string;
  warehouse_code?: string;
  planned_qty?: number;
  target_start_date?: string;
  due_date?: string;
  branch_id?: number | null;
  remarks?: string;
}

export interface CreateWeeklyPlanRequest {
  week_number: number;
  week_label?: string;
  start_date: string;
  end_date: string;
  target_qty: number;
}

export interface UpdateWeeklyPlanRequest {
  week_label?: string;
  target_qty?: number;
}

export interface CreateDailyEntryRequest {
  production_date: string;
  produced_qty: number;
  shift?: Shift | null;
  remarks?: string;
}

export interface UpdateDailyEntryRequest {
  produced_qty?: number;
  remarks?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface PostToSAPResponse {
  success: boolean;
  plan_id: number;
  sap_doc_entry: number;
  sap_doc_num: number;
  sap_status: string;
  message: string;
}

export interface ClosePlanResponse {
  success: boolean;
  plan_id: number;
  status: string;
  total_produced: string;
  planned_qty: string;
  message: string;
}

// ============================================================================
// Summary / Dashboard
// ============================================================================

export interface PlanSummary {
  total_plans: number;
  total_planned_qty: number;
  total_produced_qty: number;
  overall_progress_percent: number;
  status_breakdown: Record<PlanStatus, number>;
  sap_posting_breakdown: Record<SAPPostingStatus, number>;
}
