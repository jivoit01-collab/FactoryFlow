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
  /**
   * `OITM.U_Gross_Weight` — **gross** kg of one sales case, packaging included.
   * Weight per piece is this over `pieces_per_box`.
   *
   * Null where SAP records no weight for the SKU, or where the company has no
   * such user-defined field at all. Apply it only where `uom` is a piece unit —
   * on a row stocked in KG or LTR the on-hand figure is already a mass or a
   * volume, and dividing it by a pack factor means nothing.
   */
  gross_weight_per_case: number | null;
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
  /** SKUs with no case weight recorded — stock a tonnage total cannot see. */
  unweighed_items: number;
  /** Rows whose on-hand is a mass or volume, where a pack factor cannot apply. */
  non_piece_items: number;
  fetched_at: string;
}

export interface WarehouseOccupancyResponse {
  data: WarehouseOccupancyItem[];
  meta: WarehouseOccupancyMeta;
}

/** One batch of an item standing in a warehouse. */
export interface ItemBatch {
  batch: string;
  quantity: number;
  /**
   * When it was made. Null where SAP holds no manufacturing date — never the
   * receipt date in its place. `mfg_date_source` says which date `age_days`
   * was measured from.
   */
  mfg_date: string | null;
  /** When it entered SAP. Always present; a receipt date, not a make date. */
  in_date: string | null;
  exp_date: string | null;
  mfg_date_source: 'manufactured' | 'received' | 'unknown';
  notes: string;
  committed: number;
  age_days: number | null;
  days_to_expiry: number | null;
}

export interface ItemBatchMeta {
  item_code: string;
  warehouse: string;
  batch_count: number;
  total_quantity: number;
  /** Batches SAP holds no manufacturing date for. */
  without_mfg_date: number;
  without_exp_date: number;
  oldest_age_days: number | null;
  /** Since ANY movement — what the non-moving report ages on. */
  last_any_date: string | null;
  days_since_any: number | null;
  /**
   * Since stock last LEFT. The honest standing age on a floor goods are
   * produced INTO, where an inbound receipt is arrival rather than movement.
   */
  last_out_date: string | null;
  days_since_out: number | null;
  last_in_date: string | null;
  days_since_in: number | null;
  fetched_at: string;
}

/** One posting that moved (or failed to move) stock through the warehouse. */
export interface ItemMovement {
  date: string | null;
  trans_type: number;
  /** Plain-language meaning, e.g. "Received from production". */
  label: string;
  in_qty: number;
  out_qty: number;
  /**
   * Taken from the quantity, never the transaction type — a transfer goes both
   * ways. `NONE` means the posting moved no stock at all (revaluation, order).
   */
  direction: 'IN' | 'OUT' | 'NONE';
  doc_ref: string;
}

export interface ItemBatchResponse {
  data: ItemBatch[];
  movements: ItemMovement[];
  meta: ItemBatchMeta;
}
