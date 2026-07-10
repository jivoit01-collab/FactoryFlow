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
  created_at?: string;
  updated_at?: string;
}
export type ComboDefinitionUpsert = Omit<ComboDefinition, 'id' | 'created_at' | 'updated_at'> & {
  id?: number;
};

export interface SkuMapping {
  id: number;
  channel: MarketplaceChannel;
  marketplace_sku: string;
  sku_name?: string;
  sku_type: MpSkuType;
  fg_item_code?: string;
  fg_item_name?: string;
  combo?: number | null;
  combo_code?: string;
  default_uom?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
  sap_delivery_note_num?: string;
  internal_billing_num?: string;
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
  scanned_by_name?: string;
  scanned_at: string;
  duplicate?: boolean;
}

export interface MarketplaceReturn {
  id: number;
  channel: MarketplaceChannel;
  order: number;
  order_id: string;
  status: MpReturnStatus;
  internal_credit_doc_num?: string;
  submitted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  scans?: MpReturnScan[];
  progress?: MpProgressLine[];
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
