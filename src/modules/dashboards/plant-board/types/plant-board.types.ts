/**
 * Shapes the plant control board reads.
 *
 * One response for the whole screen — see the backend's `plant_board/services.py`
 * for why a wall board is one composed read rather than twenty panel requests.
 *
 * Two conventions run through all of it and are worth knowing before reading a
 * field name:
 *
 *  - **A band can be `null`.** Each one is built independently on the server, so
 *    a HANA outage costs the bands that need SAP and leaves the ones that come
 *    out of Postgres standing. A null band is named in `meta.degraded`, and the
 *    wall paints its tiles with the reason rather than with a zero.
 *  - **Tons are litres ÷ 1000**, applied to oil and finished goods only. Packing
 *    material carries no litre volume in SAP, so the Purchase and Store bands
 *    are in pieces and say so.
 */

/** Which tiles have no data source yet, and what each is waiting on. */
export type PendingTiles = Record<string, string>;

export interface PlantBoardPlan {
  abs_id: number | null;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  /** True when the plan's own dates contain today. */
  is_current: boolean;
  days_total: number | null;
  /** Plan-to-date — the span "purchased so far" is measured over. */
  days_elapsed: number | null;
}

export interface PurchaseWorstRow {
  item_code: string;
  item_name: string;
  short_qty: number;
  short_value: number;
  po_overdue: boolean;
}

export interface PlantBoardPurchase {
  /** The plan, in pieces. Never tons — no packaging item is a litre item. */
  planning_qty: number;
  planning_unit: string;
  /**
   * The same columns in rupees, priced per item at `OITM.LastPurPrc` and then
   * summed — never total quantity times a blended rate, which would be
   * dominated by whichever component happens to be numerous.
   */
  planning_value: number;
  issued_value: number;
  on_hand_value: number;
  open_po_value: number;
  /** Components the item master holds no price for: every one understates the above. */
  unpriced_count: number;
  /**
   * What ARRIVED on the floor (a movement into BH-PC) — not what the line
   * used. The gap between this and `consumed_qty` is packaging standing at the
   * line unopened.
   */
  reached_floor_qty: number;
  /** What the line actually USED: the goods issue out of BH-PC. */
  consumed_qty: number;
  on_hand_qty: number;
  /**
   * Buying activity for the plan month. All three come off the same PO lines,
   * so they tie: `ordered_qty = po_received_qty + po_open_qty`.
   */
  po_count: number;
  po_lines: number;
  ordered_qty: number;
  po_received_qty: number;
  po_open_qty: number;
  /** Quantity x Price, both in the purchase unit, so the product is an amount. */
  ordered_value: number;
  po_received_value: number;
  po_open_value: number;
  /** Lines SAP has closed. A line closed by hand reads as fully received. */
  po_closed_lines: number;
  po_basis: string;
  /** The standing open-order book — a different question from the month's buying. */
  open_po_qty: number;
  open_po_overdue_count: number;
  /** The gate's own count of what arrived, as an independent check. */
  grpo_received_qty: number;
  grpo_basis: string;
  /**
   * Over-purchase, read off the PM Requirement sheet rather than recomputed:
   * its `Req after PO` column summed over the rows its Over-purchased filter
   * selects. Signed and summed over the flagged rows only, so it is the same
   * figure a buyer gets by selecting that chip and adding the column up.
   */
  over_purchased_qty: number;
  over_purchased_count: number;
  over_purchase_value: number;
  over_purchase_basis: string;
  short_count: number;
  short_value: number;
  /**
   * The Stock Benchmark dashboard's own figures, read with that page's own
   * filters — same warehouses, same statuses, recently-used only, same material
   * group — so the two screens cannot disagree. `sku_count` is healthy + low +
   * critical, which is what that page's "Total Items" card shows.
   */
  sku_count: number;
  healthy_count: number;
  below_benchmark_count: number;
  low_count: number;
  critical_count: number;
  /** Gross case weight of the stock under benchmark. Null where SAP holds none. */
  below_benchmark_tonnes: number | null;
  /** Under-benchmark rows the tonnage above could not count. */
  unweighed_below_benchmark: number;
  benchmark_basis: string;
  stores: string[];
  worst: PurchaseWorstRow[];
}

export interface NonMovingItem {
  item_code: string;
  item_name: string;
  /** Idle days on the FRESHEST movement across the stores holding it. */
  days: number;
  status: 'slow-moving' | 'non-moving';
  value: number;
  quantity: number;
  warehouses: string[];
}

/**
 * Read with the Non-Moving dashboard's own rules so the two agree: over 45
 * idle days is non-moving, 30-45 is slow-moving, and a SKU held in several
 * stores keeps its freshest movement rather than its oldest.
 */
export interface NonMovingSnapshot {
  /** Slow-moving and non-moving together — what that page shows by default. */
  item_count: number;
  total_value: number;
  slow_moving_count: number;
  non_moving_count: number;
  slow_moving_value: number;
  non_moving_value: number;
  oldest_days: number;
  /** SKUs set aside as recently moved, so the tile's scope is visible. */
  recent_count: number;
  warehouses: string[];
  items: NonMovingItem[];
  basis: string;
}

/**
 * Rated capacity and the last physical count, typed on the board's settings
 * page because SAP holds neither.
 */
/**
 * The floor the packaging stores stand on, and the stock standing on it.
 *
 * `occupied_pct` is deliberately null. The area is in square feet and the
 * stock is in pieces, and nothing in SAP converts between them — no footprint,
 * no pallet count, no stack height, and `SalFactor2` is 1 across most of this
 * range. An invented percentage on a wall is worse than an honest gap, because
 * somebody would plan a building against it. `occupancy_blocked_on` names the
 * one factor that would close it.
 */
export interface FloorArea {
  sqft: number;
  /** One measured block. The first covers three warehouses and cannot be split. */
  blocks: { key: string; label: string; warehouses: string[]; sqft: number }[];
  store_count: number;
  held_pieces: number;
  held_value: number;
  held_items: number;
  unpriced_items: number;
  by_store: {
    warehouse: string;
    pieces: number;
    value: number;
    items: number;
    pallets: number;
    occupied_sqft: number | null;
  }[];
  /** Live stock turned into pallets, each item on its own stacking figure. */
  pallets: number;
  /** The floor one pallet stands on. 15 sq ft as the factory measured it. */
  sqft_per_pallet: number | null;
  /** When the factory last measured the range, for the tile to disclose. */
  stacking_measured_on: string;
  /** Items with no pallet figure: every one makes the floor read emptier. */
  unmeasured_items: number;
  unmeasured_pieces: number;
  /** Live stock x the factor. Null with the factor unset — never a guess. */
  occupied_sqft: number | null;
  /** Floored at zero: a store packed past its measured area is a real thing. */
  free_sqft: number | null;
  occupied_pct: number | null;
  /** Empty once the factor is set; otherwise what is missing and where. */
  occupancy_blocked_on: string;
}

export interface StockSpace {
  area: FloorArea;
  stores: {
    warehouse: string;
    capacity_tonnes: number | null;
    last_audit_date: string | null;
    audit_days_ago: number | null;
  }[];
  /** Null unless EVERY store has one — a partial sum understates the denominator. */
  capacity_tonnes: number | null;
  capacity_configured: number;
  store_count: number;
  /** The OLDEST of the configured stores: the one nobody has been to. */
  last_audit_date: string | null;
  last_audit_warehouse: string;
  audit_days_ago: number | null;
  audit_configured: number;
  basis: string;
}

export interface PlantBoardStore {
  stock_space: StockSpace;
  /** Every idle SKU at any age. No age floor and no percentage, by decision. */
  non_moving: NonMovingSnapshot;
  pm_vehicles_today: {
    /** Distinct vehicles: one truck carrying three orders is one truck. */
    count: number;
    po_count: number;
    line_count: number;
    /** Written at the GATE, when the truck is unloaded. */
    received_qty: number;
    /**
     * Written at GRPO POSTING, not at the gate — `grpo.services.post_grpo`
     * sets accepted and derives rejected from it.
     */
    accepted_qty: number;
    rejected_qty: number;
    /**
     * Received but with no GRPO posted: stock in the building that SAP does
     * not have yet. Not a quality question — on a board scoped to today this
     * is usually most of the day's intake.
     */
    awaiting_grpo_qty: number;
  };
  /**
   * Blowing over the plan month. Bottles come off the machine counter, so a
   * day's output is there whether or not the run has been costed; the money
   * comes from the costing and is only as complete as it.
   */
  blowing: {
    window_from: string;
    window_to: string;
    /** The trailing week, one entry a day, idle days included as zeroes. */
    daily: { date: string; bottles: number }[];
    runs: number;
    uncosted_runs: number;
    /** Days that actually blew — the denominator for both averages. */
    active_days: number;
    bottles_made: number;
    bottles_rejected: number;
    bottles_good: number;
    avg_bottles_per_day: number | null;
    /** Net of scrap recovery, resin included. */
    cost: number;
    preform_cost: number;
    conversion_cost: number;
    avg_cost_per_day: number | null;
    cost_per_bottle: number | null;
    /**
     * The lines turning RIGHT NOW — runs with an open segment, never runs at
     * status IN_PROGRESS, which stays set through every idle hour until
     * somebody completes the run.
     *
     * The cost is `preform_cost + blowing_cost` summed across those runs, a
     * day often carrying more than one. It is as of the last costing rather
     * than to the minute, so it is a floor on the real figure.
     */
    running_runs: number;
    running_bottles: number;
    running_preform_cost: number;
    running_blowing_cost: number;
    running_cost: number;
    running_uncosted: number;
    /** Open runs dated before today: worked through midnight, or never closed. */
    running_started_earlier: number;
    basis: string;
  };
}

export interface AgeBucket {
  value: number;
  pieces: number;
  litres: number;
  /** Litres ÷ 1000. Excludes SKUs SAP holds no litre volume for. */
  tons: number;
  items: number;
  /** SKUs in this bucket with no litre volume, so absent from its tonnage. */
  unweighed: number;
}

export interface FloorStock {
  warehouse: string;
  stock_value: number;
  total_pieces: number;
  tons: number;
  item_count: number;
  unconfigured_items: number;
  /** SKUs holding stock that SAP records no litre volume for. */
  unweighed_items: number;
  /**
   * Aged on when stock last LEFT, never on any movement — BH-PF is produced
   * into, so a receipt is arrival. `never_shipped` is its own bucket because
   * "has never left" is a worse problem than "left a long time ago".
   */
  age: {
    fresh: AgeBucket;
    d4_7: AgeBucket;
    d7_plus: AgeBucket;
    never_shipped: AgeBucket;
  };
  age_basis: string;
}

export interface Wastage {
  /** Oil loss is a YIELD figure: issued against packed, not a declared row. */
  oil_issued_litres: number;
  oil_packed_litres: number;
  oil_loss_litres: number;
  oil_loss_tons: number;
  oil_loss_pct: number | null;
  oil_basis: string;
  oil_assumed_litre_lines: number;
  /** Packaging waste is what somebody logged and four people signed. */
  pm_logged_qty: number;
  pm_log_count: number;
  pm_approved_count: number;
  pm_unclassified_count: number;
  oil_logged_qty: number;
  /** The window's waste in rupees, split the same way. */
  pm_logged_value: number;
  rm_logged_value: number;
  logged_unpriced_count: number;
  pm_basis: string;
  /** The trailing week, one entry per day, every day present. */
  logged_daily: WasteDay[];
  logged_today: WasteDay;
  /**
   * The most recent day anything was logged against, which is what the board
   * headlines. Waste is written up days after the shift, so today is usually
   * empty and heading the tile with it would report a clean shift on the
   * strength of missing paperwork. Null when the register holds nothing.
   */
  logged_latest: WasteDay | null;
  logged_latest_date: string | null;
  logged_days_behind: number | null;
  logged_standalone_count: number;
  logged_basis: string;
}

/** A quantity that keeps its own unit, because pieces, kilos and metres
 *  cannot be added to each other. */
export interface WasteByUom {
  uom: string;
  qty: number;
}

/**
 * One day of the waste register, dated by the production run the waste belongs
 * to rather than by when somebody typed it up.
 */
export interface WasteDay {
  date: string;
  logs: number;
  /**
   * What the day's waste cost, at the price the run itself was costed at.
   * Money is the only scale the register's pieces, kilos and metres share.
   */
  pm_value: number;
  rm_value: number;
  other_value: number;
  total_value: number;
  /** Rows that could not be priced. The money above is short by these. */
  unpriced: number;
  /** Packing material in pieces, which is nearly all of what is logged. */
  pm_pieces: number;
  /** The rest of the packing waste, each unit kept apart (MTR, KGS). */
  pm_other: WasteByUom[];
  /** Raw material in litres — oil. */
  rm_litres: number;
  rm_other: WasteByUom[];
}

export interface DailyQty {
  date: string;
  /** Pieces, the unit SAP posts the receipt in. */
  qty: number;
}

/**
 * Today off the lines' own register (Production Execution), not off SAP. SAP
 * holds no plan for a single day and only learns of output when the receipt is
 * posted, so the supervisor's register is the only source for either half while
 * the shift is still running.
 */
export interface TodayOnTheLines {
  date: string;
  /** PIECES, converted from the cases the module records by each run's own
   *  bottles-per-case. Summed across every run on every line today. */
  planned_qty: number;
  produced_qty: number;
  /** The same pair in the cases the module actually records. */
  planned_cases: number;
  produced_cases: number;
  attainment_pct: number | null;
  runs: number;
  lines: number;
  completed_runs: number;
  /** Runs with no bottles-per-case, left out of the piece totals above. */
  unconverted_runs: number;
}

export interface PlantBoardProduction {
  /**
   * PIECES on both sides — the unit SAP already holds them in, so the
   * comparison needs no conversion. The plan is in `OITM.InvntryUom` and a
   * production receipt is posted in the same unit.
   */
  planned_qty: number;
  produced_qty: number;
  /** The same pair in cases, for the floor, which does not speak in pieces. */
  planned_cases: number;
  produced_cases: number;
  /** Computed on pieces: the case ratio is a differently weighted number. */
  attainment_pct: number | null;
  planned_tons: number;
  produced_tons: number;
  /** The same ratio on the tonnage, which is what the tile reads in. */
  attainment_tons_pct: number | null;
  /** Planned SKUs with no litre volume in SAP, so absent from the tons. */
  unweighed_lines: number;
  /** Output ÷ days that actually produced, not calendar days. */
  avg_qty_per_active_day: number | null;
  active_days: number;
  elapsed_days: number | null;
  /** Today's plan and today's output, from the lines' own register. */
  today: TodayOnTheLines;
  daily: DailyQty[];
  floor: FloorStock;
  wastage: Wastage;
}

/** One destination off the floor, in the band's fixed order. */
export interface ShiftingRoute {
  /**
   * `BH-BT`, `DISPATCH`, or `ELSEWHERE` for the tail. There is no Gupta
   * route: that godown holds Mart's stock, so a load into it is the sale
   * the DISPATCH row already carries. A load still booked to the retired
   * `GP-FG` code lands in ELSEWHERE, which names it in `codes`.
   */
  route: string;
  name: string;
  is_dispatch: boolean;
  pieces: number;
  /** Null when SAP could not be reached: withheld, never reported as zero. */
  litres: number | null;
  tons: number | null;
  boxes: number;
  item_count: number;
  /** Only on the ELSEWHERE row: which routes it folded together. */
  codes?: string[];
}

/**
 * One stage of the BST register, folded onto the band's routes.
 *
 * Both tiles share this shape deliberately: the wall reads the same three rows
 * down both tiles, so allocated and shipped can be compared by eye without
 * either tile being a variance of the other.
 */
export interface ShiftingStage {
  transfers: number;
  boxes: number;
  total_pieces: number;
  total_tons: number | null;
  /** False when SAP is unreachable \u2014 the tile then leads with pieces. */
  tonnage_available: boolean;
  routes: ShiftingRoute[];
  /** SKUs SAP holds no litre volume for, so absent from every tonne here. */
  unweighed_items: number;
}

export interface PlantBoardShifting {
  /**
   * What the godown keeper DECLARED would leave today, off the Godown Stock
   * Movements page. `transfers` is the number of declarations.
   *
   * `retracted_*` is what he withdrew. Only this register can report it: it
   * deactivates rather than deletes, because a withdrawn declaration is the
   * difference between a keeper who planned nothing and one who changed his
   * mind. Its tonnage never needs SAP — the register snapshots the litres
   * per piece onto each line as it is typed.
   */
  allocated: ShiftingStage & {
    retracted_movements: number;
    retracted_pieces: number;
  };
  /**
   * Boxes on a BST dispatched today — stock that has gone. Rejected boxes
   * are counted in and disclosed: they did leave this floor.
   */
  shipped: ShiftingStage & {
    rejected_pieces: number;
    rejected_tons: number | null;
  };
  basis: string;
}

/** One department's typed figures, as the settings page holds them. */
export interface WorkforceDepartment {
  key: string;
  label: string;
  kind: 'employee' | 'labour';
  employees: number | null;
  salary_monthly: number | null;
}

/**
 * One band's people.
 *
 * Every figure is nullable and nothing is ever zero by default: a band with
 * nobody configured must read as a rule, or it looks identical to a band with
 * nobody at work. Purchase has no department at all \u2014 buying is desk work and
 * the people who receive the material are the PM warehouse, under Store \u2014 so
 * its strip is permanently a rule, and that is correct rather than missing.
 */
export interface WorkforceBand {
  employees: number | null;
  employee_salary_monthly: number | null;
  employee_cost_per_day: number | null;
  labour: number | null;
  labour_salary_monthly: number | null;
  labour_cost_per_day: number | null;
  departments: WorkforceDepartment[];
}

/** The floor-area factor, and the floor it is measured against. */
export interface SpaceSetting {
  sqft_per_pallet: number | null;
  floor_sqft: number;
  blocks: { label: string; sqft: number }[];
  updated_at: string | null;
}

/** One row of the settings page: the catalogue entry plus what was typed. */
export interface WorkforceSetting {
  key: string;
  label: string;
  band: string;
  kind: 'employee' | 'labour';
  /**
   * True for a department somebody added here, false for one the board ships
   * with. Only an added department can be renamed away or removed: the built-in
   * six carry the factory's own shape and live in server code, so that no
   * amount of editing on a settings page can move one to another band.
   */
  is_custom: boolean;
  employees: number | null;
  salary_monthly: number | null;
  updated_at: string | null;
}

export interface PlantBoardWorkforce {
  /** Calendar days this month \u2014 the divisor behind every per-day figure. */
  days_in_month: number;
  bands: Record<string, WorkforceBand>;
  total_people: number | null;
  total_salary_monthly: number | null;
  total_cost_per_day: number | null;
  /** Departments nobody has filled in, by name, so a total can say what it omits. */
  unconfigured: string[];
  basis: string;
}

export interface PlantBoardMeta {
  company_code: string;
  date: string;
  plan: PlantBoardPlan | null;
  refresh_seconds: number;
  generated_at: string;
  /** Bands that could not be read at all. */
  degraded: string[];
  /** Tiles with no data source yet, keyed by tile. */
  pending: PendingTiles;
  warnings: string[];
  tonnage_basis: string;
}

export interface PlantBoardResponse {
  purchase: PlantBoardPurchase | null;
  store: PlantBoardStore | null;
  production: PlantBoardProduction | null;
  shifting: PlantBoardShifting | null;
  /** Typed on the settings page, so it survives anything SAP does. */
  workforce: PlantBoardWorkforce | null;
  meta: PlantBoardMeta;
}
