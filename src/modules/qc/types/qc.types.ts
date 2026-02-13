// Arrival Slip types
export type ArrivalSlipStatus = 'DRAFT' | 'SUBMITTED' | 'REJECTED';

// Inspection workflow status
export type InspectionWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'QA_CHEMIST_APPROVED'
  | 'QAM_APPROVED'
  | 'COMPLETED';

// Inspection final status
export type InspectionFinalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'HOLD';

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
export interface MaterialType {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface CreateMaterialTypeRequest {
  code: string;
  name: string;
  description?: string;
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
  created_at: string;
  updated_at: string;
}

// Pending Inspection (arrival slip awaiting inspection)
export interface PendingInspection {
  arrival_slip: ArrivalSlipForQC;
  has_inspection: boolean;
  inspection_status: InspectionWorkflowStatus | null;
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
  invoice_bill_no: string;
  vehicle_no: string;
  material_type: number;
  material_type_name: string;
  final_status: InspectionFinalStatus;
  qa_chemist: number | null;
  qa_chemist_name: string | null;
  qa_chemist_approved_at: string | null;
  qa_chemist_remarks: string;
  qam: number | null;
  qam_name: string | null;
  qam_approved_at: string | null;
  qam_remarks: string;
  workflow_status: InspectionWorkflowStatus;
  is_locked: boolean;
  remarks: string;
  parameter_results: ParameterResult[];
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionRequest {
  inspection_date: string;
  description_of_material: string;
  sap_code: string;
  supplier_name: string;
  manufacturer_name: string;
  supplier_batch_lot_no: string;
  unit_packing: string;
  purchase_order_no: string;
  invoice_bill_no: string;
  vehicle_no: string;
  material_type_id: number;
  remarks?: string;
}

export interface ApprovalRequest {
  remarks?: string;
  final_status?: InspectionFinalStatus;
}

// Dashboard counts
export interface QCDashboardCounts {
  pending_inspection: number;
  draft: number;
  awaiting_chemist: number;
  awaiting_manager: number;
  approved_today: number;
  rejected: number;
}
