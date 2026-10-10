/**
 * Fixed Asset GRPO types.
 *
 * Field names follow `factory_app/fixed_asset_grpo` exactly: `views.py` for the
 * hand-built rows, `serializers.py` for the serialized ones, and
 * `services/entries.py` / `services/po_link.py` for the entry detail and the
 * PO link. Where the backend reuses grpo's serializer unchanged (preview,
 * history, the post request), grpo's existing frontend type is reused rather
 * than copied, so the two cannot drift.
 *
 * Decimals arrive as strings (DRF's default), except where the backend
 * serializer declares a FloatField (the open-PO lines) -- typed as such.
 */
import type {
  GRPODashboardSummary,
  GRPODraftPayload,
  GRPOHistoryEntry,
  GRPOListParams,
  GRPOStatus,
  PendingGRPOEntryWithSuppliers,
  PostGRPORequest,
  PostGRPOResponse,
} from '@/modules/warehouse/grpo/types/grpo.types';

export type {
  GRPODraftPayload,
  GRPOHistoryEntry,
  GRPOPrintPayload,
  GRPOStatus,
  PaginatedResponse,
  PostGRPOItemRequest,
  PreviewItem,
  PreviewPOReceipt,
} from '@/modules/warehouse/grpo/types/grpo.types';

type Decimalish = string | number;

// ─── SAP switches (flags.flags_for) ─────────────────────────────

/** What the screens need to enable or explain the Post button. */
export interface FASapFlags {
  /** FIXED_ASSET_GRPO_ENABLED. Off: post answers 400 FA_GRPO_DISABLED. */
  enabled: boolean;
  /** FIXED_ASSET_GRPO_SIMULATE. On: every check runs, nothing is written to SAP. */
  simulate: boolean;
  /** FIXED_ASSET_GRPO_ALLOW_LIVE. Off: a real send only goes to a TEST_ database. */
  allow_live: boolean;
  /** Whether the company's SAP targets are TEST_ databases; null when unknown. */
  is_test_db: boolean | null;
  /** FIXED_ASSET_GRPO_CUTOVER as YYYY-MM-DD, or null. */
  cutover: string | null;
  /** FIXED_ASSET_WAREHOUSES. */
  warehouses: string[];
}

// ─── PO link (services/po_link.serialize_fa_po_receipt) ────────

export interface FAPOReceiptItem {
  id: number;
  sap_line_num: number | null;
  po_item_code: string;
  item_name: string;
  ordered_qty: Decimalish;
  received_qty: Decimalish;
  accepted_qty: Decimalish;
  short_qty: Decimalish | null;
  uom: string;
  unit_price: Decimalish | null;
  tax_code: string;
  warehouse_code: string;
  gl_account: string;
}

export interface FAPOReceipt {
  id: number;
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  sap_doc_entry: number | null;
  branch_id: number | null;
  vendor_ref: string;
  po_date: string | null;
  invoice_no: string;
  created_at: string;
  updated_at: string;
  /** False once a GRPO is posted, simulated or on its way, or the entry is closed. */
  is_editable: boolean;
  lock_reason: string | null;
  items: FAPOReceiptItem[];
}

/** One line sent to link a PO (raw_material_gatein's POItemReceiveSerializer). */
export interface FAPOLinkItem {
  line_num: number;
  po_item_code: string;
  item_name: string;
  received_qty: number;
  uom: string;
}

/** POST / PUT entries/<id>/po-receipts/ (FAPOLinkRequestSerializer). */
export interface FAPOLinkRequest {
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  /** The supplier's bill number, when the gate did not record one. */
  invoice_no?: string;
  items: FAPOLinkItem[];
}

export interface FAPOLinkResponse {
  message?: string;
  po_receipt: FAPOReceipt;
  /** Advisory: the PO line is already promised to another receipt, etc. */
  warnings: string[];
}

// ─── Open POs (FAOpenPOSerializer) ──────────────────────────────

export interface FAOpenPOItem {
  po_item_code: string;
  item_name: string;
  ordered_qty: number;
  /** Already received in SAP on this line (before this entry). */
  received_qty: number;
  /** SAP's open quantity, POR1.OpenQty -- the base of the 110% ceiling. */
  remaining_qty: number;
  uom: string;
  rate: number;
  line_num: number;
  tax_code: string;
  warehouse_code: string;
  account_code: string;
  variety: string;
}

export interface FAOpenPO {
  po_number: string;
  supplier_code: string;
  supplier_name: string;
  doc_entry: number;
  branch_id: number | null;
  vendor_ref: string;
  doc_date: string | null;
  items: FAOpenPOItem[];
}

export interface FAOpenPOsResponse {
  results: FAOpenPO[];
  warehouses: string[];
  /** Whether this company holds receipts to 110% of a line's open quantity. */
  over_receipt_enforced: boolean;
}

// ─── Entry detail (services/entries.fa_entry_detail) ───────────

export interface FAAssetLine {
  line_no: number;
  asset_category: string;
  asset_name: string;
  serial_number: string;
  quantity: Decimalish;
  unit: string;
}

export interface FAGateAttachment {
  id: number;
  name: string;
  url: string;
}

/** The entry's latest unposted GRPO (DRAFT, FAILED or QUEUED). */
export interface FAOpenDraft {
  id: number;
  status: GRPOStatus;
  error_message: string | null;
  request_payload: GRPODraftPayload | null;
  /** The SAP posting queue holds a live row for it: do not send it again. */
  on_its_way: boolean;
  attachments: { id: number; name: string }[];
}

export interface FAPostedGRPO {
  id: number;
  sap_doc_num: number | null;
  sap_doc_entry: number | null;
  posted_at: string | null;
  simulated: boolean;
}

export interface FAClosure {
  sap_doc_num: string;
  note: string;
  closed_at: string;
  closed_by: string;
}

export interface FAEntryDetail {
  vehicle_entry_id: number;
  entry_no: string;
  status: string;
  entry_time: string | null;
  remarks: string;
  is_before_cutover: boolean;
  work_order_number: string;
  /** The gate's free-text supplier name. */
  supplier_name: string;
  invoice_number: string;
  fa_remarks: string;
  items: FAAssetLine[];
  gate_attachments: FAGateAttachment[];
  po_receipt_ids: number[];
  po_receipts: FAPOReceipt[];
  /** Why no PO may be linked at all (cancelled, closed by hand); null when it may. */
  link_lock_reason: string | null;
  open_draft: FAOpenDraft | null;
  posted_grpos: FAPostedGRPO[];
  closure: FAClosure | null;
  sap: FASapFlags;
}

// ─── Lists ──────────────────────────────────────────────────────

/** GET needs-po/ (FANeedsPOEntrySerializer). */
export interface FANeedsPOEntry {
  vehicle_entry_id: number;
  entry_no: string;
  entry_time: string | null;
  status: string;
  work_order_number: string;
  supplier_name: string;
  invoice_number: string;
  item_count: number;
}

/** GET pending/: grpo's pending row plus the FA detail's own fields. */
export interface FAPendingEntry extends PendingGRPOEntryWithSuppliers {
  work_order_number: string;
  /** The gate's free-text supplier name (the PO's is on `suppliers`). */
  fa_supplier_name: string;
  invoice_number: string;
}

export type FAEntryState =
  | 'AT_GATE'
  | 'NEEDS_PO'
  | 'READY'
  | 'SENDING'
  | 'SIMULATED'
  | 'POSTED'
  | 'CLOSED'
  | 'CANCELLED';

/** GET all-entries/ (FAAllEntrySerializer). */
export interface FAAllEntry {
  vehicle_entry_id: number;
  entry_no: string;
  entry_time: string | null;
  status: string;
  state: FAEntryState;
  work_order_number: string;
  supplier_name: string;
  invoice_number: string;
  po_numbers: string[];
}

/** GET summary/ (FAGRPODashboardSummarySerializer). */
export interface FAGRPOSummary extends GRPODashboardSummary {
  queued_count: number;
  draft_count: number;
  simulated_count: number;
  needs_po_count: number;
  closed_count: number;
}

/** GET history/ and history/<id>/ (FAGRPOPostingSerializer). */
export interface FAGRPOHistoryEntry extends GRPOHistoryEntry {
  simulated: boolean;
  /** For a simulated post, the document it would have sent; else null. */
  simulated_payload: Record<string, unknown> | null;
}

/** Query params the FA lists accept. */
export interface FAListParams extends GRPOListParams {
  /** history/: only simulated ('true') or only real ('false') posts. */
  simulated?: 'true' | 'false';
  /** all-entries/: include entries done in SAP by hand. */
  include_closed?: 1;
  state?: FAEntryState;
}

// ─── Close / reopen ────────────────────────────────────────────

/** POST entries/<id>/close/: one of the two is needed. */
export interface FAClosureRequest {
  sap_doc_num?: string;
  note?: string;
}

export interface FAClosureResponse {
  vehicle_entry_id: number;
  sap_doc_num: string;
  note: string;
  closed_at: string;
}

// ─── Post ──────────────────────────────────────────────────────

/** POST post/: grpo's request, plus the open draft to reuse. */
export interface FAPostRequest extends PostGRPORequest {
  /** Reuse this entry's open DRAFT/FAILED draft (or a stranded QUEUED one). */
  grpo_posting_id?: number;
}

/**
 * 201: posted (or simulated: `simulated: true`, no SAP numbers).
 * 202: SAP not answering -- `queued: true`, `code: 'SAP_QUEUED'`.
 */
export interface FAPostResponse extends PostGRPOResponse {
  simulated?: boolean;
  detail?: string;
}
