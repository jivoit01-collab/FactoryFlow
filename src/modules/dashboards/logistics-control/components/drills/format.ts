/**
 * How a drill-down writes a figure.
 *
 * Deliberately the same rules the tiles use: a figure that changes shape
 * between the card and the panel it opens reads as a different figure, and the
 * whole point of the panel is that it is the card's own number taken apart.
 */

/** Whole number, Indian grouping. */
export function whole(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

export function decimal(value: number, digits = 1): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

export function companyLabel(code: string): string {
  return code.replace(/^JIVO[_\s-]*/i, '').replace(/_/g, ' ') || code;
}

/** `2026-09-12` → `Sat`. A slow day is usually a Sunday, and that should show. */
export function weekday(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
}

/** `2026-09-12` → `12 Sep`. Dates on a drill-down are read, not sorted. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "1 bill" / "6 bills" — a count and its noun, agreeing. */
export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${whole(value)} ${value === 1 ? singular : plural}`;
}

/**
 * Rows bucketed by a key, in first-appearance order.
 *
 * Order matters: every feed behind these panels arrives sorted by something
 * the reader cares about — heaviest, newest, worst — and re-sorting the groups
 * alphabetically would throw that away. A group takes the position of its
 * first row, so the feed's own sort still decides what is near the top.
 */
export function collect<Row>(
  rows: readonly Row[],
  keyOf: (row: Row) => string,
): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const found = groups.get(key);
    if (found) found.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

/**
 * The one warehouse a set of rows shares, or how many they span.
 *
 * A group row has to say "where" in one cell. Naming the first of several
 * would be wrong, and joining them all would be unreadable, so a group that
 * spans more than one place says exactly that and the rows underneath say
 * which.
 */
export function sharedLabel(values: readonly string[], plural: string): string {
  const distinct = [...new Set(values.filter(Boolean))];
  if (distinct.length === 0) return '—';
  if (distinct.length === 1) return distinct[0];
  if (distinct.length === 2) return distinct.join(' + ');
  return `${whole(distinct.length)} ${plural}`;
}
