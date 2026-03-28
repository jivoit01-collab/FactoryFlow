// ============================================================================
// Status Types
// ============================================================================

export type ProductionOrderStatus = 'planned' | 'released';
export type StockStatus = 'sufficient' | 'partial' | 'stockout';

// ============================================================================
// Shared Filters
// ============================================================================

export interface PlanDashboardFilters {
  status?: ProductionOrderStatus[];
  due_date_from?: string;
  due_date_to?: string;
  warehouse?: string;
  sku?: string;
  show_shortfall_only?: boolean;
}

// ============================================================================
// Summary Tab
// ============================================================================

export interface SummaryOrder {
  prod_order_entry: number;
  prod_order_num: number;
  sku_code: string;
  sku_name: string;
  planned_qty: number;
  completed_qty: number;
  status: ProductionOrderStatus;
  due_date: string | null;
  post_date: string | null;
  priority: number;
  warehouse: string;
  total_components: number;
  components_with_shortfall: number;
  total_remaining_component_qty: number;
}

export interface SummaryMeta {
  total_orders: number;
  orders_with_shortfall: number;
  fetched_at: string;
}

export interface SummaryResponse {
  data: SummaryOrder[];
  meta: SummaryMeta;
}

// ============================================================================
// BOM Component (shared between details & sku-detail)
// ============================================================================

export interface BOMComponent {
  component_line: number;
  component_code: string;
  component_name: string;
  component_planned_qty: number;
  component_issued_qty: number;
  component_remaining_qty: number;
  component_warehouse: string;
  base_qty: number;
  uom: string;
  stock_on_hand: number;
  stock_committed: number;
  stock_on_order: number;
  net_available: number;
  shortfall_qty: number;
  vendor_lead_time: number;
  default_vendor: string;
  stock_status: StockStatus;
}

// ============================================================================
// Details Tab
// ============================================================================

export interface DetailOrder {
  prod_order_entry: number;
  prod_order_num: number;
  sku_code: string;
  sku_name: string;
  sku_planned_qty: number;
  sku_completed_qty: number;
  status: ProductionOrderStatus;
  due_date: string | null;
  post_date: string | null;
  warehouse: string;
  priority: number;
  total_components: number;
  components_with_shortfall: number;
  components: BOMComponent[];
}

export interface DetailsMeta {
  total_orders: number;
  total_component_lines: number;
  fetched_at: string;
}

export interface DetailsResponse {
  data: DetailOrder[];
  meta: DetailsMeta;
}

// ============================================================================
// Procurement Tab
// ============================================================================

export interface ProcurementItem {
  component_code: string;
  component_name: string;
  uom: string;
  total_required_qty: number;
  stock_on_hand: number;
  stock_committed: number;
  stock_on_order: number;
  net_available: number;
  shortfall_qty: number;
  suggested_purchase_qty: number;
  vendor_lead_time: number;
  default_vendor: string;
  related_prod_orders: string[];
}

export interface ProcurementMeta {
  total_components: number;
  components_with_shortfall: number;
  fetched_at: string;
}

export interface ProcurementResponse {
  data: ProcurementItem[];
  meta: ProcurementMeta;
}

// ============================================================================
// SKU Detail (per-row lazy load)
// ============================================================================

export interface SKUDetailData {
  prod_order_entry: number;
  prod_order_num: number;
  sku_code: string;
  sku_name: string;
  sku_planned_qty: number;
  sku_completed_qty: number;
  status: ProductionOrderStatus;
  due_date: string | null;
  post_date: string | null;
  warehouse: string;
  priority: number;
  total_components: number;
  components_with_shortfall: number;
  components: BOMComponent[];
}

export interface SKUDetailResponse {
  data: SKUDetailData; // NOTE: single object, not an array
  meta: { fetched_at: string };
}
