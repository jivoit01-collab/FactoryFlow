// ============================================================================
// Stock Status
// ============================================================================

export type StockHealthStatus = 'healthy' | 'low' | 'critical';

// ============================================================================
// Filters
// ============================================================================

export interface StockDashboardFilters {
  search?: string;
  warehouse?: string;
  status?: StockHealthStatus[];
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
  low_stock_count: number;
  critical_stock_count: number;
  fetched_at: string;
}

export interface StockDashboardResponse {
  data: StockItem[];
  meta: StockDashboardMeta;
}
