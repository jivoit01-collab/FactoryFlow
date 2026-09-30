/** Date and time labels for the Production QC screens. */

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "29 Sep 2026, 14:05" — or "-" when there is none. */
export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value);
  if (!date) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * When a stopped line stopped: "14:05" today, "28 Sep, 22:15" on an earlier day
 * (a line stopped overnight is still offered for a check for 24h).
 */
export function formatStoppedAt(value: string | null | undefined, now = new Date()): string {
  const date = parse(value);
  if (!date) return '';
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (isSameDay(date, now)) return time;
  const day = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${day}, ${time}`;
}
