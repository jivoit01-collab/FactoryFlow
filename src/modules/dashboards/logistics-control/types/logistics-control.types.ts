/** Shapes the Logistics Control wall board reads and derives. */

import type { LOGISTICS_CONTROL_FUNNEL_STAGES } from '../constants';

// ============================================================================
// Tonnage
// ============================================================================

/**
 * A tonnage total and how much of the warehouse it could not see.
 *
 * The disclosure fields are not decoration. A tonnage roll-up over SAP stock is
 * only as complete as the item master behind it, and the failure mode — a
 * confident total over a half-weighed warehouse — looks identical to a correct
 * one. So the total never travels without them.
 */
export interface TonnageRollUp {
  /** Tonnes the weighed, piece-counted rows account for. */
  tonnes: number;
  /** Rows included in `tonnes`. */
  weighedItems: number;
  /** Rows SAP records no case weight for. */
  unweighedItems: number;
  /** Rows stocked in a mass or volume unit, where a pack factor cannot apply. */
  nonPieceItems: number;
  /** Share of rows the tonnage covers, 0-1. `null` when there are no rows. */
  coverage: number | null;
}

// ============================================================================
// Freight bill funnel
// ============================================================================

export type FunnelStage = (typeof LOGISTICS_CONTROL_FUNNEL_STAGES)[number];

/** One bilty waiting at one stage, with the age of its wait at that stage. */
export interface FunnelBill {
  /** Stable key — the bilty number where present, else the plan id. */
  id: string;
  /** Days this bill has waited at its current stage. Null where undatable. */
  ageDays: number | null;
  /**
   * Rupees riding on this document at this stage.
   *
   * Null where the stage knows the document but not its value — a bilty queued
   * for GRPO before anybody typed a freight figure is real and outstanding, and
   * dropping it would understate the count as well as the money. A cell reports
   * how many of its documents it could not price.
   */
  amount?: number | null;
}

/**
 * One cell of the funnel — a stage crossed with an age band.
 *
 * Bands are cumulative floors, so `count` at band 30 includes everything at
 * band 45. A wall answers "how much is older than a month", and an exclusive
 * bucket makes a number fall when a bill ages, which reads as improvement.
 */
export interface FunnelCell {
  band: number;
  count: number;
  /** Rupees in this cell, over the documents that carry a value. */
  amount: number;
  /** Documents in this cell with no value behind them — priced at nothing. */
  unpriced: number;
}

export interface FunnelColumn {
  stage: FunnelStage;
  /** Every bill at this stage, whatever its age. */
  total: number;
  /** Rupees at this stage, over every bill including the undated ones. */
  amount: number;
  /** Bills at this stage carrying no value. */
  unpriced: number;
  /** Bills whose age could not be determined, excluded from every band. */
  undated: number;
  cells: FunnelCell[];
  /**
   * Why this column has no data, where that is the case — rendered instead of a
   * zero. The payment stage has no source in either repo until its config
   * exists, and a wall must say so rather than imply nothing is outstanding.
   */
  unavailable?: string;
  /**
   * Draw counts only, with no money under them.
   *
   * For a stage whose documents are not money yet. The GRPO queue is the case:
   * its freight is typed on the post form afterwards, so the figure is missing
   * on most of the queue rather than merely small — the question that column
   * answers is "how many receipts are waiting", and a money row underneath is
   * noise at best and misleading at worst.
   */
  countsOnly?: boolean;
}

// ============================================================================
// Stock in transit
// ============================================================================

export interface TransitBands {
  /** Up to and including the fresh edge. */
  fresh: number;
  /** Between the fresh edge and the ageing edge, both inclusive. */
  ageing: number;
  /** Strictly beyond the ageing edge. */
  stale: number;
  /** Consignments with no start timestamp, so no clock. */
  undated: number;
}

// ============================================================================
// Workforce
// ============================================================================

/**
 * One Employees/Labour strip.
 *
 * Both money figures are per day. Employee salary is stored annual and divided
 * down, so `employeeCostPerDay` is a rate of burn that ties to no payslip.
 */
export interface WorkforceStrip {
  /**
   * Null where the headcount is genuinely unknown, which is not the same as
   * nobody being here. The employee feed is one company per request, so a
   * combined Oil + Mart figure needs a fan-out this board does not do yet, and
   * a per-section figure needs the assignment list.
   */
  employees: number | null;
  employeeCostPerDay: number | null;
  /**
   * Null where the headcount is genuinely unknown. Symmetric with `employees`
   * above: a board whose labour feed is not wired yet must render a rule, not a
   * zero, or a section with nobody assigned reads identically to a section
   * nobody counted.
   */
  labour: number | null;
  labourCostPerDay: number | null;
  /**
   * Set where a figure is missing for a reason worth showing: salary withheld
   * by permission, no labour rate configured, or a section with nobody
   * assigned. A wall that reads ₹0 for a week is worse than no wall.
   */
  note?: string;
}

// ============================================================================
// Dispatch
// ============================================================================

/** Combined Oil + Mart dispatch over a window. */
export interface DispatchTotals
{
  /** Kilograms, summed across both companies after intercompany exclusion. */
  kg: number;
  /** Distinct vehicles, de-duplicated across companies rather than summed. */
  vehicles: number;
  /** Distinct invoices, de-duplicated across companies rather than summed. */
  invoices: number;
  /** Days in the window that carried at least one dispatch. */
  activeDays: number;
}

// ============================================================================
// Warehouse settings
// ============================================================================

/**
 * The two facts about a warehouse SAP does not hold.
 *
 * Both nullable, and the null means "nobody has set this" rather than zero — a
 * capacity of zero would make the warehouse read as infinitely full, and a
 * missing audit date is not the same as never having audited.
 */
export interface WarehouseSettings {
  warehouse: string;
  /** Rated capacity in tonnes. */
  capacity_tonnes: number | null;
  /** `YYYY-MM-DD`, or null where stock has never been verified. */
  last_audit_date: string | null;
  updated_at: string;
  updated_by_name: string;
}

/** Either field, or both. `null` clears one back to unset. */
export interface WarehouseSettingsPayload {
  capacity_tonnes?: number | null;
  last_audit_date?: string | null;
}

/**
 * Company-level board figures an operator types in.
 *
 * Salary is entered monthly and served per day as well — the board shows a
 * daily cost, and doing the division server-side keeps it consistent with the
 * factory-expense board, which spreads a monthly rate the same way.
 */
export interface BoardSettings {
  owned_vehicles: number | null;
  /** Registrations of the owned fleet, one per line. */
  owned_vehicle_numbers: string;
  /** Registrations off the road — damaged, in the workshop, sold. */
  vehicles_out_of_service: string;
  /**
   * What one labourer costs for a day. Priced against the gate's own head
   * count. Null falls back to the Cost Master rate — which is unseeded, so the
   * board reports the cost as absent rather than as zero.
   */
  labour_rate_per_day: number | null;
  warehouse_employees: number | null;
  warehouse_salary_monthly: number | null;
  warehouse_salary_daily: number | null;
  dispatch_employees: number | null;
  dispatch_salary_monthly: number | null;
  dispatch_salary_daily: number | null;
  transport_employees: number | null;
  transport_salary_monthly: number | null;
  transport_salary_daily: number | null;
  updated_at: string;
  updated_by_name: string;
}

/** Any subset. `null` clears a figure back to unset. */
export type BoardSettingsPayload = Partial<
  Omit<
    BoardSettings,
    | 'warehouse_salary_daily'
    | 'dispatch_salary_daily'
    | 'transport_salary_daily'
    | 'updated_at'
    | 'updated_by_name'
  >
>;

/** What one owned truck is doing today. */
export type OwnedVehicleState =
  | 'OUT_OF_SERVICE'
  | 'ON_BST'
  | 'ON_DISPATCH'
  | 'AT_PLANT'
  | 'OUT'
  | 'FREE';

export interface OwnedVehicle {
  vehicle_no: string;
  state: OwnedVehicleState;
}

/**
 * The owned fleet and today's duty state.
 *
 * `configured` is false when no registrations have been entered — which the
 * board has to report as "not set up" rather than as a fleet of nothing.
 */
export interface OwnedVehicleStatus {
  configured: boolean;
  vehicles: OwnedVehicle[];
  summary: {
    owned: number;
    on_bst: number;
    on_dispatch: number;
    at_plant: number;
    out: number;
    free: number;
    out_of_service: number;
  };
}

/** One age band of stock still on the road. */
export interface TransitBand {
  label: string;
  /** Unreceived dispatches in the band — one invoice, one load. */
  loads: number;
  tonnes: number;
}

/**
 * Stock dispatched to a sister company and not yet received in SAP.
 *
 * A load counts as on the road until the receiving company answers the sending
 * company's invoice with a goods receipt. That is SAP's own evidence rather
 * than a status somebody sets by hand — the branch-transfer register this
 * replaced held 16 transfers as in transit on 12 September 2026 when SAP had
 * already received 14 of them.
 *
 * `unweighed_lines` is the disclosure: any line the item master cannot weigh
 * is counted here rather than quietly contributing nothing, so a tonnage over a
 * partly-weighed set reads as the floor it is.
 */
export interface StockInTransit {
  bands: { fresh: TransitBand; ageing: TransitBand; stale: TransitBand };
  totals: { loads: number; tonnes: number };
  unweighed_lines: number;
  /**
   * False when SAP could not be reached.
   *
   * Every figure on this tile comes from SAP, so an outage leaves nothing to
   * show — and the tile must say that rather than render an empty road.
   */
  weights_available: boolean;
}

// ============================================================================
// Transporter account — what SAP says is owed to the hauliers
// ============================================================================

/** One exclusive age bucket of open freight invoices. */
export interface TransporterAgeBucket {
  /** Floor of the bucket in days since the invoice date: 0, 15, 30 or 45. */
  band: number;
  documents: number;
  outstanding: number;
  billed: number;
  /** Already settled against invoices that are still open — part payments. */
  paid: number;
  oldest_days: number | null;
}

export interface TransporterVendorDue {
  card_code: string;
  card_name: string;
  documents: number;
  outstanding: number;
  oldest_days: number | null;
}

export interface TransporterPayments {
  window_days: number;
  payments: number;
  paid: number;
  latest_date: string | null;
}

/** One exclusive age bucket of service GRPOs nobody has invoiced yet. */
export interface TransporterAwaitingBucket {
  band: number;
  documents: number;
  /** Un-invoiced line value, PRE-TAX — `PDN1.OpenSum`, not a document total. */
  amount: number;
  oldest_days: number | null;
}

/** One company's freight account, as `/dispatch/transporter-account/` answers. */
export interface TransporterAccount {
  company_code: string;
  /** Freight received into SAP with no A/P invoice raised against it. */
  awaiting_invoice: {
    documents: number;
    amount: number;
    oldest_days: number | null;
    buckets: TransporterAwaitingBucket[];
  };
  outstanding: {
    documents: number;
    outstanding: number;
    billed: number;
    paid_against_open: number;
    oldest_days: number | null;
    buckets: TransporterAgeBucket[];
  };
  vendors: TransporterVendorDue[];
  payments: TransporterPayments;
}

// ============================================================================
// Service GRPO queue — receipts this plant has not posted to SAP yet
// ============================================================================

/** One exclusive age bucket of the pending service-GRPO queue. */
export interface PendingGrpoBucket {
  band: number;
  documents: number;
  /** Freight typed on the plans in this bucket. Zero where none is typed. */
  amount: number;
  /**
   * Plans in this bucket with no freight figure yet.
   *
   * Freight is typed on the post form afterwards, so whole bands of fresh
   * bilties routinely carry none. Without this the bucket's `amount` of zero is
   * indistinguishable from freight that genuinely costs nothing, and the board
   * renders "₹0" against a hundred-odd unpriced receipts.
   */
  unpriced: number;
}

/** One company's pending service-GRPO queue, counted rather than listed. */
export interface PendingGrpoSummary {
  company_code: string;
  /** Pending GRPOs — grouped by bilty, so a multi-invoice consignment is one. */
  documents: number;
  amount: number;
  /** Queued GRPOs with no freight figure typed yet. */
  unpriced: number;
  /** Queued GRPOs with no dispatch date, so no age — counted, never banded. */
  undated: number;
  booked: number;
  dispatched: number;
  /** Nothing missing — the post form would accept these today. */
  ready: number;
  oldest_days: number | null;
  buckets: PendingGrpoBucket[];
}

// ============================================================================
// Freight rate — what a litre cost to move, with the money from SAP
// ============================================================================

export interface FreightRateTransporter {
  card_code: string;
  transporter_name: string;
  documents: number;
  /** Freight spend, pre-tax. There is no per-haulier litre figure in SAP. */
  amount: number;
}

/** One company's outbound freight, as `/dispatch/freight-rate/` answers. */
export interface FreightRate {
  company_code: string;
  date_from: string;
  date_to: string;
  /** Pre-tax outbound freight posted in the window, straight from SAP. */
  amount: number;
  /** Service GRPOs behind it. */
  documents: number;
  /** Hauliers billing in the window. */
  vendors: number;
  by_transporter: FreightRateTransporter[];
}
