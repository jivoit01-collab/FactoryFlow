/**
 * Formatting. Deliberately the same rules as the tiles, so a figure does not
 * change shape between the card and the panel it opens.
 */

export function whole(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('en-IN');
}

export function decimal(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Rupees, in EXACTLY the board's own shape.
 *
 * A lakh is one decimal here because it is one decimal on the tile. The panel
 * opens with the figure the card was showing, so a rounding rule that differs
 * by a digit makes the drill-down look like it disagrees with the thing that
 * opened it — which is the one failure this panel exists to avoid.
 */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

/** An ISO date as a short day. Parsed by hand — `new Date('…')` reads UTC. */
export function shortDate(iso: string | null | undefined): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!parts) return '—';
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][Number(parts[2]) - 1];
  return month ? `${Number(parts[3])} ${month}` : '—';
}

/**
 * The clock time off an ISO timestamp, in the reader's own zone.
 *
 * Unlike `shortDate` above this one DOES go through `new Date`, and must: a
 * dispatch stamp is a moment, not a calendar day, and the factory reading it
 * wants the hour it happened locally. The date is left off — every row in this
 * table is today's by construction.
 */
export function clockTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '—';
  return at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * A panel for a figure this feed carries no rows for.
 *
 * Not a blank table and not a silence: the stats are real and the empty line
 * names the screen that holds the detail. A reader who clicks and gets nothing
 * stops clicking; one who is told where to look goes there.
 */
export const NO_ROWS: { label: string; cell: (row: never) => React.ReactNode }[] = [];
