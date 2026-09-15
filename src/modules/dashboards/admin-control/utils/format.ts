/**
 * Every figure on the board passes through here.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a figure with no source renders as a
 * rule, never as a zero. The API is careful to send `null` where nothing is
 * configured — an unrated warehouse, a cost line with no rate, an average with
 * no producing days — and the one way to throw that away is a `?? 0` at the
 * point of display. So the coercion lives here, once, and it goes the other
 * way: anything that is not a finite number becomes the rule.
 *
 * `NaN tonnes` on a screen nobody is standing at is worse than a blank tile. It
 * looks like a number and it survives until somebody notices.
 */

/** What a figure with no source looks like. */
export const NO_VALUE = '—';

/** A usable number, or null. Everything below starts here. */
export function num(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Whole number, Indian grouping. */
export function whole(value: number | null | undefined): string {
  const n = num(value);
  return n === null ? NO_VALUE : Math.round(n).toLocaleString('en-IN');
}

/**
 * A tonnage, to one decimal.
 *
 * One decimal rather than none: the tiles run from tens to thousands of tonnes,
 * and at the low end a whole number loses a tenth of a day's output. Above ten
 * thousand it rounds, because a wall has no room for the precision and nobody
 * reads the last digit of a five-figure tonnage anyway.
 */
export function tons(value: number | null | undefined): string {
  const n = num(value);
  if (n === null) return NO_VALUE;
  if (Math.abs(n) >= 10_000) return Math.round(n).toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Rupees at the scale a factory reads them.
 *
 * Crores above a crore, lakhs above a lakh, plain rupees below. The break
 * points are where Indian readers already switch units themselves, so the
 * figure never needs a mental conversion to compare with a spoken one.
 */
export function money(value: number | null | undefined): string {
  const n = num(value);
  if (n === null) return NO_VALUE;
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Rupees split into the figure and its unit, for a tile's big number. */
export function moneyParts(value: number | null | undefined): {
  value: string;
  unit: string;
} {
  const n = num(value);
  if (n === null) return { value: NO_VALUE, unit: '' };
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return { value: `₹${(n / 10_000_000).toFixed(2)}`, unit: 'Cr' };
  if (abs >= 100_000) return { value: `₹${(n / 100_000).toFixed(2)}`, unit: 'L' };
  return { value: `₹${Math.round(n).toLocaleString('en-IN')}`, unit: '' };
}

/** A percentage, to one decimal. */
export function pct(value: number | null | undefined): string {
  const n = num(value);
  return n === null ? NO_VALUE : `${n.toFixed(1)}%`;
}

/** A percentage with no decimal — for prose, where precision reads as noise. */
export function pctRough(value: number | null | undefined): string {
  const n = num(value);
  return n === null ? NO_VALUE : `${Math.round(n)}%`;
}

/**
 * A bar width, clamped to the track.
 *
 * Always a number, unlike everything else here: a bar has to be drawn at some
 * width, and a caller reaching this has already decided there is a figure to
 * draw. Over-capacity clamps to full rather than overflowing the track — the
 * tile's own percentage is what reports the overrun.
 */
export function barPct(value: number | null | undefined): number {
  const n = num(value);
  if (n === null) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * How full is too full.
 *
 * Mirrors `admin_board/alerts.py` — 90 critical, 80 warning — so a tile that
 * wears the bad tint is a tile the action centre is also shouting about. Two
 * different thresholds on one screen is how a board starts contradicting
 * itself.
 *
 * Returns the condition, not a colour: the fill class is chosen from this by
 * the caller, and rule 3 of the operations colour system reserves green, amber
 * and red for condition alone.
 */
export type Condition = 'ok' | 'warn' | 'bad';

export function fillCondition(usedPct: number | null | undefined): Condition {
  const n = num(usedPct);
  if (n === null) return 'ok';
  if (n >= 90) return 'bad';
  if (n >= 80) return 'warn';
  return 'ok';
}

/** Days between an ISO date and today, or null if it will not parse. */
export function daysSince(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const ms = today.getTime() - then.getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Bar heights for the trend strip, as a share of the tallest day.
 *
 * Scaled to the window's own maximum rather than to a target, because that is
 * the only question seven bars can honestly answer at this size: is today
 * normal for this week. A day of nothing returns 0 and must stay 0 — a floor
 * applied here would draw a shut line as a small amount produced, which is the
 * opposite of what happened.
 */
export function trendHeights(values: number[]): number[] {
  const peak = Math.max(...values, 0);
  if (peak <= 0) return values.map(() => 0);
  return values.map((value) => (value > 0 ? (value / peak) * 100 : 0));
}
