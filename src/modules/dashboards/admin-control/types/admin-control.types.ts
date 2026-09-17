/**
 * The admin board's payload, exactly as the API serves it.
 *
 * Snake_case throughout because these are the server's own keys and renaming
 * them here would put a translation layer between the board and its one
 * endpoint — the place a field quietly goes missing.
 *
 * NULL IS A VALUE HERE, NOT AN ABSENCE. Every nullable number below means "no
 * source for this", and the board is required to render it as a rule rather
 * than a zero. An unrated warehouse and an empty one must not look the same, so
 * none of these may be defaulted to 0 on the way in.
 */

export interface AdminTrendDay {
  date: string;
  /** Day of the month, two digits — the axis label. */
  label: string;
  tons: number;
}

export interface AdminProduction {
  mtd_tons: number;
  mtd_pieces: number;
  today_tons: number;
  /** Days that actually produced. The denominator of the average. */
  producing_days: number;
  avg_tons_per_producing_day: number | null;
  /** The month's plan total. Null where no plan is filed in SAP. */
  plan_tons: number | null;
  /** The plan pro-rated by elapsed days — the plan is filed as one bucket. */
  plan_to_date_tons: number | null;
  plan_pct: number | null;
  /** What the remaining days must average to close the plan. */
  required_tons_per_day: number | null;
  remaining_days: number;
  plan_name: string | null;
  warehouse: string;
  /** Plan lines produced in pieces with no litre volume, so absent from the tonnage. */
  unweighed_lines: number;
  /** How this figure was arrived at. Printed on the tile so two boards quoting
   *  different numbers for "production" can be told apart at a glance. */
  basis: string;
  trend: AdminTrendDay[];
}

export interface AdminDispatchCompany {
  company_code: string;
  tons: number;
  /** Trucks that left the gate. */
  trucks: number;
  bills: number;
}

/**
 * What physically left the gate this month.
 *
 * The gate-out register, the same table and basis the Logistics board reads —
 * NOT SAP invoices. So this figure includes bills raised in an earlier month
 * that shipped this one, and excludes this month's bills still sitting in the
 * warehouse. `invoiced_tons` carries that other question, and the gap between
 * the two is the useful number rather than a discrepancy.
 */
export interface AdminDispatch {
  mtd_tons: number;
  today_tons: number;
  /** Trucks out. A truck carrying four invoices is one truck and four bills. */
  trucks: number;
  bills: number;
  /** Days on which a truck actually left. Zero-dispatch days are excluded. */
  dispatch_days: number;
  avg_tons_per_dispatch_day: number | null;
  companies: AdminDispatchCompany[];
  /** Billed this month, intercompany excluded. Null if SAP could not be read. */
  invoiced_tons: number | null;
  basis: string;
}

export interface AdminFgRow {
  warehouse: string;
  label: string;
  company_code: string;
  tons: number;
  capacity_tons: number | null;
  used_pct: number | null;
  free_tons: number | null;
  last_audit_date: string | null;
  /** SKUs in this store with no case weight recorded — excluded from its tonnage. */
  unweighed_items: number;
}

/** Finished goods standing where nobody has rated the building. */
export interface AdminUnratedRow {
  warehouse: string;
  label: string;
  company_code: string;
  tons: number;
}

export interface AdminFgStorage {
  unit: 'tonnes';
  total_tons: number;
  /** Null when any store in the total is unrated — a partial denominator is not one. */
  capacity_tons: number | null;
  used_pct: number | null;
  free_tons: number | null;
  rows: AdminFgRow[];
  unrated: AdminUnratedRow[];
  /**
   * How much of the warehouse the tonnage does NOT speak for.
   *
   * A total in tonnes is only as complete as the item master behind it: these
   * count SKUs with no recorded case weight, and rows stocked by mass or volume
   * where a pack factor does not apply. A confident total over a half-weighed
   * warehouse is the failure mode here and it looks identical to a correct one,
   * so the tile has to be able to say so.
   */
  unweighed_items: number;
  non_piece_items: number;
  basis: string;
}

export interface AdminPmRow {
  warehouse: string;
  label: string;
  value: number;
  pieces: number;
  pallets: number;
}

/**
 * Packaging material: what it is worth, and how much floor it stands on.
 *
 * Space is in SQUARE FEET, not tonnes — packaging has no litre volume and no
 * case weight, so neither of this board's tonnage bases applies. The floor
 * figure is bridged pieces → pallets → square feet by the factory's own
 * stacking sheet, the same route the Plant board takes.
 *
 * `unmeasured_items` is load-bearing: an item with no pallet figure is counted
 * in the value and the pieces but left out of the floor, so every one of them
 * makes the stores read EMPTIER than they are. The tile must show it.
 */
export interface AdminPmStorage {
  unit: 'value';
  total_value: number;
  total_pieces: number;
  pallets: number;
  floor_sqft: number;
  /** Null where the pallet footprint has been cleared — then the % is a rule. */
  occupied_sqft: number | null;
  free_sqft: number | null;
  used_pct: number | null;
  sqft_per_pallet: number | null;
  blocks: { label: string; sqft: number }[];
  unmeasured_items: number;
  unmeasured_pieces: number;
  stacking_measured_on: string;
  capacity_tons: null;
  no_capacity_reason: string;
  basis: string;
  rows: AdminPmRow[];
}

export interface AdminOilTank {
  code: string;
  /** 'TANK' (a fixed tank) or 'TOTES' (an IBC container). Both hold loose oil. */
  type: string;
  item_code: string | null;
  /** The oil's name, or 'empty' on a vessel holding nothing. */
  item: string;
  category: string | null;
  capacity_tons: number;
  stock_tons: number;
  /** Null on a vessel with no rated capacity — never 0, which reads as empty. */
  used_pct: number | null;
}

export interface AdminOilStorage {
  unit: 'tonnes';
  warehouse: string;
  total_tons: number;
  total_litres: number;
  capacity_tons: number | null;
  used_pct: number | null;
  /**
   * Null once a capacity is known; otherwise why there is no percentage —
   * which is now either "EXIM is not configured" or the farm's own error,
   * rather than the old flat "no rated capacity in any system".
   */
  no_capacity_reason: string | null;
  /**
   * Which system `total_tons` and `capacity_tons` came from.
   *
   * 'EXIM' is the tank farm's own register, which is the only place a rated
   * capacity exists. 'SAP' is the fallback when EXIM cannot be read — then
   * there is no capacity and `no_capacity_reason` says why.
   */
  source: 'EXIM' | 'SAP';
  /**
   * SAP's own reading of the same oil, always present.
   *
   * When the source is EXIM this is the comparison that exposes a stock
   * discrepancy between the two systems; when it is SAP it equals `total_tons`.
   */
  sap_tons: number;
  /** Per-vessel detail, fullest first. Empty unless EXIM answered. */
  tank_rows: AdminOilTank[];
  /**
   * The fixed tanks and the IBC totes counted apart.
   *
   * Both are inside `total_tons` and `capacity_tons`. This is here because
   * "how full is the tank farm" may or may not be meant to include four
   * totes, and the answer should not have to be re-derived from the rows.
   */
  by_type: Record<string, { vessels: number; capacity_tons: number; stock_tons: number }>;
  /**
   * Oil the headline figures do NOT include — the IBC totes.
   *
   * `total_tons`, `capacity_tons` and `used_pct` cover the fixed tanks only,
   * because the tile answers "how full is the tank farm". The totes are still
   * in `tank_rows` and `by_type`; this is the total the headline leaves out,
   * so the screen can name it rather than lose it. Empty object when there is
   * nothing outside the headline.
   */
  excluded:
    | { vessels: number; capacity_tons: number; stock_tons: number; types: string[] }
    | Record<string, never>;
  basis: string;
  rows: { label: string; tons: number }[];
}

export interface AdminCostSlice {
  key: string;
  label: string;
  bucket: string;
  amount: number;
  /**
   * Whether anything is configured behind this line.
   *
   * Zero WITH a reason is a gap; zero without one is a real nil. The donut
   * draws them differently and only the first raises an alert.
   */
  has_source: boolean;
  warning: string | null;
  share_pct: number | null;
  /**
   * What the money is made of, in the line's own unit — "629 across 4 of 5
   * departments over 11 days", "8 Jivo Oil meters · 244,590 units".
   *
   * Rupees alone cannot be sanity-checked by anyone standing in front of the
   * board; a head count and a meter count can. Null on a line with no unit
   * worth printing.
   */
  detail: string | null;
  /** The same figure as a number, for anything that needs to compare it. */
  detail_value: number | null;
  /**
   * Why this line differs from the same line on another board.
   *
   * Set on labour, which this tile prices over five named departments —
   * production(oil), Warehouse Basement, Dock, Scrap, Boiling Floor 1 — while
   * the Factory Expense wall board prices every department AND the gate tally
   * that re-describes those same people; and on electricity, which this tile
   * prices over Jivo Oil's meters alone while the wall board prices every
   * meter on the campus.
   *
   * On labour the note also says what share of the gate the line covers. It is
   * a subset by design, and a figure that silently omitted half the people who
   * came in would be worse than no figure.
   */
  basis: string | null;
}

export interface AdminCost {
  currency: string;
  total: number;
  slices: AdminCostSlice[];
  warnings: string[];
  /**
   * Why the electricity slice reads high.
   *
   * Jivo Oil's meters only — Beverages' boiler, ETP, RO and terrace are not in
   * it — but it counts the mains as well as the sub-meters that re-measure that
   * same supply, and a meter shared with Beverages counts in full because the
   * register holds nothing to split it by. So the figure knowingly runs well
   * above the metered bill. Deliberate and recorded; the note is how the tile
   * stays honest about it.
   */
  electricity_note: string;
}

export type AdminAlertSeverity = 'critical' | 'warning' | 'info';

export interface AdminAlert {
  key: string;
  severity: AdminAlertSeverity;
  title: string;
  detail: string;
  action: string | null;
}

export interface AdminBoardMeta {
  company_code: string;
  date: string;
  period: {
    from: string;
    to: string;
    day_of_month: number;
    days_in_month: number;
    elapsed_pct: number;
  };
  refresh_seconds: number;
  generated_at: string;
  /** Tiles that could not be read at all. The page names them on their face. */
  degraded: string[];
  warnings: string[];
  tonnage_basis: string;
}

export interface AdminBoardResponse {
  output: {
    production: AdminProduction | null;
    dispatch: AdminDispatch | null;
  };
  storage: {
    fg: AdminFgStorage | null;
    pm: AdminPmStorage | null;
    oil: AdminOilStorage | null;
  };
  cost: AdminCost | null;
  alerts: AdminAlert[];
  meta: AdminBoardMeta;
}
