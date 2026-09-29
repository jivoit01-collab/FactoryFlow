/**
 * The tank farm and oil lots, as the API sends them.
 *
 * Two kinds of number arrive. A record's own fields (a tank, a lot, a shortage)
 * are decimals as STRINGS, exactly as stored ("10989.00"). A worked-out read-out
 * (a summary, an average, the stock dashboard) sends plain NUMBERS.
 *
 * Units: tanks in LITRES; a lot in KILOGRAMS with its rate per kg (its litres
 * ride along, worked out at 1.0989 L to the kg); a shortage in METRIC TONNES.
 */

type Decimal = string;

// --- oils and tanks --------------------------------------------------------

export type OilCategory =
  | 'SOYABEAN'
  | 'OLIVE'
  | 'CANOLA'
  | 'MUSTARD'
  | 'GROUNDNUT'
  | 'GHEE'
  | 'SUNFLOWER'
  | 'RICE BRAN'
  | 'COCONUT'
  | 'SESAME'
  | 'EXTRA VIRGIN'
  | 'COTTON SEED'
  | 'BLENDED';

export interface Oil {
  id: number;
  code: string;
  name: string;
  category: OilCategory | '';
  category_label: string;
  /** "#d95c26" - what the tank drawings are painted in. */
  color: string;
  is_active: boolean;
  tank_count: number;
  lot_count: number;
  created_at: string;
  updated_at: string;
}

/** An oil is one of SAP's raw-material oils: its code is picked, its name is SAP's. */
export interface OilPayload {
  code: string;
  category: OilCategory | '';
  color: string;
  is_active: boolean;
}

/** One of SAP's raw-material oils (an RM item whose unit is OIL). */
export interface SapOil {
  code: string;
  name: string;
  /** SAP's variety (CANOLA, OLIVE …), offered as the category. */
  sub_group: string;
  frozen: boolean;
  /** The oil here that already is this item, if any. */
  oil: number | null;
}

export interface SapOilList {
  oils: SapOil[];
  /** SAP did not answer: nothing can be picked until it does. */
  sap_unavailable: boolean;
}

export type TankKind = 'TANK' | 'TOTES';

export interface Tank {
  id: number;
  /** TNK0001 / TOT001 */
  code: string;
  kind: TankKind;
  item: number | null;
  item_code: string | null;
  item_name: string | null;
  item_color: string | null;
  capacity_l: Decimal;
  /** The level as last dipped: the stock, not a capacity. */
  level_l: Decimal;
  used_pct: number | null;
  is_active: boolean;
  updated_at: string;
  updated_by_name: string | null;
}

export interface TankCreatePayload {
  kind: TankKind;
  capacity_l: string;
  item: number | null;
  level_l: string;
  is_active?: boolean;
}

export interface TankUpdatePayload {
  capacity_l?: string;
  item?: number | null;
  level_l?: string | null;
  is_active?: boolean;
}

export interface TankSummary {
  /** The tanks alone, as the Admin board's tank tile counts them; totes beside. */
  farm: {
    capacity_l: number;
    level_l: number;
    used_pct: number;
    tank_count: number;
    /** Oils held in the tanks or the totes. */
    oil_count: number;
    totes: { capacity_l: number; level_l: number; count: number };
  };
  oils: {
    total_l: number;
    items: {
      item: number;
      code: string;
      name: string;
      color: string;
      level_l: number;
      capacity_l: number;
      tanks: string[];
      tank_count: number;
    }[];
  };
}

export interface AverageCostLot {
  lot: number;
  created_at: string;
  party: string;
  vehicle: string;
  transporter: string;
  rate_per_litre: number;
  rate_per_kg: number;
  lot_litres: number;
  lot_kg: number;
  litres_in_tank: number;
  kg_in_tank: number;
  value: number;
}

/** What the litres of one oil in the farm cost, lot by lot. */
export interface AverageCost {
  item: number;
  code: string;
  name: string;
  tank_l: number;
  tank_kg: number;
  /** The litres the in-tank lots account for. */
  matched_l: number;
  matched_kg: number;
  unmatched_l: number;
  /** Over every litre in the tanks (EXIM's "IN_TANK" figure). */
  average_per_litre: number;
  average_per_kg: number;
  /** Over the litres a lot accounts for (EXIM's "STO" figure): what the screens show. */
  matched_average_per_litre: number;
  matched_average_per_kg: number;
  lots: AverageCostLot[];
  warning: string | null;
}

export interface TankLog {
  id: number;
  kind: 'INWARD' | 'OUTWARD' | 'TRANSFER';
  lot: number | null;
  /** Kilograms: the lot's own figure as it went in. */
  quantity_kg: Decimal;
  rate: Decimal | null;
  vehicle_number: string;
  party: string;
  item_code: string;
  item_name: string;
  arrival: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface OpeningStockPayload {
  item: number;
  rate_per_litre: string;
  quantity_litres: string;
}

// --- lots ------------------------------------------------------------------

export type LotStatus =
  | 'IN_CONTRACT'
  | 'UNDER_LOADING'
  | 'ON_THE_SEA'
  | 'MUNDRA_PORT'
  | 'KANDLA_STORAGE'
  | 'OTW_TO_REFINERY'
  | 'AT_REFINERY'
  | 'ON_THE_WAY'
  | 'OUT_SIDE_FACTORY'
  | 'IN_TANK'
  | 'IN_WAREHOUSE'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'IN_TRANSIT'
  | 'PENDING'
  | 'PROCESSING';

export type PaymentStatus = 'PAID' | 'UNPAID';

/** How a changed quantity is handled: handed back to the storage lot, or absorbed. */
export type LotAction = 'RETAIN' | 'TOLERATE';

export interface Lot {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  item_color: string;
  status: LotStatus;
  status_label: string;
  vendor_code: string;
  vendor_name: string;
  /** Per kilogram. */
  rate: Decimal;
  /** Kilograms. */
  quantity: Decimal;
  total: Decimal;
  rate_per_litre: Decimal | null;
  quantity_litres: Decimal;
  job_work: string;
  vehicle_number: string;
  transporter: string;
  location: string;
  eta: string | null;
  arrival_date: string | null;
  parent: number | null;
  is_accumulator: boolean;
  bilty_number: string;
  grpo_number: string;
  payment_status: PaymentStatus;
  contract_start: string | null;
  contract_end: string | null;
  deleted: boolean;
  created_at: string;
  created_by_name: string | null;
  updated_at: string;
}

export interface LotBrief {
  id: number;
  status: LotStatus;
  status_label: string;
  quantity: Decimal;
  vehicle_number: string;
  deleted: boolean;
}

export interface LotChange {
  id: number;
  lot: number;
  action: 'CREATE' | 'UPDATE';
  changed_by_name: string | null;
  note: string;
  timestamp: string;
  /** "__create__" carries the lot's first values as an object. */
  changed_fields: { field: string; old: unknown; new: unknown }[];
}

export interface LotDetail extends Lot {
  parent_summary: LotBrief | null;
  children: LotBrief[];
  history: LotChange[];
}

export interface LotFilters {
  status?: LotStatus[];
  vendor?: string[];
  item?: number[];
}

export interface LotInsights {
  count: number;
  total_value: number;
  total_qty: number;
  total_qty_litres: number;
  avg_price_per_kg: number;
  avg_price_per_litre: number;
}

export interface LotFieldsPayload {
  rate?: string;
  quantity?: string;
  vehicle_number?: string;
  transporter?: string;
  location?: string;
  eta?: string | null;
  arrival_date?: string | null;
  bilty_number?: string;
  grpo_number?: string;
  contract_start?: string | null;
  contract_end?: string | null;
  payment_status?: PaymentStatus;
  job_work?: string;
}

export interface LotCreatePayload extends LotFieldsPayload {
  item: number;
  status: LotStatus;
  vendor_code: string;
  vendor_name?: string;
  rate: string;
  quantity: string;
}

export interface MovePayload {
  status: LotStatus;
  quantity: string;
  action?: LotAction | null;
  arrival_date?: string | null;
  location?: string | null;
  payment_status?: PaymentStatus | null;
}

export interface DispatchPayload {
  status: LotStatus;
  quantity: string;
  action?: LotAction | null;
  vehicle_number?: string;
  transporter?: string;
  location?: string;
  eta?: string | null;
  payment_status?: PaymentStatus | null;
}

export interface ArrivePayload {
  weighed_qty: string;
  status?: LotStatus;
  action?: LotAction | null;
  job_work?: string;
}

export interface IntoTankPayload {
  weighed_qty: string;
  status?: 'IN_TANK' | 'IN_WAREHOUSE';
  bilty_number?: string | null;
  grpo_number?: string | null;
}

export type BulkAction = 'arrive_refinery' | 'mark_in_tank' | 'delete';

export interface LotChangeParams {
  lot?: number;
  action?: 'CREATE' | 'UPDATE';
  /** Matches the person's name or email. */
  changed_by?: string;
  /** YYYY-MM-DD, inclusive. */
  since?: string;
  until?: string;
  page?: number;
  page_size?: number;
}

export interface LotChangePage {
  count: number;
  page: number;
  page_size: number;
  results: LotChange[];
}

export interface Vendor {
  code: string;
  name: string;
  /** A vendor SAP does not have yet (TEMP0001 ...). */
  temporary: boolean;
}

export interface VendorList {
  vendors: Vendor[];
  /** SAP did not answer: only the temporary vendors are listed. */
  sap_unavailable: boolean;
}

// --- read-outs --------------------------------------------------------------

export interface StockDashboard {
  columns: { status: LotStatus; label: string; vendors: string[] }[];
  rows: {
    item: number;
    code: string;
    name: string;
    /** Where the shared order puts it; null for an oil not placed yet. */
    position: number | null;
    outside_factory: number;
    /** Kilograms, keyed "<STATUS>__<vendor name>". */
    values: Record<string, number>;
    total: number;
  }[];
  totals: {
    outside_factory: number;
    columns: Record<string, number>;
    statuses: Record<string, number>;
    grand_total: number;
  };
  active_items: number;
  /** The vendors on the board, as its lots carry them: pick a name, send its code. */
  vendors: { code: string; name: string }[];
}

export interface VehicleReportRow {
  vehicle_number: string;
  transporter: string;
  /** On a truck, a line is its lots of one oil from one vendor; a lot with no vehicle is a line of its own. */
  items: {
    /** The lots the line sums. */
    lots: number[];
    item_code: string;
    item_name: string;
    vendor_code: string;
    vendor_name: string;
    litres: number;
    kg: number;
    mt: number;
    eta: string | null;
    arrival_date: string | null;
    job_work: string;
    rate: number | null;
    payment_status: PaymentStatus;
    contract_end: string | null;
  }[];
}

export interface Shortage {
  id: number;
  lot: number | null;
  item_code: string;
  item_name: string;
  supplier_code: string;
  supplier: string;
  vehicle_number: string;
  transporter: string;
  bilty_number: string;
  grpo_number: string;
  /** Per metric tonne. */
  rate: Decimal;
  load_qty_mt: Decimal | null;
  unload_qty_mt: Decimal | null;
  shortage_mt: Decimal | null;
  allowed_mt: Decimal | null;
  deducted_mt: Decimal | null;
  deduction_amount: Decimal | null;
  created_at: string;
  created_by_name: string | null;
}

export interface ShortageList {
  totals: { count: number; deducted_mt: number; deduction_amount: number };
  results: Shortage[];
}

export interface ContractHistoryRow {
  id: number;
  item_code: string;
  item_name: string;
  vendor_code: string;
  vendor_name: string;
  rate: Decimal;
  contract_start: string | null;
  contract_end: string | null;
  created_at: string;
  created_by_label: string;
}

export interface LitresAndTonnes {
  litres: number;
  mt: number;
}

export interface DirectorInventory {
  at_factory: LitresAndTonnes & { in_tank: LitresAndTonnes; outside_factory: LitresAndTonnes };
  stages: ({ status: LotStatus; label: string } & LitresAndTonnes)[];
  /** Packed oil from SAP; null when SAP did not answer (see finished_reason). */
  finished: {
    total: LitresAndTonnes;
    warehouses: ({ warehouse: string } & LitresAndTonnes)[];
  } | null;
  finished_reason: string | null;
}
