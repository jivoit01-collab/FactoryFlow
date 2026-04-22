// ============================================================================
// Stock Status
// ============================================================================

export type StockHealthStatus = 'healthy' | 'low' | 'critical' | 'unset';

// ============================================================================
// Filters
// ============================================================================

export interface StockDashboardFilters {
  search?: string;
  warehouse?: string[];
  status?: StockHealthStatus[];
  page?: number;
}

// ============================================================================
// Stock Item
// ============================================================================

export interface StockItem {
  item_code: string;
  item_name: string;
  warehouse: string;
  on_hand: number;
  min_stock: number;
  uom: string;
  stock_status: StockHealthStatus;
  health_ratio: number;
}

// ============================================================================
// Response
// ============================================================================

export interface StockDashboardMeta {
  total_items: number;
  healthy_count: number;
  low_stock_count: number;
  critical_stock_count: number;
  warehouses: string[];
  fetched_at: string;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StockDashboardResponse {
  data: StockItem[];
  meta: StockDashboardMeta;
}
