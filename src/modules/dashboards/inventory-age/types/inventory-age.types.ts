// ============================================================================
// Filters
// ============================================================================

export interface InventoryAgeFilters {
  search?: string;
  warehouse?: string[];
  item_group?: string;
  sub_group?: string[];
  variety?: string[];
  min_age?: number;
}

// ============================================================================
// Inventory Item
// ============================================================================

export interface InventoryAgeItem {
  item_code: string;
  item_name: string;
  is_litre: boolean;
  item_group: string;
  unit: string;
  variety: string;
  sku: string;
  sub_group: string;
  warehouse: string;
  on_hand: number;
  litres: number;
  in_stock_value: number;
  calc_price: number;
  effective_date: string | null;
  days_age: number;
}

// ============================================================================
// Warehouse Summary
// ============================================================================

export interface WarehouseSummary {
  warehouse: string;
  item_count: number;
  total_value: number;
  total_quantity: number;
  total_litres: number;
}

// ============================================================================
// Filter Options (populated from API response)
// ============================================================================

export interface ItemGroupOption {
  item_group_code: number;
  item_group_name: string;
}

export interface InventoryAgeFilterOptions {
  item_groups: ItemGroupOption[];
  sub_groups: string[];
  warehouses: string[];
  varieties: string[];
}

// ============================================================================
// Meta
// ============================================================================

export interface InventoryAgeMeta {
  total_items: number;
  total_value: number;
  total_quantity: number;
  total_litres: number;
  warehouse_count: number;
  fetched_at: string;
}

// ============================================================================
// Response
// ============================================================================

export interface InventoryAgeResponse {
  data: InventoryAgeItem[];
  meta: InventoryAgeMeta;
  warehouse_summary: WarehouseSummary[];
}
