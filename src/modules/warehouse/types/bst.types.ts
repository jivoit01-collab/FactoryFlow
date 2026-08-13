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

// What SAP document a BST is sourced from — a stock transfer (intra-company) or
// an invoice / "dispatch bill" (a cross-company sale, e.g. JIVO OIL → JIVO MART).
export type BSTSourceType = 'STOCK_TRANSFER' | 'INVOICE';

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

// A SAP source document for a BST — a stock transfer OR an invoice. The
// invoice-only fields are empty for stock transfers, and `to_warehouse` is empty
// for invoices (the destination is a company/customer, not a warehouse).
export interface SAPStockTransfer {
  document_type?: BSTSourceType;
  doc_entry: number;
  doc_num: string;
  doc_date: string | null;
  from_warehouse: string;
  to_warehouse: string;
  /** All source warehouses on the document, comma-separated (display). */
  warehouses?: string;
  comments: string;
  reference: string;
  /** Invoice customer (INVOICE documents only). */
  card_code?: string;
  card_name?: string;
  line_count: number;
  total_quantity: number;
  /** Bill box count (INVOICE documents; stock transfers carry it per line). */
  total_boxes?: number;
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

// A hand-typed quantity for a scan-exempt (packaging-material) line. PM isn't
// barcode-tracked, so it has no box scans — the sender types what actually moved.
// One row per item code, aggregated across the entry's SAP documents.
export interface BSTManualEntry {
  id: number;
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
  notes: string;
  entered_by_name: string;
  entered_at: string;
}

export interface BSTManualEntryPayload {
  item_code: string;
  /** null clears the entry (distinct from 0, which means "nothing went"). */
  quantity: string | number | null;
  notes?: string;
}

export interface BSTTransferListItem {
  id: number;
  entry_no: string;
  status: BSTTransferStatus;
  source_type: BSTSourceType;
  company_code: string;
  company_name: string;
  /** Receiving company for an INVOICE (cross-company) transfer; null otherwise. */
  destination_company: number | null;
  destination_company_code: string;
  destination_company_name: string;
  /** Invoice customer snapshot (INVOICE transfers only). */
  customer_code: string;
  customer_name: string;
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

// Per-item scanned-vs-expected QUANTITY completeness (one row per item code,
// aggregated across the entry's documents). Mirrors the backend
// warehouse.services.bst_service.scan_status_payload.
export interface BSTScanStatusItem {
  item_code: string;
  item_name: string;
  uom: string;
  expected_qty: string;
  scanned_qty: string;
  expected_boxes: number;
  scanned_boxes: number;
  is_complete: boolean;
  is_over: boolean;
  /** False for packaging-material (PM) lines, which never require box scanning. */
  requires_scan: boolean;
  /** Hand-typed quantity for a scan-exempt line; null when nothing was entered. */
  manual_qty: string | null;
}

// The sender's completeness gate: whether the scanned QUANTITY reaches the bill.
// `is_partial` drives the "scan all boxes" lock and the same rule blocks approve()
// on the backend, so the two can't disagree. `uses_quantity` is false only for
// legacy/quantity-less scans, where completeness falls back to the box count.
// `requires_scanning` is false for a PM-only bill — it needs no scanning to seal.
export interface BSTScanStatus {
  is_partial: boolean;
  has_scans: boolean;
  requires_scanning: boolean;
  uses_quantity: boolean;
  scanned_qty: string;
  expected_qty: string;
  scanned_boxes: number;
  expected_boxes: number;
  short_items: BSTScanStatusItem[];
  items: BSTScanStatusItem[];
}

export type BSTPartialTransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Full admin partial-transfer approval record (the admin review queue rows).
export interface BSTPartialTransferRequest {
  id: number;
  transfer: number;
  transfer_entry_no: string;
  scanned_qty: string;
  expected_qty: string;
  reason: string;
  status: BSTPartialTransferStatus;
  requested_by_name: string;
  requested_at: string;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
}

// Compact snapshot of a transfer's latest partial-transfer request, embedded in
// the transfer detail so the sender's lock can show pending / unlock on approval.
export interface BSTPartialTransferState {
  id: number;
  status: BSTPartialTransferStatus;
  is_pending: boolean;
  is_approved: boolean;
  reason: string;
  review_notes: string;
  scanned_qty: string;
  expected_qty: string;
  requested_by_name: string;
  requested_at: string;
  reviewed_by_name: string;
  reviewed_at: string | null;
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
  scan_status: BSTScanStatus;
  /** Latest admin partial-transfer approval request, or null if none raised. */
  partial_transfer: BSTPartialTransferState | null;
  docs: BSTTransferDoc[];
  items: BSTTransferItem[];
  box_scans: BSTBoxScan[];
  /** Hand-typed quantities for the scan-exempt (PM) lines. */
  manual_entries: BSTManualEntry[];
  updated_at: string;
}

export interface BSTCreatePayload {
  /** STOCK_TRANSFER (default) or INVOICE (cross-company dispatch bill). */
  document_type?: BSTSourceType;
  /**
   * One or more SAP documents. Source warehouses may differ (virtual warehouses);
   * STOCK_TRANSFER docs must share the same destination warehouse; INVOICE docs
   * the same customer.
   */
  sap_doc_entries: number[];
  /** Required for an INVOICE transfer: the receiving company. */
  destination_company?: number | null;
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
