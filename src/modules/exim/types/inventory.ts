/**
 * Warehouse Inventory (`GET /exim/warehouse-inventory/`): oil in SAP's
 * warehouses, in litres, by category. A plain dict on the server, so figures
 * arrive as NUMBERS.
 *
 * A negative figure is SAP's own: stock issued before it was received. EXIM
 * made every balance positive; here it stays negative so it shows.
 */

/** Raw material (an `RM` item) or finished goods (`FG`). */
export type InventoryKind = 'RM' | 'FG';

export interface InventoryCategory {
  kind: InventoryKind;
  /** The oil's sub-group, with EXIM's overrides; `UNCLASSIFIED` when SAP has none. */
  category: string;
  litres: number;
  items: number;
  negative_items: number;
}

export interface InventoryWarehouse {
  warehouse: string;
  warehouse_name: string;
  litres: number;
  kinds: InventoryKind[];
  negative_items: number;
  /** Biggest first. */
  categories: InventoryCategory[];
}

export interface InventoryItem {
  warehouse: string;
  warehouse_name: string;
  item_code: string;
  item_name: string;
  kind: InventoryKind;
  category: string;
  /** In the item's own unit in SAP (packs for finished goods). */
  on_hand: number;
  /** SAP's inventory unit for the item: what `on_hand` counts. */
  unit: string;
  litres: number;
}

export interface WarehouseInventory {
  read_at: string;
  /** The warehouses EXIM's screen showed, those that hold oil now. */
  default_warehouses: string[];
  /** EXIM's nine first, in its order, then the rest by code. */
  warehouses: InventoryWarehouse[];
  /** One warehouse's items, when asked with `warehouse`; otherwise null. */
  items: InventoryItem[] | null;
}
