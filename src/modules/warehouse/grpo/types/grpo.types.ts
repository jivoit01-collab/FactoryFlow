import type { InspectionDecision, InspectionDecisionInfo, QCStage } from '@/modules/qc/types';
import type { ControlledDocumentFields } from '@/shared/types';

// Warehouse (from /po/warehouses/)
export interface Warehouse {
  warehouse_code: string;
  warehouse_name: string;
}

// Standard DRF-style paginated envelope returned by all GRPO list endpoints
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
}

// Per-phase tab counts returned alongside the all-entries page
export interface AllGRPOEntriesCounts {
  ALL: number;
  GATE: number;
  QC: number;
  DONE: number;
}

// All-entries page also carries the per-phase counts
export interface AllGRPOEntriesResponse extends PaginatedResponse<AllGRPOEntry> {
  counts: AllGRPOEntriesCounts;
}

// Query params accepted by the GRPO list endpoints (all optional)
export interface GRPOListParams {
  page?: number;
  page_size?: number;
  year?: number;
  month?: number;
  search?: string;
  status?: string;
  phase?: 'GATE' | 'QC' | 'DONE';
  vehicle_entry_id?: number;
  dispatch_plan_id?: number;
  /** Service GRPO queue narrowing — see ServiceGRPOStage. */
  stage?: string;
  transporter?: string;
  state?: string;
  min_age_days?: number;
}

// GRPO Status
export type GRPOStatus = 'DRAFT' | 'PENDING' | 'POSTED' | 'FAILED' | 'PARTIALLY_POSTED';

// QC Status (used in preview items)
export type QCStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'HOLD'
  | 'NO_ARRIVAL_SLIP'
  | 'ARRIVAL_SLIP_PENDING'
  | 'INSPECTION_PENDING';

// SAP Attachment Status
export type AttachmentStatus = 'PENDING' | 'UPLOADED' | 'LINKED' | 'FAILED';

// Dashboard summary (GET /summary/)
export interface GRPODashboardSummary {
  pending_entry_count: number;
  pending_po_count: number;
  qc_accepted_qty: string;
  qc_rejected_qty: string;
  posting_pending_count: number;
  posted_count: number;
  failed_count: number;
  partially_posted_count: number;
}

// GRPO Attachment (linked to a posted GRPO)
export interface GRPOAttachment extends ControlledDocumentFields {
  id: number;
  file: string;
  original_filename: string;
  sap_attachment_status: AttachmentStatus;
  sap_absolute_entry: number | null;
  sap_error_message: string | null;
  uploaded_at: string;
  uploaded_by: number | null;
}

export interface GRPOInspectionReportParameter {
  id: number;
  parameter_master: number;
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  parameter_type: 'NUMERIC' | 'TEXT' | 'BOOLEAN' | 'RANGE';
  min_value: string | null;
  max_value: string | null;
  uom: string;
  result_value: string;
  result_numeric: number | null;
  is_within_spec: boolean | null;
  remarks: string;
}

export interface GRPOInspectionReportAttachment {
  id: number;
  file: string;
  attachment_type: 'CERTIFICATE_OF_ANALYSIS' | 'CERTIFICATE_OF_QUANTITY';
  uploaded_at: string;
}

export interface GRPOInspectionReport {
  id: number;
  arrival_slip_id: number;
  po_item_receipt_id: number;
  po_item_code: string;
  item_name: string;
  vehicle_entry_id: number | null;
  entry_no: string | null;
  report_no: string;
  internal_lot_no: string;
  internal_report_no: string;
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
  material_type_name: string | null;
  final_status: QCStatus;
  workflow_status: string;
  effective_final_status?: QCStatus;
  chemist_decision?: InspectionDecisionInfo;
  manager_decision?: InspectionDecisionInfo;
  qc_stage?: QCStage;
  qc_decision?: InspectionDecision | null;
  remarks: string;
  qa_chemist_name: string | null;
  qa_chemist_approved_at: string | null;
  qa_chemist_remarks: string;
  qam_name: string | null;
  qam_approved_at: string | null;
  qam_remarks: string;
  parameter_results: GRPOInspectionReportParameter[];
  attachments: GRPOInspectionReportAttachment[];
  created_at: string;
  updated_at: string;
}

// Extra charge for GRPO posting
export interface ExtraCharge {
  expense_code: number;
  amount: number;
  remarks?: string;
  tax_code?: string;
}

// Pending entry (GET /pending/)
export interface PendingGRPOEntry {
  vehicle_entry_id: number;
  entry_no: string;
  status: string;
  entry_time: string;
  po_date: string | null;
  total_po_count: number;
  posted_po_count: number;
  pending_po_count: number;
  is_fully_posted: boolean;
}

// Preview item (nested in preview response)
export interface PreviewItem {
  po_item_receipt_id: number;
  item_code: string;
  item_name: string;
  ordered_qty: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  uom: string;
  qc_status: QCStatus;
  qc_decision?: InspectionDecision | null;
  arrival_slip_id: number | null;
  inspection_id: number | null;
  inspection_report_no: string | null;
  unit_price: string | null;
  tax_code: string | null;
  warehouse_code: string | null;
  gl_account: string | null;
  variety: string | null;
  sap_line_num: number | null;
}

// Preview PO receipt (GET /preview/{id}/)
export interface PreviewPOReceipt {
  vehicle_entry_id: number;
  entry_no: string;
  entry_status: string;
  entry_date?: string;
  is_ready_for_grpo: boolean;
  po_receipt_id: number;
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  po_date: string | null;
  invoice_no: string;
  invoice_date: string;
  challan_no: string;
  items: PreviewItem[];
  grpo_status: GRPOStatus | null;
  sap_doc_num: number | null;
  sap_doc_entry: number | null;
  branch_id: number | null;
  vendor_ref: string;
}

// Post request item
export interface PostGRPOItemRequest {
  po_item_receipt_id: number;
  accepted_qty: number;
  unit_price?: number;
  tax_code?: string;
  gl_account?: string;
  variety?: string;
}

// Post request (POST /post/)
export interface PostGRPORequest {
  vehicle_entry_id: number;
  po_receipt_ids: number[];
  items: PostGRPOItemRequest[];
  branch_id: number;
  warehouse_code?: string;
  comments?: string;
  vendor_ref?: string;
  tare_weight?: number;
  extra_charges?: ExtraCharge[];
  attachments?: File[];
  doc_date?: string;
  doc_due_date?: string;
  tax_date?: string;
  should_roundoff?: boolean;
}

// Saved GRPO draft payload — the request stored on a DRAFT/FAILED posting so it
// can be re-posted (or edited and re-posted). Same shape as a post request minus
// the local File attachments, which live as server-side GRPOAttachment rows.
export type GRPODraftPayload = Omit<PostGRPORequest, 'attachments'>;

// Attachment result in post response
export interface PostGRPOAttachmentResult {
  id: number;
  original_filename: string;
  sap_attachment_status: AttachmentStatus;
  sap_absolute_entry: number | null;
  sap_error_message: string | null;
}

// Post success response
export interface PostGRPOResponse {
  success: boolean;
  grpo_posting_id: number;
  sap_doc_entry: number;
  sap_doc_num: number;
  sap_doc_total: number;
  message: string;
  attachments: PostGRPOAttachmentResult[];
}

// History line item
export interface GRPOHistoryLine {
  id: number;
  item_code: string;
  item_name: string;
  quantity_posted: string;
  base_entry: number | null;
  base_line: number | null;
  // QC traceability — used to reprint the QC inspection report from history
  arrival_slip_id: number | null;
  inspection_id: number | null;
  inspection_report_no: string;
}

// History entry (GET /history/ and GET /{posting_id}/)
export interface GRPOHistoryEntry {
  id: number;
  vehicle_entry: number;
  entry_no: string;
  po_receipt: number;
  po_number: string;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  sap_doc_total: string;
  status: GRPOStatus;
  /** True when a later successful posting for the same PO resolved this failure (hidden from the Failed list). */
  is_superseded?: boolean;
  error_message: string | null;
  posted_at: string | null;
  posted_by: number | null;
  created_at: string;
  updated_at?: string;
  lines: GRPOHistoryLine[];
  attachments: GRPOAttachment[];
  // Merged GRPO fields
  is_merged?: boolean;
  po_numbers?: string[];
  merged_po_receipts?: number[];
  /** Saved posting request, present on DRAFT/FAILED postings for re-posting. */
  request_payload?: GRPODraftPayload | null;
}

// Supplier group for pending entries (used for merge selection)
export interface PendingSupplierGroup {
  supplier_code: string;
  supplier_name: string;
  po_count: number;
  can_merge: boolean;
  po_receipts: {
    po_receipt_id: number;
    po_number: string;
    supplier_code: string;
    supplier_name: string;
    branch_id: number | null;
    item_count: number;
    po_date: string | null;
  }[];
}

// Enhanced pending entry with supplier grouping
export interface PendingGRPOEntryWithSuppliers extends PendingGRPOEntry {
  suppliers?: PendingSupplierGroup[];
}

// Phase of a gate entry as surfaced to the GRPO operator
export type EntryPhase = 'GATE' | 'QC' | 'DONE' | 'CANCELLED';

// Compact supplier summary used in the All Entries view
export interface AllGRPOEntrySupplier {
  supplier_code: string;
  supplier_name: string;
  po_count: number;
}

// Per-item QC verdict for the All Entries read-only drill-down
export interface AllGRPOEntryItemQC {
  po_item_receipt_id: number;
  item_code: string;
  item_name: string;
  received_qty: string;
  accepted_qty: string;
  rejected_qty: string;
  uom: string;
  qc_status: QCStatus;
  arrival_slip_id: number | null;
  inspection_id: number | null;
  inspection_report_no: string | null;
}

// Per-PO (bill) QC summary for the All Entries read-only drill-down
export interface AllGRPOEntryPOQC {
  po_receipt_id: number;
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  is_ready_for_grpo: boolean;
  is_posted: boolean;
  items: AllGRPOEntryItemQC[];
}

// All-entries row (GET /grpo/all-entries/)
export interface AllGRPOEntry {
  vehicle_entry_id: number;
  entry_no: string;
  status: string;
  status_label: string;
  phase: EntryPhase;
  is_ready_for_grpo: boolean;
  is_fully_posted: boolean;
  entry_time: string | null;
  total_po_count: number;
  posted_po_count: number;
  pending_po_count: number;
  suppliers: AllGRPOEntrySupplier[];
  po_numbers: string[];
  po_receipts: AllGRPOEntryPOQC[];
}

// Booked dispatch plan shown in Service GRPO pending queue
/** Why a queued booking cannot be posted yet — exactly what the post form
 *  refuses to submit without. Freight is deliberately absent: the operator
 *  types the amount on the form, so a booking without one is still postable. */
export type ServiceGRPOBlocker = 'NO_BILTY_NO' | 'NO_BILTY_ATTACHMENT';

/** READY once nothing is missing. A booked truck has no bilty until it has
 *  gone, so AWAITING_BILTY is a stage in the flow, not a fault. */
export type ServiceGRPOStage = 'READY' | 'AWAITING_BILTY';

/** KPIs and breakdowns over the Service GRPO queue, for the page header.
 *  Built from the same queue the table renders, so the two always agree. */
export interface ServiceGRPOSummary {
  period: { year: number | null; month: number | null };
  queue: {
    total: number;
    ready: number;
    awaiting_bilty: number;
    oldest_days: number;
    /** How many queued bookings already carry a freight figure. Not a blocker. */
    freight_known: number;
    freight_value: string;
    age_buckets: Record<'0-7' | '8-30' | '31-90' | '90+' | 'undated', number>;
  };
  postings: {
    posted: number;
    posted_value: string;
    failed: number;
    pending: number;
  };
  by_transporter: { transporter_name: string; count: number }[];
  by_state: { state: string; count: number }[];
}

export interface ServiceGRPOPendingEntry {
  dispatch_plan_id: number;
  stage?: ServiceGRPOStage;
  blockers?: ServiceGRPOBlocker[];
  /** Days since dispatch; null when the booking has no dispatch date. */
  age_days?: number | null;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  booking_status: string;
  dispatch_date: string | null;
  vehicle_no: string;
  driver_name: string;
  transporter_name: string;
  transporter_gstin: string;
  linked_vehicle_entry_id?: number | null;
  linked_vehicle_entry_no?: string;
  source_state?: string;
  bilty_no: string;
  bilty_date: string | null;
  freight: string | null;
  total_freight: string | null;
  invoice_count?: number;
  invoice_number?: string;
  eway_bill?: string;
  invoice_weight?: string | null;
  invoice_amount?: string | null;
  place_of_supply?: string;
  product_variety?: string;
  total_litres?: string | null;
  effective_month?: string | null;
  budget_delivery_point?: string;
  service_location_code?: number | null;
  service_location_name?: string;
  sac_entry?: number | null;
  sac_code?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceGRPOPreview extends ServiceGRPOPendingEntry {
  is_ready_for_grpo: boolean;
  default_amount: string;
  default_service_description: string;
  default_place_of_supply: string;
  default_effective_month: string | null;
  default_budget_delivery_point: string;
  default_location_code: number | null;
  default_location_name: string;
  default_sac_entry: number | null;
  default_sac_code: string;
  default_product_variety: string;
  default_product_dimension?: string;
  default_total_litres: string | null;
  default_sub_account: string;
  invoice_number: string;
  eway_bill: string;
  invoice_weight: string | null;
  invoice_amount: string | null;
  source_state: string;
  source_city: string;
  item_summary: string;
  bilty_attachment: string | null;
  bilty_attachment_name: string;
  grpo_status: GRPOStatus | null;
  sap_doc_num: number | null;
  total_amount: string | null;
  invoice_lines: ServiceGRPOInvoiceLinePreview[];
}

export interface ServiceGRPOInvoiceLinePreview {
  dispatch_plan_id: number;
  sap_invoice_doc_entry: number;
  sap_invoice_doc_num: string;
  invoice_number: string;
  customer_code: string;
  customer_name: string;
  source_state: string;
  source_city: string;
  service_description: string;
  product_variety: string;
  product_dimension?: string;
  total_litres: string | null;
  invoice_weight: string | null;
  invoice_amount: string | null;
  freight_amount: string | null;
}

export interface PostServiceGRPORequest {
  dispatch_plan_id: number;
  vendor_code: string;
  branch_id: number;
  service_description: string;
  amount: number;
  tax_code?: string;
  gl_account?: string;
  unit_price?: number;
  place_of_supply?: string;
  effective_month?: string | null;
  budget_delivery_point?: string;
  sub_account?: string;
  location_code?: number | null;
  location_name?: string;
  sac_entry?: number | null;
  sac_code?: string;
  product_variety?: string;
  total_litres?: number | null;
  invoice_number?: string;
  eway_bill?: string;
  invoice_weight?: number | null;
  invoice_amount?: number | null;
  bilty_no?: string;
  bilty_date?: string | null;
  comments?: string;
  vendor_ref?: string;
  extra_charges?: ExtraCharge[];
  attachments?: File[];
  include_bilty_attachment?: boolean;
  doc_date?: string;
  doc_due_date?: string;
  tax_date?: string;
  should_roundoff?: boolean;
}

export interface PostServiceGRPOResponse {
  success: boolean;
  service_grpo_posting_id: number;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  sap_doc_total: number | null;
  message: string;
  attachments: PostGRPOAttachmentResult[];
}

export interface ServiceGRPOBranchOption {
  branch_id: number;
  branch_name: string;
  state?: string;
}

export interface ServiceGRPOTaxCodeOption {
  tax_code: string;
  tax_name: string;
  rate: number | null;
}

export interface ServiceGRPOGLAccountOption {
  account_code: string;
  account_name: string;
}

export interface ServiceGRPOSACCodeOption {
  sac_entry: number;
  sac_code: string;
  sac_name: string;
}

export interface ServiceGRPOLocationOption {
  location_code: number;
  location_name: string;
  state: string;
}

export interface ServiceGRPOVarietyOption {
  variety_code: string;
  variety_name: string;
}

export interface ServiceGRPOProjectOption {
  project_code: string;
  project_name: string;
}

export interface ServiceGRPOSubAccountOption {
  sub_account_code: string;
  sub_account_name: string;
}

export interface ServiceGRPOExpenseCodeOption {
  expense_code: number;
  expense_name: string;
  expense_account: string;
  revenue_account: string;
  sac_code: string;
}

export interface ServiceGRPOOptions {
  branches: ServiceGRPOBranchOption[];
  tax_codes: ServiceGRPOTaxCodeOption[];
  gl_accounts: ServiceGRPOGLAccountOption[];
  sac_codes: ServiceGRPOSACCodeOption[];
  locations: ServiceGRPOLocationOption[];
  varieties?: ServiceGRPOVarietyOption[];
  projects: ServiceGRPOProjectOption[];
  sub_accounts: ServiceGRPOSubAccountOption[];
  expense_codes: ServiceGRPOExpenseCodeOption[];
}

export interface ServiceGRPOHistoryLine {
  id: number;
  dispatch_plan: number | null;
  service_description: string;
  amount: string;
  unit_price: string | null;
  tax_code: string;
  gl_account: string;
  sac_entry: number | null;
  sac_code: string;
  location_code: number | null;
  location_name: string;
  project_code: string;
  sub_account: string;
  product_variety: string;
  total_litres: string | null;
}

export interface ServiceGRPOHistoryEntry {
  id: number;
  dispatch_plan: number;
  dispatch_bill_no: string;
  bilty_no: string;
  bilty_date: string | null;
  sap_invoice_doc_entry: number;
  vehicle_no: string;
  transporter_name: string;
  linked_vehicle_entry_id?: number | null;
  linked_vehicle_entry_no?: string;
  vendor_code: string;
  vendor_name: string;
  sap_doc_entry: number | null;
  sap_doc_num: number | null;
  sap_doc_total: string | null;
  total_amount: string | null;
  place_of_supply: string;
  effective_month: string | null;
  budget_delivery_point: string;
  sub_account: string;
  location_code: number | null;
  location_name: string;
  sac_entry: number | null;
  sac_code: string;
  product_variety: string;
  total_litres: string | null;
  status: GRPOStatus;
  error_message: string | null;
  posted_at: string | null;
  posted_by: number | null;
  created_at: string;
  lines: ServiceGRPOHistoryLine[];
  attachments: GRPOAttachment[];
}
