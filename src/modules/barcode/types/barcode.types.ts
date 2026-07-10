// ============================================================================
// Status Types
// ============================================================================

export type PalletStatus =
  | 'ACTIVE'
  | 'PARTIAL'
  | 'DISPATCHED'
  | 'EMPTY'
  | 'INACTIVE'
  | 'CLEARED'
  | 'SPLIT'
  | 'VOID';
export type BoxStatus = 'ACTIVE' | 'PARTIAL' | 'DISPATCHED' | 'DISMANTLED' | 'VOID';
export type LabelType = 'BOX' | 'PALLET' | 'BIN' | 'WAREHOUSE';
export type PrintType = 'ORIGINAL' | 'REPRINT';
export type PalletMovementType =
  | 'CREATE'
  | 'MOVE'
  | 'TRANSFER'
  | 'DISPATCH'
  | 'REMOVE_FOR_DISPATCH'
  | 'DISMANTLE'
  | 'CLEAR'
  | 'SPLIT'
  | 'VOID';
export type BoxMovementType =
  | 'CREATE'
  | 'MOVE'
  | 'TRANSFER'
  | 'PALLETIZE'
  | 'DEPALLETIZE'
  | 'DISPATCH'
  | 'REMOVE_FOR_DISPATCH'
  | 'DISMANTLE'
  | 'VOID';

// ============================================================================
// Box
// ============================================================================

export interface Box {
  id: number;
  box_barcode: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  pallet: number | null;
  pallet_code: string;
  current_warehouse: string;
  current_bin: string;
  status: BoxStatus;
  dispatch_session: number | null;
  dispatched_at: string | null;
  removed_from_pallet_at: string | null;
  removed_from_pallet_reason: string;
  production_line: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface BoxTraceLoose {
  id: number;
  qty: string;
  reason: string;
  status: string;
  repacked_into_box_id: number | null;
  repacked_into_barcode: string;
  created_at: string;
}

export interface BoxTraceSource {
  id: number;
  qty: string;
  reason: string;
  source_box_id: number | null;
  source_box_barcode: string;
  created_at: string;
}

export interface BoxDetail extends Box {
  barcode_data: Record<string, unknown>;
  production_run: number | null;
  updated_at: string;
  movements: BoxMovement[];
  dismantled_into: BoxTraceLoose[];
  repacked_from: BoxTraceSource[];
}

export interface BoxMovement {
  id: number;
  movement_type: BoxMovementType;
  from_warehouse: string;
  to_warehouse: string;
  from_bin: string;
  to_bin: string;
  from_pallet: number | null;
  from_pallet_id: string;
  to_pallet: number | null;
  to_pallet_id: string;
  performed_by: number | null;
  performed_by_name: string;
  performed_at: string;
}

// ============================================================================
// Pallet
// ============================================================================

export interface Pallet {
  id: number;
  pallet_id: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  box_count: number;
  total_boxes: number;
  available_boxes: number;
  dispatched_boxes: number;
  max_box_count: number;
  total_qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  current_warehouse: string;
  current_bin: string;
  status: PalletStatus;
  dispatch_session: number | null;
  dispatched_at: string | null;
  production_line: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface PalletDetail extends Pallet {
  barcode_data: Record<string, unknown>;
  production_run: number | null;
  updated_at: string;
  boxes: Box[];
  dismantled_boxes: Box[];
  movements: PalletMovement[];
}

export interface PalletMovement {
  id: number;
  movement_type: PalletMovementType;
  from_warehouse: string;
  to_warehouse: string;
  from_bin: string;
  to_bin: string;
  sap_transfer_doc_entry: number | null;
  quantity: string;
  performed_by: number | null;
  performed_by_name: string;
  performed_at: string;
  notes: string;
}

export interface PalletBoxHistory {
  id: number;
  pallet: number;
  pallet_barcode: string;
  box: number;
  box_barcode: string;
  action: string;
  old_status: string;
  new_status: string;
  dispatch_session: number | null;
  bill_number: string;
  remarks: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

// ============================================================================
// Pallet Reconcile / Verify
// ============================================================================

export type PalletReconcileForeignReason =
  | 'ON_OTHER_PALLET'
  | 'UNPALLETIZED'
  | 'DISPATCHED'
  | 'VOID'
  | 'PALLET_LABEL'
  | 'NOT_FOUND';

export interface PalletReconcileBoxBrief {
  id: number;
  box_barcode: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  status: string;
  current_warehouse: string;
  pallet_id: string | null;
}

export interface PalletReconcileForeign {
  barcode: string;
  box: PalletReconcileBoxBrief | null;
  current_pallet_code: string | null;
  reason: PalletReconcileForeignReason;
  item_matches_pallet: boolean;
}

export interface PalletReconcileApplied {
  pulled: string[];
  dropped: string[];
  skipped: { barcode: string; reason: PalletReconcileForeignReason }[];
  reason: string;
}

export interface PalletReconcileResult {
  pallet: {
    id: number;
    pallet_id: string;
    item_code: string;
    item_name: string;
    batch_number: string;
    status: PalletStatus;
    box_count: number;
  };
  expected_count: number;
  scanned_count: number;
  matched: PalletReconcileBoxBrief[];
  missing: PalletReconcileBoxBrief[];
  foreign: PalletReconcileForeign[];
  unlabeled_count: number;
  is_fully_reconciled: boolean;
  recover: {
    unlabeled_count: number;
    eligible: boolean;
    boxes: PalletReconcileBoxBrief[];
  };
  /** Present only on an apply request — a summary of what was moved. */
  applied?: PalletReconcileApplied;
}

export interface PalletReconcilePayload {
  scanned_barcodes: string[];
  unlabeled_count?: number;
  apply?: boolean;
  pull_foreign?: boolean;
  drop_missing?: boolean;
  reason?: string;
}

// ============================================================================
// Pallet Verify Requests (ticket workflow)
// ============================================================================

export type PalletVerifyRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
export type PalletVerifyRequestSource = 'MANUAL' | 'DISPATCH';

export interface PalletVerifyRequestListItem {
  id: number;
  pallet: number;
  pallet_code: string;
  item_code: string;
  item_name: string;
  status: PalletVerifyRequestStatus;
  source: PalletVerifyRequestSource;
  source_reference: string;
  reason: string;
  requested_by: number | null;
  requested_by_name: string;
  requested_at: string;
  resolved_by: number | null;
  resolved_by_name: string;
  resolved_at: string | null;
  resolution_note: string;
  missing_count: number;
  foreign_count: number;
  updated_at: string;
}

export interface PalletVerifyRequestDetail extends PalletVerifyRequestListItem {
  findings: PalletReconcileResult;
}

export interface PalletVerifyRequestCreatePayload {
  pallet_id: number;
  reason?: string;
  source?: PalletVerifyRequestSource;
  source_reference?: string;
  scanned_barcodes?: string[];
  unlabeled_count?: number;
}

export interface PalletVerifyRequestResolvePayload {
  resolution_note?: string;
}

export interface PalletVerifyRequestCancelPayload {
  reason?: string;
}

export interface PalletVerifyRequestFilters extends PaginationParams {
  status?: string;
  pallet_id?: string;
}

// ============================================================================
// Request Payloads
// ============================================================================

export interface GenerateBoxesPayload {
  item_code: string;
  item_name?: string;
  batch_number: string;
  qty: number;
  box_count: number;
  uom?: string;
  g_weight?: number;
  n_weight?: number;
  mfg_date: string;
  exp_date?: string;
  warehouse: string;
  production_line?: string;
  production_run_id?: number;
}

export interface CreatePalletPayload {
  box_ids?: number[];
  warehouse?: string;
  production_line?: string;
  production_run_id?: number;
  item_code?: string;
  item_name?: string;
  batch_number?: string;
  total_qty?: number;
  uom?: string;
  mfg_date?: string;
  exp_date?: string;
  max_box_count?: number;
}

export interface ProductionReleaseOilRow {
  doc_entry: number | null;
  doc_num: number | null;
  post_date: string;
  item_code: string;
  item_name: string;
  liter_countable: string;
  man_btch_num: string;
  planned_qty: string;
  box_count: string;
  liter: string;
  box_size: string;
  volume_per_pc: string;
  volume_per_box: string;
  batch_number: string;
  mfg_date: string;
  exp_date: string;
  status: string;
}

export interface OitmItemRow {
  item_code: string;
  item_name: string;
  inventory_uom: string;
  sales_uom: string;
  purchase_uom: string;
  item_group_code: number | null;
  manage_batch_numbers: boolean;
  manage_serial_numbers: boolean;
  is_inventory_item: boolean;
  is_sales_item: boolean;
  is_purchase_item: boolean;
  valid_for: boolean;
  frozen_for: boolean;
}

export interface VoidPayload {
  reason?: string;
}

export interface PalletMovePayload {
  to_warehouse: string;
  /** Destination location/bin code — required when the destination is an own (WMS) warehouse. */
  to_bin?: string;
  notes?: string;
}

export interface PalletClearPayload {
  notes?: string;
}

export interface PalletSplitPayload {
  box_ids: number[];
  target_pallet_id: number;
}

export interface PalletAddBoxesPayload {
  box_ids: number[];
}

export interface PalletRemoveBoxesPayload {
  box_ids: number[];
}

export interface BoxTransferPayload {
  box_ids: number[];
  to_warehouse: string;
  /** Destination location/bin code — required when the destination is an own (WMS) warehouse. */
  to_bin?: string;
  to_pallet_id?: number | null;
}

export type IntercompanyTransferStatus = 'DRAFT' | 'COMPLETED' | 'REVERSED' | 'SAP_SYNC_FAILED';
export type IntercompanyTransferType = 'BOX' | 'PALLET';

export interface IntercompanyScannedBarcode {
  id: number;
  entity_type: IntercompanyTransferType;
  barcode: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  box_count?: number;
  current_company: string;
  current_company_name: string;
  current_warehouse: string;
  status: BoxStatus | PalletStatus;
  dispatch_status: string;
}

export interface IntercompanyTransferLine {
  id: number;
  box: number;
  barcode: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  from_company_code: string;
  from_company_name: string;
  to_company_code: string;
  to_company_name: string;
  created_at: string;
}

export interface IntercompanyTransfer {
  id: number;
  transfer_number: string;
  source_company_code: string;
  source_company_name: string;
  destination_company_code: string;
  destination_company_name: string;
  entity_type: IntercompanyTransferType;
  status: IntercompanyTransferStatus;
  total_barcodes: number;
  total_qty: string;
  uom: string;
  sap_enabled: boolean;
  sap_doc_entry: number | null;
  sap_doc_num: string;
  sap_status: string;
  sap_error: string;
  notes: string;
  device_id: string;
  reversed_at: string | null;
  reversed_by_name: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  lines: IntercompanyTransferLine[];
}

export interface IntercompanyDashboard {
  today: {
    transfer_count: number;
    barcode_count: number;
    carton_count: number;
    total_qty: string;
  };
  routes: Array<{
    source_company_code: string;
    source_company_name: string;
    destination_company_code: string;
    destination_company_name: string;
    transfer_count: number;
    barcode_count: number;
    total_qty: string;
  }>;
  recent_transfers: IntercompanyTransfer[];
}

export interface IntercompanyScanPayload {
  barcode: string;
  source_company_code: string;
  destination_company_code: string;
  transfer_type?: IntercompanyTransferType;
  device_id?: string;
}

export interface IntercompanyTransferPayload {
  source_company_code: string;
  destination_company_code: string;
  transfer_type?: IntercompanyTransferType;
  barcodes: string[];
  notes?: string;
  device_id?: string;
  sap_enabled?: boolean;
}

export interface IntercompanyReversePayload {
  reason?: string;
  device_id?: string;
}

export interface BarcodeAuditLog {
  id: number;
  barcode: string;
  transaction_type: string;
  transfer: number | null;
  transfer_number: string;
  from_company_code: string;
  from_company_name: string;
  to_company_code: string;
  to_company_name: string;
  user_name: string;
  device_id: string;
  notes: string;
  created_at: string;
}

export interface BarcodeTraceability {
  barcode: string;
  current_company: string;
  current_company_name: string;
  manufacturing_company: string;
  dispatch_status: string;
  current_location: string;
  history: BarcodeAuditLog[];
}

// ============================================================================
// Filter Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
}

export type ListResponse<T> = T[] | PaginatedResponse<T>;

export interface BoxFilters extends PaginationParams {
  status?: string;
  item_code?: string;
  batch_number?: string;
  warehouse?: string;
  pallet_id?: string;
  unpalletized?: string;
  search?: string;
}

export interface PalletFilters extends PaginationParams {
  status?: string;
  item_code?: string;
  batch_number?: string;
  warehouse?: string;
  search?: string;
}

// ============================================================================
// Label & Print Types
// ============================================================================

export interface LabelData {
  type: 'BOX' | 'PALLET';
  id: number;
  barcode: string;
  qr_payload: string;
  pallet_id?: string;
  box_number?: number | null;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty?: string;
  box_count?: number;
  max_box_count?: number;
  total_qty?: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  production_line: string;
  warehouse: string;
  g_weight?: string;
  n_weight?: string;
}

export interface PrintRequestPayload {
  print_type?: 'ORIGINAL' | 'REPRINT';
  reprint_reason?: string;
  printer_name?: string;
}

export interface BulkPrintItem {
  label_type: 'BOX' | 'PALLET';
  id: number;
  print_type?: 'ORIGINAL' | 'REPRINT';
  reprint_reason?: string;
  printer_name?: string;
}

export interface LabelPrintLog {
  id: number;
  label_type: LabelType;
  reference_id: string;
  reference_code: string;
  print_type: PrintType;
  reprint_reason: string;
  printed_by: number | null;
  printed_by_name: string;
  printed_by_email: string;
  printed_at: string;
  printer_name: string;
}

export interface PrintHistoryFilters extends PaginationParams {
  label_type?: string;
  print_type?: string;
  search?: string;
}

// ============================================================================
// Dismantle, Loose Stock, Repack
// ============================================================================

export type DismantleReason = 'REPACK' | 'SAMPLE' | 'DAMAGED' | 'RETURN' | 'OTHER';
export type LooseStockStatus = 'ACTIVE' | 'REPACKED' | 'CONSUMED';

export interface LooseStock {
  id: number;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  original_qty: string;
  uom: string;
  source_box: number | null;
  source_box_barcode: string;
  source_pallet: number | null;
  source_pallet_id: string;
  reason: DismantleReason;
  reason_notes: string;
  current_warehouse: string;
  status: LooseStockStatus;
  repacked_into_box: number | null;
  repacked_into_barcode: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DismantlePalletPayload {
  box_ids?: number[] | null;
  reason: DismantleReason;
  reason_notes?: string;
}

export interface DismantleBoxPayload {
  qty?: number | null;
  reason: DismantleReason;
  reason_notes?: string;
}

export interface RepackPayload {
  loose_ids: number[];
  qty_per_loose?: Record<number, string>;
  warehouse: string;
}

export interface LooseStockFilters extends PaginationParams {
  status?: string;
  item_code?: string;
  warehouse?: string;
  reason?: string;
  search?: string;
}

// ============================================================================
// Barcode Dispatch
// ============================================================================

export type DispatchSessionStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PARTIAL'
  | 'READY_TO_DISPATCH'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'SAP_SYNC_FAILED';

export type DispatchSapUpdateStatus = 'NOT_CONFIGURED' | 'PENDING' | 'SUCCESS' | 'FAILED';
export type DispatchSapSystemType = 'S4HANA' | 'ECC' | 'BUSINESS_ONE';
export type DispatchSapObjectType = 'BILLING_DOCUMENT' | 'AR_INVOICE' | 'OUTBOUND_DELIVERY';
export type DispatchScanResult = 'ACCEPTED' | 'REJECTED';
export type DispatchScanEntityType = 'ITEM' | 'BOX' | 'PALLET' | 'SERIAL' | 'UNKNOWN';
export type DispatchScannedUnitStatus = 'ACTIVE' | 'REMOVED' | 'DISPATCHED';

export interface DispatchSettings {
  allow_partial_dispatch: boolean;
  allow_partial_pallet_dispatch: boolean;
  allow_box_dispatch_from_pallet: boolean;
  require_sequential_item_scanning: boolean;
  require_sap_sync_on_completion: boolean;
  allow_manual_close: boolean;
  allow_admin_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface DispatchCustomer {
  code: string;
  name: string;
  ship_to_code?: string;
  ship_to_name?: string;
}

export interface DispatchBillLine {
  sequence_no: number;
  sap_line_no: string;
  material_code: string;
  material_description: string;
  quantity: string;
  total_boxes?: string;
  uom: string;
  batch_number?: string;
  warehouse_code?: string;
  serial_required?: boolean;
  reference_delivery_number?: string;
}

export interface DispatchBillLookupResponse {
  source_system: DispatchSapSystemType;
  sap_object_type: DispatchSapObjectType;
  bill_number: string;
  bill_internal_id: string;
  bill_date: string | null;
  already_dispatched: boolean;
  sap_dispatch_status: string;
  reference_delivery_number: string;
  customer: DispatchCustomer;
  lines: DispatchBillLine[];
  raw?: Record<string, unknown>;
}

export interface DispatchSessionLine {
  id: number;
  sequence_no: number;
  sap_line_no: string;
  material_code: string;
  material_description: string;
  bill_qty: string;
  expected_qty?: string;
  scanned_qty: string;
  remaining_qty: string;
  pending_qty?: string;
  bill_boxes?: string;
  expected_boxes?: string;
  scanned_boxes?: string;
  pending_boxes?: string;
  uom: string;
  batch_number: string;
  warehouse_code: string;
  serial_required: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | string;
}

export interface DispatchScanLog {
  id: number;
  line: number | null;
  raw_barcode: string;
  parsed_barcode: Record<string, unknown>;
  entity_type: DispatchScanEntityType;
  scan_type?: DispatchScanEntityType;
  entity_id: string;
  material_code: string;
  parsed_material_code?: string;
  batch_number: string;
  qty: string | null;
  qty_delta?: string | null;
  uom: string;
  pallet_id?: number | null;
  box_id?: number | null;
  result: DispatchScanResult;
  reject_code: string;
  reject_message: string;
  rejection_reason?: string;
  device_id: string;
  ip_address: string;
  scanned_by: number | null;
  scanned_by_name: string;
  scanned_at: string;
  request_id: string | null;
}

export interface DispatchSapSyncLog {
  id: number;
  operation: string;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  status: 'SUCCESS' | 'FAILED' | string;
  error_message: string;
  attempt_no: number;
  created_at: string;
}

export interface DispatchScannedUnit {
  id: number;
  line: number;
  scan_log: number;
  barcode_value: string;
  entity_type: DispatchScanEntityType;
  box: number | null;
  pallet: number | null;
  serial_number: string;
  barcode_type: DispatchScanEntityType;
  box_barcode: string;
  item_code: string;
  item_name: string;
  material_code: string;
  batch_number: string;
  original_qty: string;
  available_qty: string;
  required_pending_qty: string;
  total_box_qty: string;
  dispatch_qty: string;
  remaining_qty: string;
  qty: string;
  uom: string;
  warehouse: string;
  scan_status: DispatchScannedUnitStatus;
  status_after_scan: string;
  dispatch_doc_no: string;
  dispatch_date_time: string | null;
  scanned_by_name: string;
  customer_name: string;
  created_at: string;
  scanned_at: string;
}

export interface DispatchSession {
  id: number;
  bill_number: string;
  sap_system_type: DispatchSapSystemType;
  sap_object_type: DispatchSapObjectType;
  sap_doc_entry: string;
  sap_doc_num: string;
  delivery_number: string;
  reference_delivery_number: string;
  customer_code: string;
  customer_name: string;
  ship_to_code: string;
  ship_to_name: string;
  bill_date: string | null;
  status: DispatchSessionStatus;
  total_expected_qty: string;
  total_scanned_qty: string;
  pending_qty: string;
  total_remaining_qty: string;
  removed_box_count: number;
  sap_dispatch_status: string;
  sap_update_status: DispatchSapUpdateStatus;
  sap_update_error: string;
  sap_sync_status?: DispatchSapUpdateStatus;
  sap_sync_error?: string;
  started_at: string | null;
  completed_at: string | null;
  dispatched_at: string | null;
  dispatched_by: number | null;
  dispatched_by_name: string;
  completed_by: number | null;
  completed_by_name: string;
  closed_at: string | null;
  closed_by: number | null;
  closed_by_name: string;
  close_reason: string;
  cancelled_at: string | null;
  cancel_reason: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  line_count: number;
  completed_line_count: number;
  accepted_scan_count: number;
  rejected_scan_count: number;
  pallet_scan_count: number;
  box_scan_count: number;
  active_line: DispatchSessionLine | null;
  can_dispatch: boolean;
  can_scan: boolean;
  lines: DispatchSessionLine[];
  scanned_units: DispatchScannedUnit[];
}

export interface DispatchSessionFilters extends PaginationParams {
  status?: DispatchSessionStatus | string;
  status_group?: 'active' | 'completed' | 'closed' | string;
  bill_number?: string;
  customer?: string;
  created_by?: string;
  from_date?: string;
  to_date?: string;
  sap_sync_status?: string;
}

export interface DispatchBillLookupPayload {
  bill_number: string;
}

export interface DispatchSessionCreatePayload {
  bill_number: string;
}

export interface DispatchScanSubmitPayload {
  barcode: string;
  line_id?: number | null;
  device_id?: string;
  request_id?: string;
}

export interface DispatchScannedBoxQtyPayload {
  dispatch_qty: number;
}

export interface DispatchSessionCancelPayload {
  reason: string;
}

export interface DispatchScanResponse {
  scan: DispatchScanLog;
  session: DispatchSession;
}

export interface DispatchReportFilters {
  from_date?: string;
  to_date?: string;
  bill_number?: string;
  customer?: string;
  user?: string;
  status?: string;
  material_code?: string;
  pallet_barcode?: string;
  box_barcode?: string;
  sap_sync_status?: string;
}

export interface DispatchSummaryReportRow {
  session_id: number;
  bill_number: string;
  delivery_number: string;
  customer_code: string;
  customer_name: string;
  status: DispatchSessionStatus;
  created_by: string;
  completed_by: string;
  started_at: string | null;
  completed_at: string | null;
  total_expected_qty: string;
  total_dispatched_qty: string;
  pending_qty: string;
  total_expected_boxes?: string;
  total_dispatched_boxes?: string;
  pending_boxes?: string;
  sap_sync_status: string;
  sap_sync_error: string;
}

export interface DispatchDetailReport {
  session: {
    session_id: number;
    bill_number: string;
    delivery_number: string;
    customer_code: string;
    customer_name: string;
    status: DispatchSessionStatus;
    started_at: string | null;
    completed_at: string | null;
    completed_by: string;
    total_expected_qty: string;
    total_dispatched_qty: string;
    pending_qty: string;
    total_expected_boxes?: string;
    total_dispatched_boxes?: string;
    total_pallets?: number;
  };
  lines: Array<{
    line_id: number;
    sap_line_no: string;
    material_code: string;
    material_description: string;
    expected_qty: string;
    dispatched_qty: string;
    pending_qty: string;
    expected_boxes?: string;
    dispatched_boxes?: string;
    pending_boxes?: string;
    uom: string;
    status: string;
  }>;
  scanned_units: Array<{
    id: number;
    scan_id: number;
    barcode: string;
    barcode_type: DispatchScanEntityType;
    pallet_barcode: string;
    box_barcode: string;
    item_code: string;
    item_name: string;
    batch_number: string;
    warehouse: string;
    original_qty: string;
    dispatch_qty: string;
    remaining_qty: string;
    uom: string;
    scan_status: string;
    status_after_scan: string;
    scanned_by: string;
    scanned_at: string;
    dispatch_doc_no: string;
    dispatch_date_time: string | null;
  }>;
  scans: Array<{
    scan_id: number;
    barcode: string;
    scan_type: DispatchScanEntityType;
    material_code: string;
    qty: string;
    result: DispatchScanResult;
    rejection_reason: string;
    scanned_by: string;
    scanned_at: string;
  }>;
}

export interface DispatchPalletReportRow {
  pallet_id: number;
  pallet_barcode: string;
  pallet_status: PalletStatus;
  total_boxes: number;
  dispatched_boxes: number;
  remaining_boxes: number;
  dispatch_session_id: number | null;
  bill_number: string;
  dispatched_time: string | null;
}

export interface DispatchBoxReportRow {
  box_id: number;
  box_barcode: string;
  material_code: string;
  quantity: string;
  uom: string;
  pallet_barcode: string;
  box_status: BoxStatus;
  dispatch_session_id: number | null;
  bill_number: string;
  dispatched_time: string | null;
  removed_from_pallet: boolean;
}

export interface DispatchRejectedScanReportRow {
  scan_id: number;
  barcode: string;
  scan_type: DispatchScanEntityType;
  rejection_reason: string;
  rejection_code: string;
  bill_number: string;
  user: string;
  scan_time: string;
}

// ============================================================================
// Scan
// ============================================================================

export type ScanType =
  | 'RECEIVE'
  | 'PUTAWAY'
  | 'PICK'
  | 'COUNT'
  | 'TRANSFER'
  | 'SHIP'
  | 'RETURN'
  | 'LOOKUP';

export interface ScanRequestPayload {
  barcode_raw: string;
  scan_type?: ScanType;
  context_ref_type?: string;
  context_ref_id?: number | null;
  device_info?: string;
}

export interface ScanResponse {
  scan_id: number;
  result: 'SUCCESS' | 'NOT_FOUND' | 'DUPLICATE' | 'ERROR';
  entity_type: string;
  entity_id: string | null;
  entity_data: Record<string, unknown> | null;
  barcode_raw: string;
  barcode_parsed: Record<string, unknown>;
}

export interface LookupResponse {
  entity_type: string;
  entity_id: number | null;
  entity_data: Record<string, unknown> | null;
}
