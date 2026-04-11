// ============================================================================
// Filter Options
// ============================================================================

export interface WarehouseOption {
  code: string;
  name: string;
}

export interface ItemGroupOption {
  code: number;
  name: string;
}

export interface WarehouseFilterOptions {
  warehouses: WarehouseOption[];
  item_groups: ItemGroupOption[];
}

// ============================================================================
// Inventory
// ============================================================================

export interface InventoryFilters {
  search?: string;
  warehouse?: string;
  item_group?: string;
}

export interface InventoryItem {
  item_code: string;
  item_name: string;
  item_group: string;
  warehouse: string;
  on_hand: number;
  committed: number;
  on_order: number;
  available: number;
  uom: string;
  is_batch_managed: boolean;
  min_stock: number;
  is_below_min: boolean;
}

export interface InventoryMeta {
  total_items: number;
  total_on_hand: number;
  warehouse_count: number;
  below_min_count: number;
  fetched_at: string;
}

export interface InventoryResponse {
  data: InventoryItem[];
  meta: InventoryMeta;
}

// ============================================================================
// Item Detail
// ============================================================================

export interface WarehouseStock {
  warehouse_code: string;
  warehouse_name: string;
  on_hand: number;
  committed: number;
  on_order: number;
  available: number;
  min_stock: number;
}

export interface Batch {
  item_code: string;
  batch_number: string;
  warehouse_code: string;
  quantity: number;
  admission_date: string | null;
  expiry_date: string | null;
}

export interface ItemDetail {
  item_code: string;
  item_name: string;
  item_group: string;
  uom: string;
  is_batch_managed: boolean;
  variety: string;
  sub_group: string;
  total_on_hand: number;
  total_committed: number;
  total_on_order: number;
  total_available: number;
  warehouse_stock: WarehouseStock[];
  batches: Batch[];
}

// ============================================================================
// Movement History
// ============================================================================

export interface MovementHistoryFilters {
  warehouse?: string;
  from_date?: string;
  to_date?: string;
}

export interface Movement {
  item_code: string;
  warehouse: string;
  in_qty: number;
  out_qty: number;
  trans_type: number;
  create_date: string | null;
  doc_num: number;
  balance: number;
}

export interface MovementHistoryResponse {
  item_code: string;
  movements: Movement[];
  meta: {
    total_movements: number;
    fetched_at: string;
  };
}

// ============================================================================
// Dashboard
// ============================================================================

export interface LowStockAlert {
  item_code: string;
  item_name: string;
  warehouse: string;
  on_hand: number;
  min_stock: number;
  uom: string;
  shortage: number;
}

export interface DashboardSummary {
  low_stock_alerts: LowStockAlert[];
  low_stock_count: number;
  meta: {
    fetched_at: string;
  };
}

// ============================================================================
// Batch Expiry / Non-Moving
// ============================================================================

export interface BatchExpiryItem {
  item_code: string;
  item_name: string;
  item_group: string;
  batch_number: string;
  warehouse: string;
  quantity: number;
  admission_date: string | null;
  expiry_date: string | null;
  days_age: number;
  uom: string;
  variety: string;
}

export interface BatchExpiryResponse {
  data: BatchExpiryItem[];
  meta: {
    total_batches: number;
    fetched_at: string;
  };
}
