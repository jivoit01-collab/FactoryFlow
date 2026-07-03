// Branch Stock Transfer (BST) — types mirroring the warehouse `/warehouse/bst/`
// API. A warehouse user creates a BST from a SAP stock-transfer document, scans
// boxes/pallets, and dispatches; the destination branch receives by scanning and
// accepting/rejecting. See the backend warehouse.models_bst module.

export type BSTTransferStatus =
  | 'DRAFT'
  | 'SCANNING'
  | 'DISPATCHED'
  | 'AWAITING_GATE_OUT'
  | 'GATED_OUT'
  | 'IN_TRANSIT'
  | 'AWAITING_GATE_IN'
  | 'GATED_IN'
  | 'ARRIVED'
  | 'RECEIVING'
  | 'RECEIVED'
  | 'PARTIALLY_RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export type BSTReceiveStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface SAPStockTransferLine {
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: number;
  uom: string;
  from_warehouse: string;
  to_warehouse: string;
  /** Pieces per carton (SAP item-master sales factor). */
  pcs_per_carton?: number;
  /** Box count = quantity ÷ pieces-per-carton (the bill's box count). */
  box_count?: number;
}

export interface SAPStockTransfer {
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  from_warehouse: string;
  to_warehouse: string;
  comments: string;
  reference: string;
  line_count: number;
  total_quantity: number;
  lines?: SAPStockTransferLine[];
}

export interface BSTTransferItem {
  id: number;
  /** The BSTTransferDoc this line came from (for grouping the bill by document). */
  doc: number | null;
  /** SAP document number this line belongs to. */
  sap_doc_num: string;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
  from_warehouse: string;
  to_warehouse: string;
  expected_boxes: number;
}

/** One SAP stock-transfer document included in a BST entry. */
export interface BSTTransferDoc {
  id: number;
  sap_doc_entry: number;
  sap_doc_num: string;
  sap_doc_date: string | null;
  sap_reference: string;
  invoice_no: string;
  item_count: number;
  expected_box_count: number;
}

export interface BSTBoxScan {
  id: number;
  box: number | null;
  pallet: number | null;
  box_barcode: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  quantity: string;
  uom: string;
  warehouse_code: string;
  pallet_code: string;
  scanned_by_name: string;
  scanned_at: string;
  receive_status: BSTReceiveStatus;
  reject_reason: string;
  is_unexpected: boolean;
  received_by_name: string;
  received_at: string | null;
}

export interface BSTTransferListItem {
  id: number;
  entry_no: string;
  status: BSTTransferStatus;
  company_code: string;
  company_name: string;
  sap_doc_entry: number | null;
  sap_doc_num: string;
  sap_doc_date: string | null;
  sap_from_warehouse: string;
  sap_to_warehouse: string;
  sap_reference: string;
  invoice_no: string;
  vehicle_number: string | null;
  driver_name: string | null;
  requires_gate: boolean;
  scanned_box_count: number;
  item_count: number;
  /** Number of SAP documents combined into this entry. */
  doc_count: number;
  scan_approved_at: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  created_at: string;
}

export interface BSTTransferDetail extends BSTTransferListItem {
  remarks: string;
  cancel_reason: string;
  gated_out_at: string | null;
  gated_in_at: string | null;
  created_by_name: string;
  scan_approved_by_name: string;
  dispatched_by_name: string;
  received_by_name: string;
  accepted_count: number;
  rejected_count: number;
  docs: BSTTransferDoc[];
  items: BSTTransferItem[];
  box_scans: BSTBoxScan[];
  updated_at: string;
}

export interface BSTCreatePayload {
  /** One or more SAP documents; they must share the same source & destination warehouse. */
  sap_doc_entries: number[];
  // Required only when requires_gate (the vehicle leaves the factory).
  vehicle?: number | null;
  driver?: number | null;
  invoice_no?: string;
  requires_gate?: boolean;
  remarks?: string;
}

export interface BSTUpdatePayload {
  vehicle?: number;
  driver?: number;
  invoice_no?: string;
  requires_gate?: boolean;
  remarks?: string;
}

export interface BSTScanResult {
  kind: 'BOX' | 'PALLET';
  created: BSTBoxScan[];
  created_count: number;
  duplicate_count: number;
  duplicates: string[];
}

export interface BSTBatchScanResult {
  saved: Array<{ barcode: string; created_count: number; duplicate_count: number }>;
  failed: Array<{ barcode: string; reason: string }>;
}

export interface BSTReceiveScanPayload {
  barcode_raw: string;
  decision?: 'ACCEPTED' | 'REJECTED';
  reject_reason?: string;
}

export interface BSTReceiveScanResult {
  decision: 'ACCEPTED' | 'REJECTED';
  updated_count: number;
  unexpected: string[];
}
