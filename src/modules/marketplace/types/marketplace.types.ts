/**
 * Marketplace module domain types — mirror the `marketplace` DRF serializers.
 * Decimal quantities come from DRF as strings.
 */

export type MarketplaceChannel = 'FLIPKART' | 'AMAZON';

export const MARKETPLACE_CHANNELS: { value: MarketplaceChannel; label: string }[] = [
  { value: 'FLIPKART', label: 'Flipkart' },
  { value: 'AMAZON', label: 'Amazon' },
];

export type MpComponentType = 'FG' | 'PM';
export type MpSkuType = 'RAW' | 'COMBO';

/** Per company + channel flow settings (mirrors MarketplaceSettingsSerializer). */
export interface MarketplaceSettings {
  id: number;
  channel: MarketplaceChannel;
  /** When true, issued orders skip Packing and go straight to Outward. */
  skip_packing: boolean;
  /** When true, dispatches defer their SAP Delivery Note to the bulk cut page. */
  defer_delivery_note: boolean;
  updated_at: string;
}

/** One combined line in the bulk delivery-note preview. */
export interface DeliveryNoteLine {
  item_code: string;
  item_name: string;
  uom: string;
  warehouse_code: string;
  quantity: string;
}

/** A dispatch included in (or blocked from) the bulk delivery note. */
export interface DeliveryNoteDispatch {
  dispatch_id: number;
  order_id: string;
  buyer_name: string;
  fg_line_count: number;
  amount: string;
  variants?: LineVariant[];
}

export interface DeliveryNoteBlocked {
  order_id: string;
  dispatch_id: number;
  reason: string;
}

/** Full preview of the single SAP Delivery Note that will be cut. */
export interface DeliveryNoteWarehouseOption {
  id: number;
  name: string;
  sap_warehouse_code: string;
  sap_customer_card_code: string;
  is_default: boolean;
}

export interface DeliveryNoteSummary {
  channel: MarketplaceChannel;
  card_code: string;
  warehouse_code: string;
  warehouse_id: number | null;
  warehouses: DeliveryNoteWarehouseOption[];
  doc_date: string;
  post_goods_issue: boolean;
  dispatches: DeliveryNoteDispatch[];
  fg_lines: DeliveryNoteLine[];
  pm_lines: DeliveryNoteLine[];
  blocked: DeliveryNoteBlocked[];
  totals: {
    dispatch_count: number;
    fg_item_count: number;
    fg_total_quantity: string;
    total_amount: string;
  };
}

/** Result of cutting the bulk delivery note. */
export interface DeliveryNoteCutResult {
  delivery_note_num: string;
  delivery_note_doc_entry: number | null;
  dispatch_count: number;
  order_ids: string[];
  /** True when SAP routed the delivery note into an approval process (draft). */
  pending_approval?: boolean;
  draft_entry?: number | null;
}

export interface DeliveryNoteReconcileResult {
  finalized: string[];
  rejected: string[];
  still_pending: number;
}

export interface AwaitingApprovalCount {
  awaiting_approval: number;
}

/** Paged list envelope — mirrors the DRF `{results, count, page, …}` shape. */
export interface MpPaginated<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
}

export type MpDispatchStatus = 'DRAFT' | 'SCANNING' | 'READY' | 'CONFIRMED' | 'CANCELLED';
export type MpReturnStatus = 'DRAFT' | 'SCANNING' | 'SUBMITTED' | 'CANCELLED';
export type MpProgressStatus = 'PENDING' | 'UNDER' | 'COMPLETE' | 'OVER';

// ── Masters ──────────────────────────────────────────────────────────────────
export interface MarketplaceWarehouse {
  id: number;
  channel: MarketplaceChannel;
  name: string;
  sap_warehouse_code: string;
  sap_customer_card_code: string;
  facility_code: string;
  // Delivery-note posting config (used directly when posting to SAP)
  sap_series: string;
  sap_tax_code: string;
  /** SAP Business Place / Branch (BPLId) the delivery note is booked under. */
  sap_branch_id: number | null;
  post_goods_issue: boolean;
  /** Pre-selected warehouse when cutting a delivery note for this channel. */
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
export type MarketplaceWarehouseUpsert = Omit<
  MarketplaceWarehouse,
  'id' | 'created_at' | 'updated_at'
> & { id?: number };

export interface ComboComponent {
  id?: number;
  component_type: MpComponentType;
  item_code: string;
  item_name?: string;
  quantity: string;
  uom?: string;
}

export interface ComboDefinition {
  id: number;
  channel: MarketplaceChannel;
  code: string;
  name: string;
  is_active: boolean;
  components: ComboComponent[];
  // Inline SKU mapping — a combo is FSN-mapped in the same form as a single SKU.
  fsn?: string;
  marketplace_sku?: string;
  sku_name?: string;
  created_at?: string;
  updated_at?: string;
}
export type ComboDefinitionUpsert = Omit<ComboDefinition, 'id' | 'created_at' | 'updated_at'> & {
  id?: number;
};

export interface SkuMappingOption {
  id?: number;
  label?: string;
  sku_type: MpSkuType;
  fg_item_code?: string;
  fg_item_name?: string;
  combo?: number | null;
  combo_code?: string;
  is_default: boolean;
}

export interface SkuMapping {
  id: number;
  channel: MarketplaceChannel;
  marketplace_sku: string;
  fsn?: string;
  sku_name?: string;
  sku_type: MpSkuType;
  fg_item_code?: string;
  fg_item_name?: string;
  combo?: number | null;
  combo_code?: string;
  default_uom?: string;
  is_active: boolean;
  // SAP items this FSN MAY ship as (empty = single fg_item_code/combo).
  options?: SkuMappingOption[];
  created_at?: string;
  updated_at?: string;
}

// ── Per-order SAP-item variant choice ──────────────────────────────────────
export interface VariantOption {
  id: number;
  label: string;
  sku_type: MpSkuType;
  fg_item_code: string;
  combo_code: string;
  is_default: boolean;
}

export interface LineVariant {
  line_id: number;
  sku_name: string;
  fsn?: string;
  marketplace_sku: string;
  has_choice: boolean;
  options: VariantOption[];
  chosen_option_id: number | null;
}

export interface OrderVariants {
  order_id: string;
  buyer_name: string;
  lines: LineVariant[];
}
export type SkuMappingUpsert = Omit<
  SkuMapping,
  'id' | 'combo_code' | 'created_at' | 'updated_at'
> & { id?: number };

// ── Orders ───────────────────────────────────────────────────────────────────
export interface MarketplaceOrderLine {
  id?: number;
  marketplace_sku: string;
  sku_name?: string;
  ordered_quantity: string;
}

export interface MarketplaceOrder {
  id: number;
  channel: MarketplaceChannel;
  order_id: string;
  order_date?: string | null;
  buyer_name?: string;
  sap_warehouse_code?: string;
  status: 'OPEN' | 'DISPATCHED' | 'RETURNED' | 'PARTIAL';
  lines: MarketplaceOrderLine[];
  created_at?: string;
  /** True once the warehouse issued this order's materials (annotated by the API). */
  dispatch_ready?: boolean;
}

export interface ResolvedLine {
  item_code: string;
  item_name: string;
  component_type: MpComponentType;
  required_quantity: string;
  uom: string;
  warehouse_code: string;
  source_skus: string[];
}

export interface ResolvedOrder {
  order: MarketplaceOrder;
  resolved_lines: ResolvedLine[];
  unmapped_skus: string[];
}

// ── Scans + dispatch ─────────────────────────────────────────────────────────
export interface MpScan {
  id: number;
  dispatch: number;
  barcode_raw: string;
  item_code: string;
  item_name: string;
  component_type: MpComponentType | '';
  source_sku: string;
  quantity: string;
  uom: string;
  warehouse_code: string;
  scanned_by_name?: string;
  scanned_at: string;
  duplicate?: boolean;
}

export interface MpProgressLine {
  item_code: string;
  item_name: string;
  component_type: MpComponentType;
  required_quantity: string;
  scanned_quantity: string;
  status: MpProgressStatus;
}

export interface MarketplaceDispatch {
  id: number;
  channel: MarketplaceChannel;
  order: number;
  order_id: string;
  buyer_name?: string;
  sap_warehouse_code?: string;
  status: MpDispatchStatus;
  /** Distinct items scanned so far (for per-item Outward progress). */
  scanned_count?: number;
  sap_delivery_note_num?: string;
  internal_billing_num?: string;
  sap_post_status?: 'PENDING' | 'POSTED' | 'FAILED';
  sap_error?: string;
  confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // detail-only
  scans?: MpScan[];
  resolved_lines?: ResolvedLine[];
  progress?: MpProgressLine[];
  unmapped_skus?: string[];
}

// ── Returns ──────────────────────────────────────────────────────────────────
export type MpReturnCondition =
  | ''
  | 'GOOD'
  | 'DAMAGED'
  | 'WRONG_ITEM'
  | 'PARTIAL'
  | 'MISSING'
  | 'EXCESS'
  | 'PACKAGING_DAMAGED'
  | 'OTHER';

// Return-item condition options for the Inward dropdown (value → label).
export const MP_RETURN_CONDITIONS: Array<{ value: MpReturnCondition; label: string }> = [
  { value: 'GOOD', label: 'Good' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Received' },
  { value: 'PARTIAL', label: 'Partial Receiving' },
  { value: 'MISSING', label: 'Missing Item' },
  { value: 'EXCESS', label: 'Excess Quantity' },
  { value: 'PACKAGING_DAMAGED', label: 'Packaging Damaged' },
  { value: 'OTHER', label: 'Other' },
];

export interface MpReturnScan {
  id: number;
  mp_return: number;
  barcode_raw: string;
  item_code: string;
  item_name: string;
  component_type: MpComponentType | '';
  source_sku: string;
  quantity: string;
  uom: string;
  condition?: MpReturnCondition;
  condition_remarks?: string;
  scanned_by_name?: string;
  scanned_at: string;
  duplicate?: boolean;
}

export interface MarketplaceReturn {
  id: number;
  channel: MarketplaceChannel;
  order: number;
  order_id: string;
  buyer_name?: string;
  status: MpReturnStatus;
  /** @deprecated use return_note_num */
  internal_credit_doc_num?: string;
  return_note_num?: string;
  submitted_at?: string | null;
  submitted_by_name?: string;
  created_at?: string;
  updated_at?: string;
  scans?: MpReturnScan[];
  progress?: MpProgressLine[];
}

export interface ReturnListParams {
  channel?: MarketplaceChannel;
  status?: MpReturnStatus;
  page?: number;
  page_size?: number;
}

// ── Reconciliation ───────────────────────────────────────────────────────────
export interface ReconciliationRow {
  order_id: string;
  channel: MarketplaceChannel;
  item_code: string;
  item_name: string;
  portal_quantity: string;
  outward_quantity: string;
  inward_quantity: string;
  physical_quantity: string;
  outward_vs_inward_deviation: string;
  portal_vs_physical_deviation: string;
  has_deviation: boolean;
}

export interface ReconciliationReport {
  channel: string;
  from_date: string | null;
  to_date: string | null;
  rows: ReconciliationRow[];
  total_orders: number;
  orders_with_deviation: number;
}

// ── Request payloads ─────────────────────────────────────────────────────────
export interface DispatchCreateRequest {
  channel: MarketplaceChannel;
  order_id: string;
}
export interface ScanRequest {
  barcode_raw: string;
  item_code?: string;
  quantity?: string;
}
export interface ConfirmRequest {
  override_deviation?: boolean;
  remarks?: string;
}
export interface CancelRequest {
  reason?: string;
}
export interface ReturnCreateRequest {
  channel: MarketplaceChannel;
  order_id: string;
}
export interface ReturnSubmitRequest {
  remarks?: string;
}

export interface OrderListParams {
  channel?: MarketplaceChannel;
  status?: string;
  search?: string;
  /** 1 → only orders whose warehouse materials were issued (Outward). */
  ready?: number;
}
export interface DispatchListParams {
  channel?: MarketplaceChannel;
  status?: string;
}
export interface ReconciliationParams {
  channel?: MarketplaceChannel;
  from_date?: string;
  to_date?: string;
  order_id?: string;
}

// ── Sheet-driven flow (import batch → stock list → warehouse issue) ───────────
export type OrderImportBatchStatus =
  | 'PARSED'
  | 'RESOLVED'
  | 'REQUESTED'
  | 'ISSUED'
  | 'DISPATCHING'
  | 'CLOSED';

export interface OrderImportBatch {
  id: number;
  channel: MarketplaceChannel;
  filename: string;
  status: OrderImportBatchStatus;
  row_count: number;
  order_count: number;
  line_count: number;
  summary: {
    created?: number;
    updated?: number;
    skipped?: number;
    duplicates_skipped?: number;
    orders?: number;
    lines?: number;
  };
  uploaded_by_name?: string;
  created_at: string;
  // present on the import response only
  unmapped_skus?: string[];
  stock_line_count?: number;
}

export interface StockListLine {
  item_code: string;
  item_name: string;
  component_type: MpComponentType;
  uom: string;
  required_quantity: string;
  source_skus: string[];
}

// ── Sheet-wise dispatch board ──────────────────────────────────────────────
export type DispatchOrderStatus = 'PENDING' | 'PARTIAL' | 'SCANNED' | 'CONFIRMED';

export interface DispatchSheetInsights {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  tracking_total: number;
  tracking_scanned: number;
  tracking_remaining: number;
  progress_pct: number;
}

export interface DispatchSheetSummary {
  id: number;
  filename: string;
  status: OrderImportBatchStatus;
  created_at: string;
  insights: DispatchSheetInsights;
}

export interface DispatchBoardItem {
  sku_name: string;
  marketplace_sku: string;
  quantity: string;
  tracking_id: string;
  scanned: boolean;
}

export interface DispatchBoardOrder {
  order_id: string;
  buyer_name: string;
  dispatch_id: number | null;
  dispatch_status: string | null;
  sap_post_status: string | null;
  ready: boolean;
  status: DispatchOrderStatus;
  tracking_total: number;
  tracking_scanned: number;
  items: DispatchBoardItem[];
  variants?: LineVariant[];
}

export interface DispatchBoard {
  sheet: { id: number; filename: string; status: OrderImportBatchStatus; created_at: string };
  insights: DispatchSheetInsights;
  orders: DispatchBoardOrder[];
}

export interface StockList {
  lines: StockListLine[];
  unmapped_skus: string[];
  orders: number;
}

export interface SkipUnmappedResult {
  removed_count: number;
  removed_order_ids: string[];
  blocked_order_ids: string[];
  remaining_unmapped_skus: string[];
}

export type MpIssueStatus =
  | 'DRAFT'
  | 'SENT'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'RECEIVED';

export type MpIssueLineStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';

export interface MarketplaceIssueLine {
  id: number;
  item_code: string;
  item_name: string;
  component_type: MpComponentType;
  uom: string;
  required_qty: string;
  available_stock: string;
  approved_qty: string;
  issued_qty: string;
  received_qty: string;
  status: MpIssueLineStatus;
  reject_reason: string;
  source_skus: string[];
}

export interface MarketplaceIssueRequest {
  id: number;
  channel: MarketplaceChannel;
  batch: number;
  batch_filename?: string;
  sap_warehouse_code: string;
  status: MpIssueStatus;
  reject_reason: string;
  reviewed_at: string | null;
  created_at: string;
  lines?: MarketplaceIssueLine[];
  sap_issue_doc_entries?: unknown[];
}

export interface ImportOrdersRequest {
  text: string;
  filename: string;
  skip_duplicates?: boolean;
}

export interface ImportPreview {
  row_count: number;
  total_orders: number;
  new_count: number;
  duplicate_count: number;
  skipped_rows: number;
  new_order_ids: string[];
  duplicate_order_ids: string[];
  unmapped_skus: string[];
  has_duplicates: boolean;
}

export interface SendIssueRequest {
  batch_id: number;
  warehouse_code?: string;
}

export interface ReviewLine {
  line_id: number;
  approved_qty?: string | number;
  status?: 'APPROVED' | 'REJECTED';
  reason?: string;
}

export interface ReviewRequest {
  lines: ReviewLine[];
}

export interface ReceiveRequest {
  lines?: { line_id: number; received_qty: string | number }[];
}

export interface SapWarehouse {
  warehouse_code: string;
  warehouse_name: string;
}

// ── Warehouse insights ───────────────────────────────────────────────────────
export interface InsightItem {
  item_code: string;
  item_name: string;
  component_type: MpComponentType;
  required: string;
  approved: string;
  issued: string;
  received: string;
  dispatched: string;
  in_packing: string;
}

export interface InsightShortfall {
  item_code: string;
  item_name: string;
  required: string;
  approved: string;
  short: string;
}

export interface WarehouseInsights {
  requests: { total: number; by_status: Record<string, number> };
  orders: { awaiting_dispatch: number; dispatched: number };
  totals: { required: string; approved: string; issued: string; received: string; dispatched: string };
  by_item: InsightItem[];
  shortfalls: InsightShortfall[];
}

export interface SapItem {
  item_code: string;
  item_name: string;
  uom: string;
}

// ── Packing ──────────────────────────────────────────────────────────────────
export type MpPackingStatus = 'PENDING' | 'PACKING' | 'PACKED';

export interface MarketplacePackBarcode {
  id: number;
  barcode: string;
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
  source_sku: string;
  printed: boolean;
  printed_at: string | null;
}

export interface MarketplacePacking {
  id: number;
  channel: MarketplaceChannel;
  order: number;
  order_id: string;
  buyer_name?: string;
  tracking_id?: string;
  city?: string;
  status: MpPackingStatus;
  packed_at: string | null;
  pack_barcode?: string;
  created_at: string;
  barcodes: MarketplacePackBarcode[];
}

export interface PackQueueOrder {
  order_id: string;
  buyer_name?: string;
  line_count: number;
  packing_status: MpPackingStatus | null;
}

export interface PackingSummaryItem {
  item_code: string;
  item_name: string;
  order_count: number;
}

export interface PackingSummary {
  items: PackingSummaryItem[];
  total_orders: number;
  unmapped_orders: number;
}

export interface CompleteItemGroupResult {
  item_code: string;
  completed_count: number;
  completed_order_ids: string[];
  skipped_order_ids: string[];
}

export interface PackLabelData {
  type: string;
  barcode: string;
  qr_payload: string;
  order_id: string;
  buyer_name?: string;
  item_code: string;
  item_name: string;
  quantity: string;
  uom: string;
  source_sku: string;
}
