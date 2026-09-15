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

export interface AdminOilStorage {
  unit: 'tonnes';
  warehouse: string;
  total_tons: number;
  total_litres: number;
  capacity_tons: number | null;
  used_pct: number | null;
  no_capacity_reason: string;
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
   * What the money is made of, in the line's own unit — "1,045 gated in over
   * 13 days", "all 13 meters · 283,837 units".
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
   * Set on labour, which this tile prices over the gate rows alone while the
   * Factory Expense wall board also prices the departmental allocation rows
   * that re-describe those same people.
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
   * It counts every meter including the mains, and the sub-meters measure that
   * same supply again — so the figure knowingly runs about 3x the metered bill.
   * Deliberate and recorded; the note is how the tile stays honest about it.
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
