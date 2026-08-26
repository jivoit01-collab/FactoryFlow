export type AssetStatus =
  | 'RUNNING'
  | 'IDLE'
  | 'BREAKDOWN'
  | 'UNDER_PM'
  | 'UNDER_REPAIR'
  | 'RETIRED';

export type AssetHierarchyLevel = 'PLANT' | 'AREA' | 'LINE' | 'MACHINE' | 'COMPONENT' | 'UTILITY';

export type MaintenancePriority = 'NORMAL' | 'HIGH' | 'CRITICAL';

export type WorkType =
  | 'COMPLAINT'
  | 'BREAKDOWN'
  | 'GENERAL'
  | 'PREVENTIVE'
  | 'INSPECTION'
  | 'CALIBRATION'
  | 'AMC_VENDOR'
  | 'PROJECT';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_SPARE'
  | 'WAITING_VENDOR'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'APPROVED'
  | 'CLOSED';

export type WorkImpact = 'NO_IMPACT' | 'DEGRADED' | 'STOPPAGE' | 'SAFETY_RISK';

export type WorkOrderPhotoType = 'BEFORE' | 'AFTER' | 'GENERAL';

export type SpareRequestStatus =
  | 'REQUESTED'
  | 'PARTIALLY_ISSUED'
  | 'ISSUED'
  | 'PARTIALLY_CONSUMED'
  | 'CLOSED'
  | 'CANCELLED';

export type SpareMovementType = 'RECEIPT' | 'ISSUE' | 'CONSUME' | 'RETURN' | 'ADJUSTMENT';

export type GateQCStatus = 'NOT_REQUIRED' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WAIVED';

export type GateReceiptStatus = 'NOT_RECEIVED' | 'RECEIVED' | 'BLOCKED';

export type VendorVisitStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type PMFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export type PMExecutionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE';

export type ChecklistInputType = 'CHECKBOX' | 'PASS_FAIL' | 'NUMBER' | 'TEXT';

export type AssetDocumentType =
  | 'MANUAL'
  | 'WARRANTY'
  | 'AMC'
  | 'SERVICE_REPORT'
  | 'CALIBRATION'
  | 'OTHER';

export type MaintenanceDecimal = string | number;

export interface MaintenanceChoice<TValue extends string = string> {
  value: TValue;
  label: string;
}

export interface MaintenanceUserOption {
  id: number;
  email: string;
  full_name: string;
  employee_code: string;
  label: string;
}

export interface ProductionMachineOption {
  id: number;
  name: string;
  machine_type: string;
  line: number;
  line_name: string;
}

export interface AssetCategory {
  id: number;
  company: number;
  name: string;
  description: string;
  assets_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetLocation {
  id: number;
  company: number;
  name: string;
  area: string;
  line: string;
  description: string;
  assets_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetDepartment {
  id: number;
  company: number;
  name: string;
  department_code: string;
  description: string;
  assets_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpareCategory {
  id: number;
  company: number;
  name: string;
  description: string;
  spares_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceAsset {
  id: number;
  company: number;
  asset_code: string;
  name: string;
  category: number;
  category_name: string;
  location: number;
  location_name: string;
  department: number;
  department_name: string;
  parent_asset: number | null;
  parent_asset_code: string;
  parent_asset_name: string;
  production_machine: number | null;
  production_machine_name: string;
  production_machine_type: string;
  production_line_name: string;
  hierarchy_level: AssetHierarchyLevel;
  area: string;
  line: string;
  status: AssetStatus;
  make: string;
  model: string;
  serial_number: string;
  purchase_date: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  amc_vendor: string;
  amc_start_date: string | null;
  amc_end_date: string | null;
  responsible_person: number | null;
  responsible_person_name: string;
  qr_code: string;
  description: string;
  photos_count: number;
  documents_count: number;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceAssetPayload {
  asset_code: string;
  name: string;
  /**
   * The asset form no longer asks for a category; assets saved without one are
   * filed under the company's "General" category by the backend.
   */
  category?: number;
  location: number;
  department: number;
  parent_asset?: number | null;
  production_machine?: number | null;
  hierarchy_level: AssetHierarchyLevel;
  area?: string;
  line?: string;
  status: AssetStatus;
  make?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  amc_vendor?: string;
  amc_start_date?: string | null;
  amc_end_date?: string | null;
  qr_code?: string;
  description?: string;
}

export interface MaintenanceAssetFilters {
  search?: string;
  status?: AssetStatus | 'ALL';
  category?: number | 'ALL';
  department?: number | 'ALL';
  location?: number | 'ALL';
  production_machine?: number | 'ALL';
  line?: string;
  is_active?: boolean;
}

export interface AssetCategoryPayload {
  name: string;
  description?: string;
}

export interface AssetLocationPayload {
  name: string;
  area?: string;
  line?: string;
  description?: string;
}

export interface AssetDepartmentPayload {
  name: string;
  department_code?: string;
  description?: string;
}

export interface SpareCategoryPayload {
  name: string;
  description?: string;
}

export interface MaintenanceSpare {
  id: number;
  company: number;
  category: number;
  category_name: string;
  name: string;
  part_number: string;
  sap_item_code: string;
  uom: string;
  compatible_assets: number[];
  compatible_asset_codes: string[];
  compatible_asset_names: string[];
  is_critical: boolean;
  minimum_stock: MaintenanceDecimal;
  reorder_level: MaintenanceDecimal;
  current_stock: MaintenanceDecimal;
  unit_cost: MaintenanceDecimal;
  storage_location: string;
  description: string;
  is_low_stock: boolean;
  is_below_minimum: boolean;
  reorder_shortage_qty: MaintenanceDecimal;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSparePayload {
  category: number;
  name: string;
  part_number: string;
  sap_item_code?: string;
  uom?: string;
  compatible_assets?: number[];
  is_critical?: boolean;
  minimum_stock?: MaintenanceDecimal;
  reorder_level?: MaintenanceDecimal;
  current_stock?: MaintenanceDecimal;
  unit_cost?: MaintenanceDecimal;
  storage_location?: string;
  description?: string;
}

export interface SpareStockAdjustPayload {
  new_stock: MaintenanceDecimal;
  reason: string;
}

export interface MaintenanceSpareFilters {
  search?: string;
  category?: number | 'ALL';
  compatible_asset?: number | 'ALL';
  is_critical?: boolean | 'ALL';
  low_stock?: boolean;
  is_active?: boolean;
}

export interface AssetPhoto {
  id: number;
  asset: number;
  asset_code: string;
  photo: string;
  caption: string;
  taken_on: string;
  is_monthly_photo: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetDocument {
  id: number;
  asset: number;
  asset_code: string;
  document_type: AssetDocumentType;
  title: string;
  document: string;
  document_date: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetPhotoUploadPayload {
  asset: number;
  file: File;
  caption?: string;
  taken_on?: string;
  is_monthly_photo?: boolean;
}

export interface AssetDocumentUploadPayload {
  asset: number;
  file: File;
  document_type: AssetDocumentType;
  title: string;
  document_date?: string | null;
  notes?: string;
}

/** A file picked in the asset form, uploaded once the asset has an id. */
export interface StagedAssetDocument {
  file: File;
  document_type: AssetDocumentType;
  title: string;
}

export interface MaintenanceWorkOrder {
  id: number;
  company: number;
  work_order_no: string;
  work_type: WorkType;
  status: WorkOrderStatus;
  priority: MaintenancePriority;
  asset: number | null;
  asset_code: string;
  asset_name: string;
  /** Typed-in asset, used when the machine is not in the asset master. */
  asset_text: string;
  department: number;
  department_name: string;
  area: string;
  line: string;
  title: string;
  problem_statement: string;
  impact: WorkImpact;
  impact_notes: string;
  downtime_reason: string;
  production_run: number | null;
  production_run_number: number | null;
  production_run_date: string | null;
  production_line_name: string;
  production_product: string;
  production_breakdown: number | null;
  production_breakdown_reason: string;
  reported_by: number | null;
  reported_by_name: string;
  assigned_to: number | null;
  assigned_to_name: string;
  target_date: string | null;
  start_time: string | null;
  end_time: string | null;
  technician_remarks: string;
  completion_remarks: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  closure_remarks: string;
  completed_at: string | null;
  approved_at: string | null;
  approved_by: number | null;
  approved_by_name: string;
  closed_at: string | null;
  closed_by: number | null;
  closed_by_name: string;
  photos_count: number;
  spare_requests_count: number;
  spare_consumed_qty: MaintenanceDecimal;
  spare_consumed_cost: MaintenanceDecimal;
  response_time_minutes: number | null;
  repair_time_minutes: number | null;
  downtime_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceWorkOrderPayload {
  work_type: WorkType;
  priority: MaintenancePriority;
  asset?: number | null;
  asset_text?: string;
  department?: number;
  assigned_to?: number | null;
  production_run?: number | null;
  production_breakdown?: number | null;
  target_date?: string | null;
  title: string;
  problem_statement: string;
  impact: WorkImpact;
  impact_notes?: string;
  downtime_reason?: string;
}

export interface MaintenanceWorkOrderFilters {
  search?: string;
  work_type?: WorkType | 'ALL';
  status?: WorkOrderStatus | 'ALL';
  priority?: MaintenancePriority | 'ALL';
  department?: number | 'ALL';
  asset?: number | 'ALL';
  assigned_to?: number | 'ALL';
  production_run?: number | 'ALL';
  production_breakdown?: number | 'ALL';
  line?: string;
  is_active?: boolean;
}

export interface MaintenanceWorkOrderAssignPayload {
  assigned_to: number;
  target_date?: string | null;
}

export interface MaintenanceWorkOrderCompletePayload {
  technician_remarks?: string;
  completion_remarks: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  downtime_reason?: string;
}

export interface MaintenanceWorkOrderApprovalPayload {
  closure_remarks?: string;
}

export interface MaintenanceWorkOrderStatusPayload {
  status: WorkOrderStatus;
  remarks?: string;
}

export interface MaintenanceWorkOrderPhoto {
  id: number;
  work_order: number;
  work_order_no: string;
  asset_code: string;
  photo_type: WorkOrderPhotoType;
  photo: string;
  caption: string;
  taken_on: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceWorkOrderPhotoUploadPayload {
  work_order: number;
  file: File;
  photo_type: WorkOrderPhotoType;
  caption?: string;
  taken_on?: string;
}

export interface PreventiveMaintenancePlan {
  id: number;
  company: number;
  plan_code: string;
  title: string;
  asset: number;
  asset_code: string;
  asset_name: string;
  department: number;
  department_name: string;
  line: string;
  frequency: PMFrequency;
  work_type: WorkType;
  priority: MaintenancePriority;
  assigned_to: number | null;
  assigned_to_name: string;
  start_date: string;
  next_due_date: string;
  last_generated_date: string | null;
  advance_days: number;
  auto_create_work_order: boolean;
  checklist_required: boolean;
  description: string;
  checklist_count: number;
  execution_count: number;
  open_execution_count: number;
  is_due: boolean;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PreventiveMaintenancePlanPayload {
  title: string;
  asset: number;
  frequency: PMFrequency;
  work_type: Extract<WorkType, 'PREVENTIVE' | 'INSPECTION' | 'CALIBRATION'>;
  priority: MaintenancePriority;
  assigned_to?: number | null;
  start_date: string;
  next_due_date?: string;
  advance_days?: number;
  auto_create_work_order?: boolean;
  checklist_required?: boolean;
  description?: string;
  is_active?: boolean;
}

export interface PreventiveMaintenancePlanFilters {
  search?: string;
  frequency?: PMFrequency | 'ALL';
  priority?: MaintenancePriority | 'ALL';
  work_type?: WorkType | 'ALL';
  asset?: number | 'ALL';
  department?: number | 'ALL';
  assigned_to?: number | 'ALL';
  due_until?: string;
  due_only?: boolean;
  is_active?: boolean | 'ALL';
}

export interface PMGenerateDuePayload {
  due_until?: string;
  plan_ids?: number[];
}

export interface PMGenerateDueResponse {
  generated_count: number;
  executions: PreventiveMaintenanceExecution[];
}

export interface MaintenanceChecklistTemplateItem {
  id: number;
  company: number;
  pm_plan: number;
  pm_plan_code: string;
  pm_plan_title: string;
  task: string;
  input_type: ChecklistInputType;
  is_required: boolean;
  expected_text: string;
  min_value: MaintenanceDecimal | null;
  max_value: MaintenanceDecimal | null;
  uom: string;
  safety_critical: boolean;
  sort_order: number;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceChecklistTemplateItemPayload {
  pm_plan: number;
  task: string;
  input_type: ChecklistInputType;
  is_required?: boolean;
  expected_text?: string;
  min_value?: MaintenanceDecimal | null;
  max_value?: MaintenanceDecimal | null;
  uom?: string;
  safety_critical?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface MaintenanceChecklistTemplateItemFilters {
  pm_plan?: number | 'ALL';
  is_active?: boolean | 'ALL';
}

export interface MaintenanceChecklistResult {
  id: number;
  company: number;
  execution: number;
  template_item: number;
  template_task: string;
  sort_order: number;
  task_snapshot: string;
  input_type: ChecklistInputType;
  value_text: string;
  value_number: MaintenanceDecimal | null;
  is_ok: boolean;
  remarks: string;
  uom: string;
  safety_critical: boolean;
  is_active: boolean;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PreventiveMaintenanceExecution {
  id: number;
  company: number;
  pm_plan: number;
  pm_plan_code: string;
  pm_plan_title: string;
  frequency: PMFrequency;
  work_order: number | null;
  work_order_no: string;
  work_order_status: WorkOrderStatus | '';
  asset: number;
  asset_code: string;
  asset_name: string;
  department_name: string;
  line: string;
  due_date: string;
  status: PMExecutionStatus;
  effective_status: PMExecutionStatus;
  is_overdue: boolean;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  skip_reason: string;
  completed_by: number | null;
  completed_by_name: string;
  remarks: string;
  results: MaintenanceChecklistResult[];
  is_active: boolean;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PreventiveMaintenanceExecutionFilters {
  status?: PMExecutionStatus | 'ALL';
  pm_plan?: number | 'ALL';
  asset?: number | 'ALL';
  work_order?: number | 'ALL';
  frequency?: PMFrequency | 'ALL';
  date_from?: string;
  date_to?: string;
}

export interface PMChecklistResultInput {
  template_item: number;
  value_text?: string;
  value_number?: MaintenanceDecimal | null;
  is_ok?: boolean;
  remarks?: string;
}

export interface PMExecutionCompletePayload {
  checklist_results?: PMChecklistResultInput[];
  technician_remarks?: string;
  completion_remarks?: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  remarks?: string;
}

export interface PMExecutionSkipPayload {
  skip_reason: string;
}

export interface SpareRequest {
  id: number;
  company: number;
  work_order: number;
  work_order_no: string;
  work_order_title: string;
  asset: number;
  asset_code: string;
  asset_name: string;
  spare: number;
  spare_name: string;
  spare_part_number: string;
  spare_sap_item_code: string;
  spare_uom: string;
  status: SpareRequestStatus;
  requested_qty: MaintenanceDecimal;
  issued_qty: MaintenanceDecimal;
  consumed_qty: MaintenanceDecimal;
  returned_qty: MaintenanceDecimal;
  pending_issue_qty: MaintenanceDecimal;
  available_to_consume_qty: MaintenanceDecimal;
  total_cost: MaintenanceDecimal;
  requested_by: number | null;
  requested_by_name: string;
  required_by: string | null;
  purpose: string;
  store_remarks: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpareRequestPayload {
  work_order: number;
  spare: number;
  requested_qty: MaintenanceDecimal;
  required_by?: string | null;
  purpose?: string;
}

export interface WorkOrderSpareRequestPayload {
  spare: number;
  requested_qty: MaintenanceDecimal;
  required_by?: string | null;
  purpose?: string;
}

export interface SpareRequestFilters {
  search?: string;
  work_order?: number | 'ALL';
  asset?: number | 'ALL';
  spare?: number | 'ALL';
  status?: SpareRequestStatus | 'ALL';
  is_active?: boolean;
}

export interface SpareRequestActionPayload {
  quantity: MaintenanceDecimal;
  remarks?: string;
}

export interface SpareIssuePayload extends SpareRequestActionPayload {
  unit_cost?: MaintenanceDecimal | null;
}

export interface SpareMovement {
  id: number;
  company: number;
  spare_request: number;
  work_order: number;
  work_order_no: string;
  asset_code: string;
  spare: number;
  spare_name: string;
  spare_part_number: string;
  spare_uom: string;
  movement_type: SpareMovementType;
  quantity: MaintenanceDecimal;
  unit_cost: MaintenanceDecimal;
  line_total: MaintenanceDecimal;
  remarks: string;
  performed_by: number | null;
  performed_by_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpareMovementFilters {
  work_order?: number | 'ALL';
  spare_request?: number | 'ALL';
  spare?: number | 'ALL';
  movement_type?: SpareMovementType | 'ALL';
}

export interface MaintenanceVendorVisit {
  id: number;
  company: number;
  work_order: number;
  work_order_no: string;
  work_order_title: string;
  asset: number;
  asset_code: string;
  asset_name: string;
  asset_warranty_end_date: string | null;
  asset_amc_vendor: string;
  asset_amc_end_date: string | null;
  vendor_code: string;
  vendor_name: string;
  contact_person: string;
  contact_phone: string;
  status: VendorVisitStatus;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  person_gate_entry: number | null;
  person_gate_entry_name: string;
  material_gate_entry: number | null;
  material_gate_entry_no: string;
  service_report_attachment: string | null;
  invoice_number: string;
  invoice_attachment: string | null;
  remarks: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceVendorVisitPayload {
  work_order: number;
  asset?: number;
  vendor_code?: string;
  vendor_name: string;
  contact_person?: string;
  contact_phone?: string;
  status?: VendorVisitStatus;
  planned_start?: string | null;
  planned_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  person_gate_entry?: number | null;
  material_gate_entry?: number | null;
  service_report_attachment?: File | null;
  invoice_number?: string;
  invoice_attachment?: File | null;
  remarks?: string;
}

export interface MaintenanceVendorVisitFilters {
  search?: string;
  work_order?: number | 'ALL';
  asset?: number | 'ALL';
  status?: VendorVisitStatus | 'ALL';
  person_gate_entry?: number | 'ALL';
  material_gate_entry?: number | 'ALL';
  is_active?: boolean;
}

export interface MaintenanceDashboardFilters {
  department?: number | 'ALL';
  line?: string;
  priority?: MaintenancePriority | 'ALL';
  date_from?: string;
  date_to?: string;
}

export type MaintenanceReportType =
  | 'daily'
  | 'monthly'
  | 'pm_compliance'
  | 'breakdown'
  | 'downtime_pareto'
  | 'mttr'
  | 'mtbf'
  | 'asset_history'
  | 'spare_consumption'
  | 'critical_spare'
  | 'vendor_visit'
  | 'utility_downtime';

export type MaintenanceReportExportFormat = 'csv' | 'excel' | 'pdf';

export interface MaintenanceReportFilters {
  report_type?: MaintenanceReportType;
  department?: number | 'ALL';
  asset?: number | 'ALL';
  line?: string;
  priority?: MaintenancePriority | 'ALL';
  date_from?: string;
  date_to?: string;
}

export type MaintenanceReportCell = string | number | boolean | null;
export type MaintenanceReportRow = Record<string, MaintenanceReportCell>;
export type MaintenanceReportSummary = Record<string, MaintenanceReportCell>;

export interface MaintenanceReportResponse {
  report_type: MaintenanceReportType;
  title: string;
  generated_at: string;
  filters: {
    date_from: string;
    date_to: string;
    department: number | null;
    asset: number | null;
    line: string;
    priority: MaintenancePriority | null;
  };
  summary: MaintenanceReportSummary;
  rows: MaintenanceReportRow[];
}

export interface MaintenanceAssetQrResponse {
  asset: MaintenanceAsset;
  qr_code: string;
  print_label: string;
  scan_url: string;
  asset_url: string;
}

export interface MaintenanceAssetQrPayload {
  qr_code?: string;
}

export interface MaintenanceScanLookupResponse {
  found: boolean;
  type?: 'asset' | 'spare';
  code: string;
  qr_code?: string;
  barcode?: string;
  asset?: MaintenanceAsset;
  spare?: MaintenanceSpare;
  actions?: {
    view_url?: string;
    create_work_order?: boolean;
    stock_lookup?: boolean;
  };
  detail?: string;
}

export interface MaintenanceScanWorkOrderPayload {
  code: string;
  title: string;
  problem_statement: string;
  priority?: MaintenancePriority;
  impact?: WorkImpact;
  target_date?: string | null;
  assigned_to?: number | null;
}

export interface MaintenanceSpareStockFilters {
  spare?: number;
  code?: string;
  warehouse?: string;
}

export interface MaintenanceSpareStockRow {
  item_code: string;
  item_name: string;
  uom: string;
  warehouse: string;
  warehouse_name: string;
  on_hand: MaintenanceDecimal;
  committed: MaintenanceDecimal;
  on_order: MaintenanceDecimal;
  available_qty: MaintenanceDecimal;
}

export interface MaintenanceSpareStockResponse {
  spare: MaintenanceSpare;
  barcode: string;
  warehouse: string;
  local: {
    current_stock: MaintenanceDecimal;
    minimum_stock: MaintenanceDecimal;
    reorder_level: MaintenanceDecimal;
    shortage_qty: MaintenanceDecimal;
    is_low_stock: boolean;
    is_below_minimum: boolean;
  };
  sap: {
    available: boolean;
    source: 'sap' | 'local';
    message: string;
    rows: MaintenanceSpareStockRow[];
    total_available_qty: MaintenanceDecimal;
  };
}

export type MaintenanceAlertType =
  | 'PM_DUE'
  | 'BREAKDOWN_ESCALATION'
  | 'LOW_CRITICAL_SPARE'
  | 'AMC_WARRANTY_EXPIRY';

export type MaintenanceAlertSeverity = 'warning' | 'critical';

export interface MaintenanceAlert {
  type: MaintenanceAlertType;
  severity: MaintenanceAlertSeverity;
  title: string;
  message: string;
  reference_type: string;
  reference_id: number;
  url: string;
  due_date: string | null;
}

export interface MaintenanceAlertsResponse {
  generated_at: string;
  counts: Partial<Record<MaintenanceAlertType, number>>;
  total: number;
  alerts: MaintenanceAlert[];
}

export interface MaintenanceAlertSendPayload {
  alert_types?: MaintenanceAlertType[];
  limit?: number;
}

export interface MaintenanceAlertSendResponse {
  notifications_sent: number;
  notification_ids: number[];
}

export interface MaintenanceOptions {
  statuses: MaintenanceChoice<AssetStatus>[];
  priorities: MaintenanceChoice<MaintenancePriority>[];
  pm_frequencies: MaintenanceChoice<PMFrequency>[];
  pm_execution_statuses: MaintenanceChoice<PMExecutionStatus>[];
  checklist_input_types: MaintenanceChoice<ChecklistInputType>[];
  hierarchy_levels: MaintenanceChoice<AssetHierarchyLevel>[];
  document_types: MaintenanceChoice<AssetDocumentType>[];
  work_types: MaintenanceChoice<WorkType>[];
  work_statuses: MaintenanceChoice<WorkOrderStatus>[];
  work_impacts: MaintenanceChoice<WorkImpact>[];
  work_photo_types: MaintenanceChoice<WorkOrderPhotoType>[];
  spare_request_statuses: MaintenanceChoice<SpareRequestStatus>[];
  spare_movement_types: MaintenanceChoice<SpareMovementType>[];
  gate_qc_statuses: MaintenanceChoice<GateQCStatus>[];
  gate_receipt_statuses: MaintenanceChoice<GateReceiptStatus>[];
  vendor_visit_statuses: MaintenanceChoice<VendorVisitStatus>[];
  categories: AssetCategory[];
  locations: AssetLocation[];
  departments: AssetDepartment[];
  /** Global org departments (accounts.Department) used by the asset & work-order forms. */
  org_departments: OrgDepartmentOption[];
  spare_categories: SpareCategory[];
  users: MaintenanceUserOption[];
  production_machines: ProductionMachineOption[];
}

export interface OrgDepartmentOption {
  id: number;
  name: string;
  description: string;
  assets_count?: number;
}

export interface OrgDepartmentPayload {
  name: string;
  description?: string;
}

export interface MaintenanceDashboardSummary {
  filters: {
    department: number | null;
    line: string;
    priority: MaintenancePriority | null;
    date_from: string | null;
    date_to: string | null;
  };
  assets: {
    total: number;
    active: number;
    inactive: number;
    by_status: Partial<Record<AssetStatus, number>>;
    breakdown: number;
    under_pm: number;
    under_repair: number;
  };
  masters: {
    categories: number;
    locations: number;
    departments: number;
  };
  work_orders: {
    total: number;
    open: number;
    assigned: number;
    in_progress: number;
    completed: number;
    waiting_spare: number;
    waiting_vendor: number;
    critical: number;
    breakdowns: number;
    by_status: Partial<Record<WorkOrderStatus, number>>;
  };
  breakdowns: {
    open: number;
    critical: number;
    in_progress: number;
    stoppage: number;
  };
  pm: {
    open: number;
    due_today: number;
    overdue: number;
    completed_due: number;
    due_total: number;
    compliance_percent: number | null;
  };
  today_tasks: {
    total: number;
    overdue: number;
    high_priority: number;
    items: MaintenanceWorkOrder[];
  };
  production_downtime: {
    total_minutes: number;
    active_breakdowns: number;
    impacted_runs: number;
    stoppage_work_orders: number;
  };
  spares: {
    total: number;
    critical: number;
    low_stock: number;
    below_minimum: number;
    critical_shortage: number;
  };
  spare_risk: {
    low_stock: number;
    below_minimum: number;
    critical_shortage: number;
    shortage_qty: MaintenanceDecimal;
    items: MaintenanceSpare[];
  };
  vendor_visits: {
    total: number;
    planned: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  vendor_amc: {
    due_visits: number;
    overdue_visits: number;
    amc_due: number;
    amc_overdue: number;
    warranty_due: number;
    warranty_expired: number;
    visits: MaintenanceVendorVisit[];
    amc_assets: MaintenanceAsset[];
  };
  open_breakdowns: MaintenanceWorkOrder[];
  pm_due_work_orders: MaintenanceWorkOrder[];
  recent_assets: MaintenanceAsset[];
  recent_work_orders: MaintenanceWorkOrder[];
  low_stock_spares: MaintenanceSpare[];
}
