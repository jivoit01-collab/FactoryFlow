/** Shapes the Production Control board reads. */

/** One SKU's stock in a warehouse, with the two SAP pack fields. */
export interface WarehouseOccupancyItem {
  item_code: string;
  item_name: string;
  on_hand: number;
  /**
   * `OITM.SalFactor2` — pieces per box. Null where SAP holds no factor, and
   * **1 means the SKU is billed by the piece and is not boxed at all**, so it
   * must never be divided by a boxes-per-pallet figure.
   */
  pieces_per_box: number | null;
  /** `OITM.SalPackUn` — litres in one piece. Null where SAP holds no volume. */
  litres_per_piece: number | null;
  stock_value: number;
  sub_group: string;
  uom: string;
}

export interface WarehouseOccupancyMeta {
  warehouse: string;
  item_count: number;
  total_on_hand: number;
  total_value: number;
  /** SKUs SAP bills by the piece rather than the box. */
  loose_items: number;
  /** SKUs SAP holds no pieces-per-box for at all. */
  unconfigured_items: number;
  fetched_at: string;
}

export interface WarehouseOccupancyResponse {
  data: WarehouseOccupancyItem[];
  meta: WarehouseOccupancyMeta;
}
