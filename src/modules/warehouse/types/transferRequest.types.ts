/**
 * Warehouse Transfer Request types.
 *
 * The flow: the source warehouse raises a request, the receiving warehouse
 * approves or rejects it, the source posts it to SAP, a BST checks the boxes
 * that physically move, and — only when the move crosses SAP branches — the
 * receipt posts a second leg out of the in-transit warehouse.
 *
 * Mirrors `warehouse/models_transfer.py` and `serializers_transfer.py`.
 */

export type TransferRouteType = 'INTRA_BRANCH' | 'CROSS_BRANCH';

export type TransferRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

/**
 * Where the request has got to in SAP, tracked apart from approval.
 * `IN_TRANSIT` means leg 1 posted and the stock is sitting in a `*-INT`
 * warehouse until the receiving side confirms it.
 */
export type TransferPostingStatus = 'NOT_POSTED' | 'IN_TRANSIT' | 'POSTED' | 'FAILED';

export type TransferLineStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** One batch split sent to SAP, kept so it can be reconciled against IBT1. */
export interface TransferBatchAllocation {
  BatchNumber: string;
  Quantity: number;
}

export interface TransferRequestLine {
  id: number;
  line_num: number;
  item_code: string;
  item_name: string;
  uom: string;
  /** Per-line overrides; blank means "use the request's route". */
  from_warehouse: string;
  to_warehouse: string;
  /** Resolved values — the override if set, otherwise the request's. */
  source_warehouse: string;
  destination_warehouse: string;
  requested_qty: string;
  approved_qty: string;
  transferred_qty: string;
  outstanding_qty: string;
  is_batch_managed: boolean;
  batch_allocation: TransferBatchAllocation[];
  status: TransferLineStatus;
  notes: string;
}

export interface TransferRequestListItem {
  id: number;
  entry_no: string;
  from_warehouse: string;
  to_warehouse: string;
  route_type: TransferRouteType;
  intransit_warehouse: string;
  status: TransferRequestStatus;
  status_display: string;
  posting_status: TransferPostingStatus;
  posting_status_display: string;
  sap_request_doc_num: string;
  sap_transfer_doc_num: string;
  sap_leg2_doc_num: string;
  requested_by_name: string;
  line_count: number;
  created_at: string;
}

export interface TransferRequestDetail extends TransferRequestListItem {
  company: number;
  is_cross_branch: boolean;
  /** Where leg 1 actually ships — the in-transit warehouse when cross-branch. */
  leg1_destination: string;
  awaits_second_leg: boolean;
  from_branch_id: number | null;
  to_branch_id: number | null;
  remarks: string;
  rejection_reason: string;
  posting_error: string;
  sap_request_doc_entry: number | null;
  sap_request_closed_at: string | null;
  sap_transfer_doc_entry: number | null;
  sap_leg2_doc_entry: number | null;
  bst_transfer: number | null;
  bst_entry_no: string;
  reviewed_by_name: string;
  posted_by_name: string;
  reviewed_at: string | null;
  posted_at: string | null;
  updated_at: string;
  lines: TransferRequestLine[];
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface TransferRequestLineInput {
  item_code: string;
  item_name?: string;
  uom?: string;
  quantity: number | string;
  from_warehouse?: string;
  to_warehouse?: string;
}

export interface TransferRequestCreatePayload {
  from_warehouse: string;
  to_warehouse: string;
  remarks?: string;
  lines: TransferRequestLineInput[];
}

/** Lines left out are approved at the quantity that was requested. */
export interface TransferApprovePayload {
  lines?: { line_num: number; approved_qty: number | string }[];
  reason?: string;
}

export interface TransferRejectPayload {
  reason: string;
}

/** One released batch sitting in the source warehouse. */
export interface TransferAvailableBatch {
  batch_number: string;
  quantity: number;
  in_date: string | null;
  expiry_date: string | null;
  production_date: string | null;
}

/** A line in the allocation preview: what FIFO proposes, and what else exists. */
export interface TransferAllocationLine {
  line_num: number;
  item_code: string;
  item_name: string;
  uom: string;
  quantity: number;
  from_warehouse: string;
  to_warehouse: string;
  is_batch_managed: boolean;
  proposed: TransferBatchAllocation[];
  available: TransferAvailableBatch[];
  /** Set when the line cannot be allocated at all, e.g. not enough on the shelf. */
  error: string;
}

export interface TransferAllocationPreview {
  entry_no: string;
  from_warehouse: string;
  to_warehouse: string;
  is_cross_branch: boolean;
  needs_batches: boolean;
  lines: TransferAllocationLine[];
}

/** A hand-picked split sent with the post; omitted lines fall back to FIFO. */
export interface TransferPostAllocation {
  line_num: number;
  batches: { batch_number: string; quantity: number }[];
}

/** Lines left out use whatever leg 1 moved. */
export interface TransferSecondLegPayload {
  lines?: { line_num: number; received_qty: number | string }[];
}

export interface TransferCreateBSTPayload {
  vehicle?: number | null;
  driver?: number | null;
  requires_gate?: boolean;
  remarks?: string;
}

export interface TransferBatchVerification {
  matches: boolean;
  discrepancies: string[];
}

/**
 * One item a warehouse holds, for the request form's picker.
 *
 * `available` is on-hand minus committed and is the number safe to promise —
 * an open request already commits stock at its source. It can be NEGATIVE where
 * a warehouse is already over-committed, so never assume a floor of zero.
 */
export interface WarehouseStockItem {
  item_code: string;
  item_name: string;
  on_hand: number;
  committed: number;
  available: number;
  on_order: number;
  uom: string;
  is_batch_managed: boolean;
  item_group: number;
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export type TransferFindingSeverity = 'critical' | 'warning' | 'info';

export interface TransferReconcileFinding {
  entry_no: string;
  request_id: number;
  severity: TransferFindingSeverity;
  code: string;
  message: string;
  detail: Record<string, unknown>;
}

export interface TransferReconcileReport {
  checked: number;
  findings: TransferReconcileFinding[];
  summary: Record<string, number>;
}
