import type { MovementStatus } from '../utils/movementStatus';

// ============================================================================
// Filters
// ============================================================================

export interface NonMovingFilters {
  age: number;
  item_group: number;
  search?: string;
  warehouse?: string[];
  sub_group?: string[];
  status?: MovementStatus[];
}

export type NonMovingSortCol =
  | 'item_code'
  | 'item_name'
  | 'warehouse'
  | 'quantity'
  | 'value'
  | 'days_since_last_movement'
  | 'consumption_ratio';

// ============================================================================
// Non-Moving Item
// ============================================================================

/**
 * Which rule aged the row.
 *
 * `production` is packing material: only an issue to a production order, or a
 * receipt from one, resets its clock. Being carried from one godown to another
 * does not. `any` is every other item group — days since that warehouse last
 * saw a movement of any kind.
 */
export type MovementBasis = 'production' | 'any';

export interface NonMovingItem {
  branch: string;
  item_code: string;
  item_name: string;
  item_group_name: string;
  sub_group: string;
  warehouse: string;
  warehouse_name?: string;
  quantity: number;
  value: number;
  last_movement_date: string | null;
  days_since_last_movement: number;
  consumption_ratio: number;
  /** Older backends omit it; absent reads as `any`. */
  movement_basis?: MovementBasis;
  /** The warehouse's own last movement, transfers included. */
  last_warehouse_movement_date?: string | null;
  days_since_warehouse_movement?: number;
}

/**
 * One table line: either a single (item, warehouse) row, or every warehouse
 * holding that item folded into one line.
 */
export interface NonMovingRow extends NonMovingItem {
  /** Warehouse codes folded into this line, in code order. */
  warehouses: string[];
  warehouse_count: number;
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
