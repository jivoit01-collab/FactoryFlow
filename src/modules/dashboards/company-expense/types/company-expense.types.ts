/**
 * Company Expense board — the shapes `/factory-expense/matrix/` returns.
 *
 * Money arrives as strings because DRF serialises `DecimalField` that way.
 * Every consumer runs it through `Number()` at the edge rather than trusting
 * arithmetic on a string.
 */

/** The four cost lines, in the order the board reads them left to right. */
export type ExpenseColumnKey = 'SALARY' | 'ELECTRICITY' | 'MAINTENANCE' | 'LABOUR';

export interface ExpenseColumn {
  key: ExpenseColumnKey;
  label: string;
}

/**
 * One square of the grid.
 *
 * `warning` and `note` are not two words for the same thing. A warning means
 * the figure **cannot be read** — the square draws a rule where the number
 * would go and says why, because an empty register and an unreadable one must
 * not look the same. A note is context on a figure that is real: which meters
 * fed it, how many days of a monthly rate it covers.
 */
export interface ExpenseCell {
  amount: string;
  /** The physical quantity behind the money — units, man-days. */
  unit: string | number | null;
  unit_label: string | null;
  warning: string | null;
  note: string | null;
}

/**
 * `COMPANY` is a legal entity's own spend. `SHARED` is what belongs to the
 * campus rather than to any one of them — meters feeding more than one company,
 * and Cost Master rates set for no particular company. `TOTAL` is the sum of
 * every row above, added by the server from those same rows.
 */
export type ExpenseRowKind = 'COMPANY' | 'SHARED' | 'TOTAL';

export interface ExpenseRow {
  /** A company code, or `__shared__` / `__total__` for the two summary rows. */
  key: string;
  label: string;
  kind: ExpenseRowKind;
  cells: Record<ExpenseColumnKey, ExpenseCell>;
  total: string;
}

/**
 * The sum of the sub-meters, checked against the meter the bill comes from.
 *
 * The electricity column reads sub-meters only: the site's mains (`KWH`, and
 * `KVAH` which is the same supply as apparent energy) measure the whole supply
 * that every other meter is a part of, so counting both reported roughly three
 * times the electricity the factory used. This is what lets a reader confirm
 * the breakdown is complete without trusting that claim — if the parts stop
 * adding up to the incomer, a sub-meter is unread or one is being counted twice.
 *
 * Null when the incomer was not read in the span: "no drift" and "no reading"
 * must not look the same.
 */
export interface ElectricityReconciliation {
  /** The incomer being measured against — normally `KWH`. */
  meter: string | null;
  cost: string;
  units: string;
  /**
   * The sub-meters alone, which is what `drift_pct` compares.
   *
   * Not the column total: the mains now sit in the shared row, so comparing the
   * column to the incomer would compare a number to a part of itself.
   */
  sub_meter_cost: string;
  /** Sub-meters against the incomer. Negative means unread supply. */
  drift_pct: number;
  /** The mains, named so the overlap they create is auditable. */
  excluded_meters: string[];
}

export interface ExpenseMatrix {
  date_from: string;
  date_to: string;
  /** Days in the span, inclusive. 1 when both ends are the same. */
  days: number;
  is_single_day: boolean;
  columns: ExpenseColumn[];
  /** Company rows followed by the single shared row. Never includes the total. */
  rows: ExpenseRow[];
  total: ExpenseRow;
  company_codes: string[];
  electricity_reconciliation: ElectricityReconciliation | null;
  settings: {
    labour_cost_type_code: string;
    salary_cost_type_code: string;
    refresh_seconds: number;
  };
  /** Board-wide problems: a missing rate, an untagged meter, unpriced labour. */
  warnings: string[];
}

/** Which span the board is showing. */
export type ExpenseSpanKey = 'today' | 'week' | 'month';
