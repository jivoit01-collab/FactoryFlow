/**
 * The Operations Report: production, wastage, labour, salary and electricity for
 * a day or a month, and what each litre cost to make.
 *
 * `ReportDay` is what `GET /dashboards/operations-report/days/` sends per day
 * (`operations_report/services.py`). Everything else here is worked out from
 * those days by `utils/summarise.ts`, so the totals' definitions live in one
 * place.
 */

import type { MonthKey } from '../../utils/month';

export type ReportView = 'day' | 'month';

/**
 * What output is counted in, and so what a cost is "per". Oil reads in litres;
 * Beverages in boxes — the cases off its runs, which is how that plant sells.
 */
export type ReportUnit = 'litre' | 'box';

/** One line's output for a day. */
export interface LineOutput {
  /** The line's own name: "10 Head", "Pouch Machine". */
  line: string;
  runs: number;
  cases: number;
  /**
   * Litres filled; null when any of the line's runs that day has no pack size,
   * because a line-day short of one run's litres would read as a cheap litre.
   */
  litres: number | null;
}

/** One kind of packing material lost on the floor, in one unit. */
export interface WastageEntry {
  /** "Caps", "Labels" — the word the material's name starts with. */
  item: string;
  /** "pcs", "m", "kg" */
  unit: string;
  quantity: number;
  /** Rupees, at the price the run was costed at. Rows with no price are left out. */
  value: number;
  /** Rows with no SAP price, counted in `quantity` but not in `value`. */
  unpriced: number;
}

/** One contractor's people through the gate. */
export interface LabourEntry {
  group: string;
  /** People in, both shifts. Over a span this is the average per day. */
  heads: number;
  day_shift: number;
  night_shift: number;
  /** Rupees at the Cost Master labour rate; null where no rate was in force. */
  cost: number | null;
}

/**
 * One department's staff salary for a day: its month's bill over the month's
 * days, the Cost Master `factory-salary` rate the Factory Expense board uses.
 */
export interface SalaryEntry {
  /** "Packing", or "All departments" where one figure covers the payroll. */
  department: string;
  /** Rupees a month, the rate in force that day. */
  monthly: number;
  /** Rupees for the day — over a span, added up. */
  cost: number;
}

/** One meter's share of the company's units. */
export interface PowerEntry {
  /** The meter's name in Daily Electricity++. */
  area: string;
  kwh: number;
  /** Rupees. */
  cost: number;
}

/** A return's state as the returns desk keyed it, worst first. */
export type ReturnCondition = 'LEAKED' | 'DAMAGED' | 'EXPIRED' | 'OTHER' | 'GOOD';

/** Goods Return (GR): customer returns that came back in one condition. */
export interface ReturnEntry {
  condition: ReturnCondition;
  /** "Leaked" — as the returns desk names it. */
  label: string;
  /** The GR numbers with a line in this condition, so returns are counted once. */
  entries: string[];
  lines: number;
  /** Pieces. */
  quantity: number;
  /** Rupees at the invoice price, over the lines that carry one. */
  value: number;
  /** Lines with no invoice price (debit note, letter pad): counted, not valued. */
  unpriced: number;
}

/**
 * One day of the report. A section is null when it was not read for this
 * reader (withheld or degraded — see the response's `meta`), and `power` is also
 * null on a day nobody entered the meter register. An empty list means read,
 * and nothing booked.
 */
export interface ReportDay {
  /** YYYY-MM-DD */
  date: string;
  lines: LineOutput[] | null;
  wastage: WastageEntry[] | null;
  labour: LabourEntry[] | null;
  /**
   * Staff salary. Null on a day with no salary rate in force, as well as when
   * the section was not read. Optional because a server that predates it does
   * not send it — read as not read, never as nobody paid.
   */
  salary?: SalaryEntry[] | null;
  power: PowerEntry[] | null;
  /**
   * Customer returns that arrived that day. Optional because a server that
   * predates it does not send it — read as not read, never as nothing returned.
   */
  returns?: ReturnEntry[] | null;
}

export type ReportSection = 'production' | 'wastage' | 'labour' | 'salary' | 'power' | 'returns';

export interface ReportMeta {
  /** Sections the server tried to read and could not. */
  degraded: ReportSection[];
  /** Sections this reader may not see. */
  withheld: ReportSection[];
  /** Caveats on sections that did render. */
  warnings: string[];
}

/** The endpoint's whole answer. */
export interface ReportDaysResponse {
  company: { code: string; name: string };
  from: string;
  to: string;
  days: ReportDay[];
  meta: ReportMeta;
}

/**
 * What a litre (or a box) cost, by head. Null where it cannot be said: nothing
 * was filled, or the head itself could not be read or priced. Never zero for
 * "unknown".
 */
export interface PerLitreCost {
  labour: number | null;
  salary: number | null;
  power: number | null;
  wastage: number | null;
  total: number | null;
}

/**
 * The headline figures for any span: one day, a month, or a comparison. A
 * section's figures are null when that section was not read.
 */
export interface ReportTotals {
  /** Days the span covers. */
  days: number;
  litres: number | null;
  cases: number | null;
  runs: number | null;
  /** Packing waste, in rupees, over the rows that carry a price. */
  wastageValue: number | null;
  /** Waste rows with no price. */
  wastageUnpriced: number;
  /** Average people in per day. */
  heads: number | null;
  /** People in, added up over the days: one person one shift is one. */
  manDays: number | null;
  /** Null when any day's labour had no rate — a total missing a part is not a total. */
  labourCost: number | null;
  /** Staff salary accrued over the span; null when any day had no rate in force. */
  salaryCost: number | null;
  /** The monthly bill in force on the span's last salaried day. */
  salaryMonthly: number | null;
  kwh: number | null;
  powerCost: number | null;
  /** Days in the span nobody entered the meter register. */
  powerUnreadDays: number;
  /** Days in the span with a run of unknown pack size, so unknown litres. */
  litresUnknownDays: number;
  /** Days in the span whose labour had no rate in force. */
  labourUncostedDays: number;
  /** Days in the span with no salary rate in force. */
  salaryUncostedDays: number;
  /** Goods Return (GR): distinct returns, pieces, and rupees over priced lines. */
  grReturns: number | null;
  grQuantity: number | null;
  grValue: number | null;
  /** Pieces that came back other than good — leaked, damaged, expired, other. */
  grSpoiledQuantity: number | null;
  /** GR lines with no invoice price. */
  grUnpriced: number;
  /** Units per kilolitre filled. */
  kwhPerKl: number | null;
  perLitre: PerLitreCost;
  /** Units per box (case) packed — Beverages' measure. */
  kwhPerBox: number | null;
  /** The same heads over boxes packed rather than litres filled. */
  perBox: PerLitreCost;
}

export interface ReportDaySummary extends ReportTotals {
  date: string;
}

/** A day or a month, read and worked out. */
export interface OperationsReport {
  view: ReportView;
  /** YYYY-MM-DD, inclusive. */
  from: string;
  to: string;
  company: { code: string; name: string };
  /** Litres for Oil, boxes for Beverages — from the company the days were read for. */
  unit: ReportUnit;
  totals: ReportTotals;
  /** The span compared against — the day before, or the same days last month. */
  previous: ReportTotals;
  /** "1 Oct", "1–2 Sep", "Sep". */
  previousLabel: string;
  breakdown: {
    lines: LineOutput[] | null;
    wastage: WastageEntry[] | null;
    labour: LabourEntry[] | null;
    salary: SalaryEntry[] | null;
    power: PowerEntry[] | null;
    returns: ReturnEntry[] | null;
  };
  /**
   * One summary per day, oldest first. The month's own days on the month view;
   * on the day view the fortnight ending on the day.
   */
  daily: ReportDaySummary[];
  /** The days of `daily` added up — the month on the month view, the fortnight on the day view. */
  dailyTotals: ReportTotals;
  meta: ReportMeta;
}

/** The period the page is showing, as the URL carries it. */
export interface ReportPeriod {
  view: ReportView;
  /** The day shown on the day view. */
  date: string;
  /** The month shown on the month view. */
  month: MonthKey;
  /** The last complete day: yesterday. Nothing after it has figures. */
  latest: string;
  /** The span the report covers. */
  from: string;
  to: string;
  /** "Thursday, 2 October 2026" or "October 2026". */
  label: string;
  /** Under the label: "1–2 Oct so far" on a month still running. */
  sublabel: string | null;
  canGoForward: boolean;
  isLatest: boolean;
}
