// ============================================================================
// Filters
// ============================================================================

export interface NonMovingFilters {
  age: number;
  item_group: number;
  search?: string;
  warehouse?: string[];
  sub_group?: string[];
}

// ============================================================================
// Non-Moving Item
// ============================================================================

export interface NonMovingItem {
  branch: string;
  item_code: string;
  item_name: string;
  item_group_name: string;
  sub_group: string;
  warehouse: string;
  quantity: number;
  value: number;
  last_movement_date: string | null;
  days_since_last_movement: number;
  consumption_ratio: number;
}

// ============================================================================
// Summary
// ============================================================================

export interface BranchSummary {
  branch: string;
  item_count: number;
  total_value: number;
  total_quantity: number;
}

/** One item's pro-rated share of a warehouse, as returned by the backend. */
export interface WarehouseItemBreakdown {
  item_code: string;
  quantity: number;
  value: number;
}

export interface WarehouseSummary {
  warehouse: string;
  warehouse_name?: string;
  item_count: number;
  total_value: number;
  total_quantity: number;
  items?: WarehouseItemBreakdown[];
}

/** A warehouse row with its items resolved against the visible report rows. */
export interface WarehouseGroup {
  warehouse: string;
  warehouse_name?: string;
  item_count: number;
  total_value: number;
  total_quantity: number;
  items: NonMovingItem[];
}

export interface ReportSummary {
  total_items: number;
  total_value: number;
  total_quantity: number;
  by_branch: BranchSummary[];
}

// ============================================================================
// Response
// ============================================================================

export interface NonMovingMeta {
  age_days: number;
  item_group: number;
  fetched_at: string;
}

export interface NonMovingReportResponse {
  data: NonMovingItem[];
  summary: ReportSummary;
  warehouse_summary: WarehouseSummary[];
  meta: NonMovingMeta;
}

// ============================================================================
// Item Group Dropdown
// ============================================================================

export interface ItemGroup {
  item_group_code: number;
  item_group_name: string;
}

export interface ItemGroupResponse {
  data: ItemGroup[];
  meta: {
    total_groups: number;
    fetched_at: string;
  };
}
