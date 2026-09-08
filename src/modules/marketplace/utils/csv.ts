/**
 * Client-side CSV export, shared by the marketplace screens.
 *
 * The lists these screens export are already fully loaded in the browser (a
 * sheet's orders, the masters), so there is nothing for the server to do — the
 * file is assembled from exactly what the operator is looking at, filters and
 * all.
 */

export type CsvValue = string | number | boolean | null | undefined;

/** Quote a CSV field only when it contains a comma, quote or newline (RFC-4180). */
export function csvCell(value: CsvValue): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Assemble a CSV document from a header row and its data rows. */
export function buildCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
}

export function triggerCsvDownload(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
