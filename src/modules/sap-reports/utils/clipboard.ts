import { toClipboardCell } from '@/shared/utils';

import type { SapReportCell, SapReportColumn } from '../api';

export { copyToClipboard } from '@/shared/utils';

/**
 * Turn report rows into what a spreadsheet expects on the clipboard: one line
 * per row, a tab between cells, and nothing else.
 *
 * No header line, no quoting, no thousands separators. The rows are meant to
 * land inside a sheet the user has already built — their own headings, their
 * own formulas — so anything we add here is something they have to delete, and
 * a formatted "1,23,456.00" pastes as text rather than as a number.
 */
export function buildClipboardText(
  rows: SapReportCell[][],
  columns: SapReportColumn[],
  options: { includeHeaders?: boolean } = {},
): string {
  const lines = rows.map((row) =>
    columns.map((_, index) => toClipboardCell(row[index])).join('\t'),
  );
  if (options.includeHeaders) {
    lines.unshift(columns.map((column) => toClipboardCell(column.label)).join('\t'));
  }
  // Excel on Windows splits rows on CRLF; everything else accepts it too.
  return lines.join('\r\n');
}
