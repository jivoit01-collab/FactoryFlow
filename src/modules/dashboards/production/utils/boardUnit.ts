/**
 * What the board counts in.
 *
 * Cases are what the floor books and what every register holds, so they stay
 * the default. Litres are what the business sells and what SAP reconciles
 * against, and they are the only way to compare a 5 L line with a 1 L one: on
 * 2026-09-17 Clear Pack booked 1,509 cases against 6 Head's 1,426, and in
 * litres that is 30,180 against 28,520 — a different ranking on the same day.
 *
 * The switch is board-wide by design. Two figures on one screen counted in
 * different units is how somebody reads a 5 L line's output as a 1 L line's,
 * so everything moves together or nothing does.
 */

import { count } from '../../dispatch/utils/format';

export type BoardUnit = 'cases' | 'litres';

export interface Quantity {
  /** The number, already grouped — or an em dash where it cannot be stated. */
  text: string;
  /** What it is counted in, for the small print beside it. Null with a dash. */
  noun: string | null;
}

/**
 * One figure, in whichever unit the board is on.
 *
 * A litre figure the item master cannot supply comes back as a dash rather
 * than as zero. That distinction is the whole point: a weight-packed pouch has
 * no volume, and reporting its output as "0 ltr" would read as a line that
 * made nothing.
 */
export function quantityOf(
  unit: BoardUnit,
  cases: number | null,
  litres: number | null,
  /** What one case is called here — "case" for oil, per the company variant. */
  unitNoun: string,
): Quantity {
  if (unit === 'litres') {
    return litres == null ? { text: '—', noun: null } : { text: count(litres), noun: 'ltr' };
  }
  return cases == null ? { text: '—', noun: null } : { text: count(cases), noun: `${unitNoun}s` };
}

/** "cases" / "ltr" — the word on its own, for labels and per-unit rates. */
export function nounOf(unit: BoardUnit, unitNoun: string): string {
  return unit === 'litres' ? 'ltr' : `${unitNoun}s`;
}

/** Singular, for "₹12/case" and "₹0.60/ltr". */
export function perNounOf(unit: BoardUnit, unitNoun: string): string {
  return unit === 'litres' ? 'ltr' : unitNoun;
}

/**
 * A rate per unit — cost per case, or cost per litre.
 *
 * Rounded to whole rupees on cases and to paise on litres, because a litre rate
 * is an order of magnitude smaller and "₹4" hides the difference between four
 * rupees a litre and four and a half.
 */
export function rateOf(
  unit: BoardUnit,
  amount: number,
  cases: number,
  litres: number | null,
): string | null {
  if (unit === 'litres') {
    if (!litres) return null;
    const rate = amount / litres;
    return `₹${rate.toLocaleString('en-IN', {
      minimumFractionDigits: rate < 100 ? 2 : 0,
      maximumFractionDigits: rate < 100 ? 2 : 0,
    })}`;
  }
  if (!cases) return null;
  return `₹${count(amount / cases)}`;
}
