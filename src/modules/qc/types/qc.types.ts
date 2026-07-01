// Arrival Slip types
export type ArrivalSlipStatus = 'DRAFT' | 'SUBMITTED' | 'REJECTED';

// Inspection workflow status (DB states)
export type InspectionWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'QA_CHEMIST_APPROVED'
  | 'QAM_APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

// Extended workflow status for list views (includes computed NOT_STARTED)
export type InspectionListWorkflowStatus = 'NOT_STARTED' | InspectionWorkflowStatus;

// Inspection final status
export type InspectionFinalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'HOLD';

export type InspectionDecision = 'APPROVED' | 'HOLD' | 'REJECTED';

export type QCStage =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'AWAITING_CHEMIST'
  | 'AWAITING_MANAGER'
  | 'DECIDED';

export interface InspectionDecisionInfo {
  decision: InspectionDecision | null;
  label: string;
  by: string | null;
  decided_at: string | null;
  remarks: string;
}

// Query params for inspection list endpoints
export interface InspectionListParams {
  from_date?: string;
  to_date?: string;
  workflow_status?: InspectionWorkflowStatus;
  final_status?: InspectionFinalStatus;
}

// QC Parameter type
export type ParameterType = 'NUMERIC' | 'TEXT' | 'BOOLEAN' | 'RANGE';

// Material Type
export interface MaterialTypeSAPItem {
  id?: number;
  item_code: string;
  item_name?: string;
}

export interface SAPItemMasterOption {
  item_code: string;
  item_name: string;
  uom: string;
}

export interface MaterialType {
  id: number;
  code: string;
  name: string;
  description: string;
  sap_items?: MaterialTypeSAPItem[];
}

export interface CreateMaterialTypeRequest {
  code: string;
  name: string;
  description?: string;
  sap_items?: MaterialTypeSAPItem[];
  copy_parameters_from_material_type_id?: number | null;
}

export interface LinkMaterialTypeSAPItemRequest {
  material_type_id: number;
  item_code: string;
  item_name?: string;
}

// QC Print Documents
export type QCPrintDocumentKey = 'RAW_MATERIAL_INSPECTION';

export interface QCPrintDocument {
  id: number;
  document_key: QCPrintDocumentKey;
  document_key_label: string;
  document_id: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveQCPrintDocumentRequest {
  document_key: QCPrintDocumentKey;
  document_id: string;
  notes?: string;
}

// QC Parameter
export interface QCParameter {
  id: number;
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  parameter_type: ParameterType;
  min_value: number | null;
  max_value: number | null;
  uom: string;
  sequence: number;
  is_mandatory: boolean;
}

export interface CreateQCParameterRequest {
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  parameter_type: ParameterType;
  min_value?: number;
  max_value?: number;
  uom: string;
  sequence: number;
  is_mandatory: boolean;
}

// Parameter Result (inspection result)
export interface ParameterResult {
  id: number;
  parameter_master: number;
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  parameter_type: ParameterType;
  min_value: string | null;
  max_value: string | null;
  uom: string;
  result_value: string;
  result_numeric: number | null;
  is_within_spec: boolean | null;
  remarks: string;
}

export interface UpdateParameterResultRequest {
  parameter_master_id: number;
  result_value: string;
  result_numeric?: number;
  is_within_spec?: boolean;
  remarks?: string;
}

// Arrival Slip Attachment
export type ArrivalSlipAttachmentType = 'CERTIFICATE_OF_ANALYSIS' | 'CERTIFICATE_OF_QUANTITY';

export interface ArrivalSlipAttachment {
  id: number;
  file: string;
  attachment_type: ArrivalSlipAttachmentType;
  uploaded_at: string;
}

// Inspection Attachment
export interface InspectionAttachment {
  id: number;
  file: string;
  original_name: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

// Arrival Slip (from QC perspective)
export interface ArrivalSlipForQC {
  id: number;
  po_item_receipt: number;
  po_item_code: string;
  item_name: string;
  po_receipt_id: number;
  vehicle_entry_id: number;
  entry_no: string;
  particulars: string;
  arrival_datetime: string;
  weighing_required: boolean;
  party_name: string;
  billing_qty: string;
  billing_uom: string;
  in_time_to_qa: string | null;
  truck_no_as_per_bill: string;
  commercial_invoice_no: string;
  eway_bill_no: string;
  bilty_no: string;
  has_certificate_of_analysis: boolean;
  has_certificate_of_quantity: boolean;
  status: ArrivalSlipStatus;
  is_submitted: boolean;
  submitted_at: string | null;
  submitted_by: number | null;
  submitted_by_name: string | null;
  remarks: string;
  attachments: ArrivalSlipAttachment[];
  created_at: string;
  updated_at: string;
}

// Lightweight list item returned by all list endpoints (queried from MaterialArrivalSlip)
export interface InspectionListItem {
  arrival_slip_id: number;
  inspection_id: number | null;
  entry_no: string;
  report_no: string | null;
  internal_lot_no: string | null;
  po_item_code: string;
  item_name: string;
  party_name: string;
  billing_qty: string;
  billing_uom: string;
  workflow_status: InspectionListWorkflowStatus;
  final_status: InspectionFinalStatus | null;
  effective_final_status?: InspectionFinalStatus | null;
  chemist_decision: InspectionDecisionInfo;
  manager_decision: InspectionDecisionInfo;
  qc_stage: QCStage;
  qc_decision: InspectionDecision | null;
  rejected_qc_return_entry_id?: number | null;
  rejected_qc_return_entry_no?: string | null;
  material_type_name: string | null;
  created_at: string;
  submitted_at: string | null;
}

// Dashboard counts from /inspections/counts/
export interface InspectionCounts {
  not_started: number;
  draft: number;
  awaiting_chemist: number;
  awaiting_qam: number;
  completed: number;
  rejected: number;
  hold: number;
  actionable: number;
}

// Inspection
export interface Inspection {
  id: number;
  arrival_slip: number;
  arrival_slip_id: number;
  arrival_slip_status: ArrivalSlipStatus;
  po_item_receipt_id: number;
  po_item_code: string;
  item_name: string;
  vehicle_entry_id: number;
  entry_no: string;
  report_no: string;
  internal_lot_no: string;
  inspection_date: string;
  description_of_material: string;
  sap_code: string;
  supplier_name: string;
  manufacturer_name: string;
  supplier_batch_lot_no: string;
  unit_packing: string;
  purchase_order_no: string;
  internal_report_no: string;
  invoice_bill_no: string;
  vehicle_no: string;
  material_type: number;
  material_type_name: string;
  final_status: InspectionFinalStatus;
  qa_chemist: number | null;
  qa_chemist_name: string | null;
  qa_chemist_approved_at: string | null;
  qa_chemist_decision?: InspectionDecision | '';
  qa_chemist_remarks: string;
  qam: number | null;
  qam_name: string | null;
  qam_approved_at: string | null;
  qam_decision?: InspectionDecision | '';
  qam_remarks: string;
  chemist_decision: InspectionDecisionInfo;
  manager_decision: InspectionDecisionInfo;
  /** Audit trail of every QA Manager decision, newest first. */
  manager_decision_logs?: InspectionDecisionInfo[];
  qc_stage: QCStage;
  qc_decision: InspectionDecision | null;
  rejected_by?: number | null;
  rejected_by_name?: string | null;
  rejected_at?: string | null;
  effective_final_status?: InspectionFinalStatus;
  /** True once a GRPO has been posted for this item — locks the QC decision. */
  is_grpo_done?: boolean;
  rejected_qc_return_entry_id?: number | null;
  rejected_qc_return_entry_no?: string | null;
  workflow_status: InspectionWorkflowStatus;
  is_locked: boolean;
  remarks: string;
  parameter_results: ParameterResult[];
  attachments: ArrivalSlipAttachment[];
  qc_attachments: InspectionAttachment[];
  print_document_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionRequest {
  inspection_date: string;
  description_of_material: string;
  sap_code: string;
  supplier_name: string;
  manufacturer_name: string;
  supplier_batch_lot_no?: string;
  unit_packing: string;
  purchase_order_no?: string;
  internal_report_no?: string;
  report_no?: string;
  internal_lot_no?: string;
  invoice_bill_no: string;
  vehicle_no: string;
  material_type_id: number;
  remarks?: string;
}

export type InspectionSavePayload = CreateInspectionRequest | FormData;

export interface ApprovalRequest {
  remarks?: string;
  decision?: InspectionDecision;
  final_status?: InspectionFinalStatus;
}

// ============================================================================
// Production QC Types
// ============================================================================

export type ProductionQCSessionType = 'IN_PROCESS' | 'FINAL';

export type ProductionQCWorkflowStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type ProductionQCOverallResult = 'PASS' | 'FAIL' | '';

// Production QC Parameter Result (same structure as ParameterResult)
export interface ProductionQCResult {
  id: number;
  parameter_master: number;
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  parameter_type: ParameterType;
  min_value: string | null;
  max_value: string | null;
  uom: string;
  is_mandatory: boolean;
  result_value: string;
  result_numeric: number | null;
  is_within_spec: boolean | null;
  remarks: string;
}

// Production QC Session (full detail with results)
export interface ProductionQCSession {
  id: number;
  production_run: number;
  run_number: number;
  material_type: number | null;
  material_type_name: string | null;
  material_type_code: string | null;
  session_number: number;
  session_type: ProductionQCSessionType;
  checked_at: string;
  checked_by: number | null;
  checked_by_name: string | null;
  overall_result: ProductionQCOverallResult;
  workflow_status: ProductionQCWorkflowStatus;
  submitted_by: number | null;
  submitted_by_name: string | null;
  submitted_at: string | null;
  remarks: string;
  results: ProductionQCResult[];
  created_at: string;
  updated_at: string;
}

// Production QC Session list item (lightweight)
export interface ProductionQCSessionListItem {
  id: number;
  production_run: number;
  run_number: number;
  run_date: string;
  product: string;
  line_name: string;
  material_type: number | null;
  material_type_name: string | null;
  session_number: number;
  session_type: ProductionQCSessionType;
  checked_at: string;
  checked_by_name: string | null;
  overall_result: ProductionQCOverallResult;
  workflow_status: ProductionQCWorkflowStatus;
  pass_count: number;
  fail_count: number;
  total_params: number;
  created_at: string;
}

// Production QC Counts
export interface ProductionQCCounts {
  draft: number;
  submitted: number;
  approved?: number;
  rejected?: number;
}

// Create session request
export interface CreateProductionQCSessionRequest {
  material_type_id: number;
  session_type: ProductionQCSessionType;
  checked_at: string;
  remarks?: string;
}

// Update result request (same as existing pattern)
export interface UpdateProductionQCResultRequest {
  parameter_master_id: number;
  result_value: string;
  result_numeric?: number | null;
  is_within_spec?: boolean | null;
  remarks?: string;
}

// Production QC approval request
export interface ProductionQCSubmitRequest {
  overall_result: 'PASS' | 'FAIL';
}

export interface ProductionQCApprovalRequest {
  remarks?: string;
  overall_result?: 'PASS' | 'FAIL';
}

export interface ProductionQCRejectRequest {
  remarks?: string;
}

// Production QC list filter params
export interface ProductionQCListParams {
  workflow_status?: ProductionQCWorkflowStatus;
  session_type?: ProductionQCSessionType;
  run_id?: number;
  line?: number;
  date_from?: string;
  date_to?: string;
}
