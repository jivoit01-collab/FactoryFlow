// ============================================================================
// Filters
// ============================================================================

export interface NonMovingFilters {
  age: number;
  item_group: number;
  search?: string;
}

// ============================================================================
// Non-Moving Item
// ============================================================================

export interface NonMovingItem {
  branch: string;
  item_code: string;
  item_name: string;
  item_group_name: string;
  quantity: number;
  litres: number;
  sub_group: string;
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
