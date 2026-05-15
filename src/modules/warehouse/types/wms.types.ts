// ============================================================================
// WMS Dashboard
// ============================================================================

export interface WMSKPIs {
  total_items: number;
  total_on_hand: number;
  total_value: number;
  low_stock: number;
  critical_stock: number;
  zero_stock: number;
  overstock: number;
}

export interface WarehouseChartItem {
  warehouse_code: string;
  items: number;
  value: number;
}

export interface GroupChartItem {
  group_name: string;
  items: number;
  value: number;
}

export interface TopItem {
  item_code: string;
  item_name: string;
  quantity: number;
  value: number;
}

export interface RecentMovement {
  date: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  in_qty: number;
  out_qty: number;
  direction: 'IN' | 'OUT';
  quantity: number;
}

export interface StockHealth {
  normal: number;
  low: number;
  critical: number;
  zero: number;
  overstock: number;
}

export interface WMSDashboardData {
  kpis: WMSKPIs;
  stock_by_warehouse: WarehouseChartItem[];
  stock_by_group: GroupChartItem[];
  top_items_by_value: TopItem[];
  stock_health: StockHealth;
  recent_movements: RecentMovement[];
}

// ============================================================================
// Stock Overview
// ============================================================================

export type StockStatus = 'NORMAL' | 'LOW' | 'CRITICAL' | 'OVERSTOCK' | 'ZERO';

export interface StockItem {
  item_code: string;
  item_name: string;
  item_group: string;
  uom: string;
  warehouse_code: string;
  on_hand: number;
  committed: number;
  on_order: number;
  available: number;
  avg_price: number;
  stock_value: number;
  min_level: number;
  max_level: number;
  last_purchase_price: number;
  stock_status: StockStatus;
}

export interface StockOverviewSummary {
  total_items: number;
  total_on_hand: number;
  total_committed: number;
  total_available: number;
  total_value: number;
}

export interface StockOverviewResponse {
  summary: StockOverviewSummary;
  items: StockItem[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

// ============================================================================
// Item Detail
// ============================================================================

export interface ItemInfo {
  item_code: string;
  item_name: string;
  item_group: string;
  uom: string;
  avg_price: number;
  last_purchase_price: number;
  min_level: number;
  max_level: number;
}

export interface WarehouseBreakdown {
  warehouse_code: string;
  on_hand: number;
  committed: number;
  on_order: number;
  available: number;
  value: number;
}

export interface ItemDetailResponse {
  item: ItemInfo;
  warehouse_breakdown: WarehouseBreakdown[];
  stock_summary: {
    total_on_hand: number;
    total_committed: number;
    total_available: number;
    total_value: number;
  };
}

// ============================================================================
// Stock Movements
// ============================================================================

export interface StockMovement {
  date: string;
  item_code: string;
  item_name: string;
  warehouse_code: string;
  in_qty: number;
  out_qty: number;
  quantity: number;
  direction: 'IN' | 'OUT';
  transaction_type: string;
  reference: string;
  doc_num: string;
  created_by: string;
}

// ============================================================================
// Stock Transfers
// ============================================================================

export interface WMSTransferSummary {
  transfer_count: number;
  line_count: number;
  total_quantity: number;
  route_count: number;
}

export interface WMSTransferRoute {
  from_warehouse: string;
  to_warehouse: string;
  transfer_count: number;
  line_count: number;
  quantity: number;
}

export interface WMSTransferLine {
  doc_entry: number;
  doc_num: number;
  doc_date: string;
  header_from_warehouse: string;
  header_to_warehouse: string;
  comments: string;
  line_num: number;
  item_code: string;
  item_name: string;
  quantity: number;
  from_warehouse: string;
  to_warehouse: string;
}

export interface WMSTransferOverviewResponse {
  summary: WMSTransferSummary;
  routes: WMSTransferRoute[];
  transfers: WMSTransferLine[];
}

// ============================================================================
// Batch Expiry / FEFO
// ============================================================================

export type BatchExpiryStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK' | 'NO_EXPIRY';

export interface WMSBatchExpirySummary {
  batch_count: number;
  expired_count: number;
  critical_count: number;
  warning_count: number;
  ok_count: number;
  total_quantity: number;
}

export interface WMSBatchExpiryItem {
  item_code: string;
  item_name: string;
  batch_number: string;
  expiry_date: string;
  manufacturing_date: string;
  sap_status: string;
  warehouse_code: string;
  quantity: number;
  days_to_expiry: number | null;
  expiry_status: BatchExpiryStatus;
}

export interface WMSBatchExpiryResponse {
  summary: WMSBatchExpirySummary;
  batches: WMSBatchExpiryItem[];
}

// ============================================================================
// Sales Order Backlog
// ============================================================================

export interface WMSSalesOrderBacklogSummary {
  order_count: number;
  line_count: number;
  open_quantity: number;
  warehouse_count: number;
}

export interface WMSSalesOrderWarehouseSummary {
  warehouse_code: string;
  order_count: number;
  line_count: number;
  open_quantity: number;
}

export interface WMSSalesOrderBacklogLine {
  doc_entry: number;
  doc_num: number;
  doc_date: string;
  due_date: string;
  customer_code: string;
  customer_name: string;
  line_num: number;
  item_code: string;
  item_name: string;
  warehouse_code: string;
  ordered_qty: number;
  open_qty: number;
  delivered_qty: number;
  fulfillment_pct: number;
}

export interface WMSSalesOrderBacklogResponse {
  summary: WMSSalesOrderBacklogSummary;
  warehouses: WMSSalesOrderWarehouseSummary[];
  lines: WMSSalesOrderBacklogLine[];
}

// ============================================================================
// Warehouse Summary
// ============================================================================

export interface WarehouseSummary {
  warehouse_code: string;
  warehouse_name: string;
  total_items: number;
  total_on_hand: number;
  total_value: number;
  low_stock_count: number;
  critical_stock_count: number;
  overstock_count: number;
  zero_stock_count: number;
}

// ============================================================================
// Billing
// ============================================================================

export type BillingStatus = 'FULLY_BILLED' | 'PARTIALLY_BILLED' | 'UNBILLED';

export interface BillingItem {
  item_code: string;
  item_name: string;
  warehouse_code: string;
  received_qty: number;
  received_value: number;
  billed_qty: number;
  billed_value: number;
  unbilled_qty: number;
  unbilled_value: number;
  status: BillingStatus;
  first_grpo_date: string;
  last_grpo_date: string;
}

export interface BillingSummary {
  total_received_qty: number;
  total_billed_qty: number;
  total_unbilled_qty: number;
  total_received_value: number;
  total_billed_value: number;
  total_unbilled_value: number;
  fully_billed_count: number;
  partially_billed_count: number;
  unbilled_count: number;
}

export interface BillingOverviewResponse {
  summary: BillingSummary;
  items: BillingItem[];
}

// ============================================================================
// Dropdowns
// ============================================================================

export interface WarehouseOption {
  code: string;
  name: string;
}

export interface ItemGroupOption {
  code: number;
  name: string;
}
