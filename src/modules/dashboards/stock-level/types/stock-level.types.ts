// ============================================================================
// Stock Status
// ============================================================================

export type StockHealthStatus = 'healthy' | 'low' | 'critical' | 'unset';

// ============================================================================
// Filters
// ============================================================================

export type StockSortCol = 'item_code' | 'item_name' | 'warehouse' | 'on_hand' | 'min_stock' | 'health_ratio';

export interface StockDashboardFilters {
  search?: string;
  warehouse?: string[];
  status?: StockHealthStatus[];
  sort_by?: StockSortCol;
  sort_dir?: 'asc' | 'desc';
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
  /** Number of warehouses in this group (>1 = grouped row) */
  warehouse_count?: number;
  /** True when any child warehouse has a worse status than the aggregate */
  has_warning?: boolean;
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

// ============================================================================
// Item Detail (expand)
// ============================================================================

export interface StockItemDetailResponse {
  data: StockItem[];
}
