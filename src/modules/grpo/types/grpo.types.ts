// Warehouse (from /po/warehouses/)
export interface Warehouse {
  warehouse_code: string;
  warehouse_name: string;
}

// GRPO Status
export type GRPOStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'PARTIALLY_POSTED';

// QC Status (used in preview items)
export type QCStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'NO_ARRIVAL_SLIP'
  | 'ARRIVAL_SLIP_PENDING'
  | 'INSPECTION_PENDING';

// Pending entry (GET /pending/)
export interface PendingGRPOEntry {
  vehicle_entry_id: number;
  entry_no: string;
  status: string;
  entry_time: string;
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
}

// Preview PO receipt (GET /preview/{id}/)
export interface PreviewPOReceipt {
  vehicle_entry_id: number;
  entry_no: string;
  entry_status: string;
  is_ready_for_grpo: boolean;
  po_receipt_id: number;
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  invoice_no: string;
  invoice_date: string;
  challan_no: string;
  items: PreviewItem[];
  grpo_status: GRPOStatus | null;
  sap_doc_num: number | null;
}

// Post request (POST /post/)
export interface PostGRPORequest {
  vehicle_entry_id: number;
  po_receipt_id: number;
  items: { po_item_receipt_id: number; accepted_qty: number }[];
  branch_id: number;
  warehouse_code?: string;
  comments?: string;
}

// Post success response
export interface PostGRPOResponse {
  success: boolean;
  grpo_posting_id: number;
  sap_doc_entry: number;
  sap_doc_num: number;
  sap_doc_total: number;
  message: string;
}

// History line item
export interface GRPOHistoryLine {
  id: number;
  item_code: string;
  item_name: string;
  quantity_posted: string;
  base_entry: number | null;
  base_line: number | null;
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
  error_message: string | null;
  posted_at: string | null;
  posted_by: number | null;
  created_at: string;
  lines: GRPOHistoryLine[];
}
