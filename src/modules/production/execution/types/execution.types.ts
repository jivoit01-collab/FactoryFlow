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

export type ClearanceStatus = 'DRAFT' | 'SUBMITTED' | 'ON_HOLD' | 'CLEARED' | 'NOT_CLEARED';

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
  /** Standard operating hours/month — denominator for apportioning PER_MONTH fixed costs. */
  standard_hours_per_month: string | null;
  /** Standard operating hours/day — denominator for apportioning PER_DAY fixed costs. */
  standard_hours_per_day: string | null;
  /** Standard electricity units (kWh) drawn per running hour. */
  electricity_units_per_hour: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Cost Master
// ============================================================================

export type CostCategory =
  | 'ELECTRICITY_VARIABLE'
  | 'ELECTRICITY_FIXED'
  | 'LABOUR'
  | 'MANPOWER_SALARIED'
  | 'LUBRICATION'
  | 'LAB_CHEMICALS'
  | 'BATCH_CODING'
  | 'MAINTENANCE'
  | 'WATER'
  | 'OVERHEAD'
  | 'WASTE_RECOVERY'
  | 'OTHER';

export type CostBasis = 'PER_UNIT' | 'PER_PERSON_DAY' | 'PER_DAY' | 'PER_HOUR' | 'PER_MONTH';

// Cost-rate types removed: rates are managed on the admin Cost Master page
// (/admin/cost-master); the category/basis unions stay for run cost lines.

export interface LineSkuConfig {
  id: number;
  line: number;
  line_name: string;
  config_name: string;
  sku_code: string;
  sku_name: string;
  /** Bottles/hr */
  rated_speed: string | null;
  /** Bottles per case (SAP SalFactor2); null when unresolved */
  pieces_per_case: number | null;
  labour_count: number;
  other_manpower_count: number;
  supervisor: string;
  operators: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLineSkuConfigPayload {
  line_id: number;
  config_name: string;
  sku_code?: string;
  sku_name?: string;
  /** Bottles/hr — mandatory: title + speed are the only required preset fields */
  rated_speed: string | number;
  pieces_per_case?: number | null;
  labour_count?: number;
  other_manpower_count?: number;
  supervisor?: string;
  operators?: string;
}

export interface UpdateLineSkuConfigPayload {
  config_name?: string;
  sku_code?: string;
  sku_name?: string;
  /** Omit to keep the stored speed; null is rejected (speed is mandatory) */
  rated_speed?: string | number;
  pieces_per_case?: number | null;
  labour_count?: number;
  other_manpower_count?: number;
  supervisor?: string;
  operators?: string;
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

export type WarehouseApprovalStatus =
  | 'NOT_REQUESTED'
  | 'PENDING'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED';

export interface ProductionRun {
  id: number;
  sap_doc_entry: number | null;
  run_number: number;
  date: string;
  line: number;
  line_name: string;
  /** The line configuration the run was planned from; null when planned without one. */
  line_config: number | null;
  line_config_name: string;
  product: string;
  item_code: string;
  required_qty: string | null;
  /** Bottles/hr */
  rated_speed: string;
  /** Bottles per case (SAP SalFactor2); null when unresolved */
  pieces_per_case: number | null;
  total_production: string;
  total_running_minutes: number;
  total_breakdown_time: number;
  rejected_qty: string;
  reworked_qty: string;
  warehouse_approval_status: WarehouseApprovalStatus;
  status: RunStatus;
  live_status: LiveStatus;
  created_by: number | null;
  created_at: string;
  /** Litres in one piece (SAP SalPackUn); null when the SKU holds no liquid. */
  litres_per_piece: string | null;
  /** ISO datetime the run is planned to start — null on runs entered as they start. */
  planned_start_at: string | null;
  planned_end_at: string | null;
  planned_end_is_manual: boolean;
  /** Why the plan was saved despite a shortfall or a clash. */
  planning_remark: string;
  labour_count: number;
  other_manpower_count: number;
  supervisor: string;
  operators: string;
}

export interface ProductionRunDetail extends ProductionRun {
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
  is_manual: boolean;
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
  machine: number | null;
  machine_name?: string | null;
  breakdown_category: number | null;
  breakdown_category_name: string;
  start_time: string;
  end_time: string;
  breakdown_minutes: number;
  is_unrecovered: boolean;
  is_active: boolean;
  is_manual: boolean;
  maintenance_work_order_id: number | null;
  maintenance_work_order_no: string;
  maintenance_work_order_status: string;
  maintenance_asset_id: number | null;
  maintenance_asset_code: string;
  maintenance_asset_name: string;
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
  bom_quantity?: string;
  wastage_percentage?: string;
  wastage_quantity?: string;
  final_consumption_quantity?: string;
  uom: string;
  warehouse_request_id?: number | null;
  warehouse_request_status?: 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | null;
  warehouse_line_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  warehouse_requested_qty?: string | null;
  warehouse_approved_qty?: string | null;
  warehouse_available_stock?: string | null;
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

export interface LineClearanceAttachment {
  id: number;
  file: string;
  original_name: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

export interface LineClearanceDecisionLog {
  id: number;
  decision: ClearanceStatus;
  decision_label: string;
  remarks: string;
  decided_by: number | null;
  decided_by_name: string | null;
  decided_at: string;
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
  qa_approved: boolean;
  all_checks_passed: boolean;
  production_supervisor_sign: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface LineClearanceDetail extends LineClearance {
  verified_by: number | null;
  qa_approved_by: number | null;
  qa_approved_at: string | null;
  qa_remarks: string;
  run_status: RunStatus | null;
  is_line_started: boolean;
  items: LineClearanceItem[];
  attachments: LineClearanceAttachment[];
  decision_logs: LineClearanceDecisionLog[];
}

export interface ManagerDecisionRequest {
  decision: 'CLEARED' | 'NOT_CLEARED' | 'ON_HOLD';
  remarks?: string;
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
  production_run: number | null;
  run_number?: number | null;
  run_date?: string | null;
  run_product?: string;
  /** Run date for run-linked logs, creation date for standalone logs. */
  log_date?: string | null;
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
  approved_sign?: string;
  approved_by?: number | null;
  approved_at?: string | null;
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

export interface ProductionRunCostLine {
  id: number;
  category: CostCategory | 'MATERIAL';
  category_display: string;
  basis: CostBasis | '';
  quantity: string;
  rate: string;
  amount: string;
  is_credit: boolean;
  note: string;
}

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
  waste_recovery_credit: string;
  total_cost: string;
  net_cost: string;
  produced_qty: string;
  per_unit_cost: string;
  calculated_at: string;
  lines: ProductionRunCostLine[];
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
// Next-day plan readiness — material availability, clashes and timing
// ============================================================================

/**
 * `UNKNOWN` means the stock read failed, NOT that stock is zero — the row's
 * figures come back null and it must never be presented as a shortage.
 */
export type MaterialReadinessStatus =
  | 'OK'
  | 'UNKNOWN'
  | 'TIGHT'
  | 'CONTESTED'
  | 'NO_STOCK_RECORD'
  | 'SHORT';

export type PlanConflictType = 'LINE_BUSY' | 'DUPLICATE_SKU' | 'MATERIAL_CONTENTION';

export interface PlanCheckWarehouseStock {
  warehouse: string;
  on_hand: number | null;
  /** Null on a Raw Material register holding — a hand-typed quantity carries
   *  no SAP reservations. */
  committed: number | null;
  /** Set on register holdings: the date the keeper's count is true as of. */
  as_of_date?: string | null;
}

export interface PlanCheckCompetingRun {
  run_id: number;
  run_number: number;
  date: string | null;
  status: RunStatus;
  line_name: string;
  product: string;
  qty: number | null;
  planned_start_at: string | null;
}

export interface PlanCheckMaterialRow {
  item_code: string;
  item_name: string;
  uom: string;
  material_type: 'PACKAGING' | 'RAW' | 'OTHER';
  item_group: string;
  issue_warehouse: string;
  /** The warehouses this component's stock was looked for in — RM and PM are
   *  scoped separately, so this is per row, not per screen. */
  searched_warehouses: string[];
  has_own_bom: boolean;
  /** `ITT1."Quantity"` as authored in SAP — the quantity for ONE box. */
  qty_per_case: number | null;
  /** `OITT."Qauntity"`, reported only for transparency; never divided by. */
  bom_base_qty: number | null;
  required_qty: number | null;
  /** Per-case x case count, before any edit the supervisor made. */
  bom_required_qty: number | null;
  required_is_overridden: boolean;
  on_hand: number | null;
  committed: number | null;
  free: number | null;
  other_plan_demand: number | null;
  available_after_other_plans: number | null;
  balance_after_this_plan: number | null;
  shortfall: number | null;
  status: MaterialReadinessStatus;
  /** REGISTER for raw material (the store keeper's count) and SAP for
   *  everything else. The two must never be presented as the same number. */
  stock_source: 'REGISTER' | 'SAP';
  /** True when a raw material has no Raw Material register row at all — it
   *  reads as 0, which is not the same as a counted zero. */
  register_missing: boolean;
  /** Oldest as-of date across the register rows behind the figure. */
  register_as_of: string | null;
  /** SAP's own on-hand, carried even on a register-sourced row so a stale
   *  register is visible rather than silently authoritative. */
  sap_on_hand: number | null;
  sap_free: number | null;
  /** Whether this line goes to the warehouse for approval, and for how much. */
  approval_required: boolean;
  approval_qty: number | null;
  approval_reason: string;
  qty_at_production_consumption: number | null;
  warehouses: PlanCheckWarehouseStock[];
  competing_runs: PlanCheckCompetingRun[];
  on_order_qty: number | null;
  on_order_earliest_due: string | null;
  days_since_last_consumption: number | null;
}

export interface PlanCheckMaterialSummary {
  total_lines: number;
  ok_lines: number;
  tight_lines: number;
  contested_lines: number;
  short_lines: number;
  no_record_lines: number;
  status: MaterialReadinessStatus;
  /** How many lines will actually be sent to the warehouse. */
  approval_lines: number;
  /** Raw materials with no Raw Material register row. */
  register_missing_lines: number;
}

export interface PlanCheckConflict {
  type: PlanConflictType;
  severity: 'WARNING';
  message: string;
  run_id?: number;
  run_number?: number;
  run_status?: RunStatus;
  item_code?: string;
  item_name?: string;
  window_overlap?: boolean;
  window_unknown?: boolean;
  detail?: Record<string, unknown>;
}

export interface PlanCheckTiming {
  planned_start_at: string | null;
  planned_end_at: string | null;
  derived_end_at: string | null;
  planned_end_is_manual: boolean;
  duration_minutes: number | null;
  derived_duration_minutes: number | null;
  bottles: number | null;
  pieces_per_case: number | null;
  rated_speed: number | null;
  /** Which inputs are missing, when the finish time cannot be worked out. */
  undecidable_because: string[];
}

export interface PlanCheckResult {
  timing: PlanCheckTiming;
  materials: {
    rows: PlanCheckMaterialRow[];
    summary: PlanCheckMaterialSummary;
    unusable: { item_code: string; item_name: string; reason: string }[];
    resource_lines: { item_code: string; item_name: string }[];
    available: boolean;
    error: string;
    /** Every warehouse read, across all material types. */
    warehouses: string[];
    /** Which warehouses count per kind of material: RM from the oil stores, PM
     *  from the packaging stores, OTHER from both. */
    warehouse_scope: Partial<Record<'RAW' | 'PACKAGING' | 'OTHER', string[]>>;
    basis: 'ON_HAND' | 'FREE';
  };
  conflicts: PlanCheckConflict[];
  blocking: {
    has_shortage: boolean;
    has_contention: boolean;
    has_conflicts: boolean;
    requires_remark: boolean;
  };
  meta: {
    company_code: string;
    date: string;
    line_id: number | null;
    line_name: string;
    item_code: string;
    stock_basis: string;
    checked_at: string;
  };
}

export interface PlanCheckRequest {
  line_id?: number | null;
  item_code?: string;
  required_qty?: number | null;
  date?: string;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  planned_end_is_manual?: boolean;
  rated_speed?: string | number | null;
  pieces_per_case?: number | null;
  exclude_run_id?: number | null;
  stock_basis?: 'ON_HAND' | 'FREE';
  /**
   * Material lines as they stand on the form. Sent so the check prices the
   * quantities the supervisor actually edited, not only the BOM's.
   */
  materials?: { material_code: string; opening_qty: string }[];
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateLineRequest {
  name: string;
  description?: string;
  standard_hours_per_month?: string | number | null;
  standard_hours_per_day?: string | number | null;
  electricity_units_per_hour?: string | number | null;
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
  /** The preset the plan was made from, so reopening it shows the same choice. */
  line_config_id?: number | null;
  date: string;
  product?: string;
  item_code?: string;
  required_qty?: number | null;
  rated_speed?: string;
  pieces_per_case?: number | null;
  machine_ids?: number[];
  labour_count?: number;
  other_manpower_count?: number;
  supervisor?: string;
  operators?: string;
  materials?: MaterialInput[];
  /** ISO datetime the run is planned to start — set the evening before. */
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  planned_end_is_manual?: boolean;
  /** Reason for planning despite a shortfall or a clash. */
  planning_remark?: string;
  acknowledged_warnings?: boolean;
}

export interface UpdateRunRequest {
  /**
   * Re-planning fields. The API accepts these only while the run is a draft —
   * once it is running, the line, day, product and quantity are what the floor
   * is working to.
   */
  line_id?: number;
  line_config_id?: number | null;
  date?: string;
  item_code?: string;
  required_qty?: number | null;
  /** Replaces the run's material lines wholesale. */
  materials?: MaterialInput[];
  product?: string;
  rated_speed?: string;
  pieces_per_case?: number | null;
  machine_ids?: number[];
  labour_count?: number;
  other_manpower_count?: number;
  supervisor?: string;
  operators?: string;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  planned_end_is_manual?: boolean;
  planning_remark?: string;
}

export interface AddBreakdownRequest {
  breakdown_category_id: number;
  machine_id?: number | null;
  maintenance_asset_id?: number | null;
  create_maintenance_work_order?: boolean;
  maintenance_priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
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

export interface AddManualSegmentRequest {
  start_time: string;
  end_time: string;
  produced_cases?: string;
  remarks?: string;
}

export interface AddManualBreakdownRequest {
  start_time: string;
  end_time: string;
  breakdown_category_id: number;
  machine_id?: number | null;
  reason: string;
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
  all_checks_passed?: boolean;
  production_supervisor_sign?: string;
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

export interface CreateWasteItemRequest {
  material_code: string;
  material_name: string;
  wastage_qty: string;
  uom: string;
  reason?: string;
}

export interface CreateWasteLogRequest {
  /** Omit for a standalone wastage entry not tied to a production run. */
  production_run_id?: number | null;
  material_code?: string;
  material_name?: string;
  wastage_qty?: string;
  uom?: string;
  reason?: string;
  items?: CreateWasteItemRequest[];
}

export interface WasteApprovalRequest {
  sign: string;
}

export interface CreateElectricityRequest {
  description: string;
  units_consumed: string;
  /** Optional — the costing engine prices units at the Cost Master rate. */
  rate_per_unit?: string;
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
  raw_material_cost: number;
  total_cost: number;
  net_cost: number;
  cost_per_unit: number;
  waste_recovery_credit: number;
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
    grand_total_net: number;
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
export interface DowntimeReasonItem {
  reason: string;
  count: number;
  total_minutes: number;
  avg_minutes: number;
  /** share of this reason's parent category, not of the whole period */
  pct_of_category: number;
}

export interface DowntimeParetoItem {
  category: string;
  count: number;
  total_minutes: number;
  percentage: number;
  cumulative_pct: number;
  /**
   * The free-text reasons logged under this category, worst first.
   * Optional because the frontend and backend deploy from separate repos — a
   * frontend that ships first will see this field absent.
   */
  reasons?: DowntimeReasonItem[];
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
  item_code: string;
  produced_qty: number;
  /** Litres produced — cases x SAP SalFactor2 x SalPackUn. Null when the SKU
   *  holds no liquid or its volume was never snapshotted from SAP. */
  litres: number | null;
  raw_material_cost: number;
  labour_cost: number;
  machine_cost: number;
  electricity_cost: number;
  water_cost: number;
  gas_cost: number;
  compressed_air_cost: number;
  overhead_cost: number;
  waste_recovery_credit: number;
  total_cost: number;
  net_cost: number;
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

export interface CostCategoryBreakdown {
  category: string;
  label: string;
  amount: number;
  is_credit: boolean;
  percentage: number;
}

export interface CostAnalysisReport {
  per_run: CostRunDetail[];
  trend: CostTrendPoint[];
  by_line: CostByLine[];
  cost_distribution: Record<string, CostDistributionItem>;
  category_breakdown?: CostCategoryBreakdown[];
  summary: {
    total_cost: number;
    total_waste_recovery: number;
    total_net_cost: number;
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

/**
 * Cost analysis takes one extra scope: which run states are priced.
 *
 * Omitted, the backend answers on COMPLETED runs only — the basis the report
 * page reads. `ALL` covers every costed run whatever state it is in, which is
 * what a live board needs: a day's spend sits in its open runs too, and
 * pricing only the closed ones divides a whole day's cost by a slice of its
 * output.
 */
export interface CostAnalysisParams extends AnalyticsParams {
  status?: 'ALL' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
}
