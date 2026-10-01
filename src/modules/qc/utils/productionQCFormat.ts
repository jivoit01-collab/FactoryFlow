/** Date and time labels for the QC Documents screens. */

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
