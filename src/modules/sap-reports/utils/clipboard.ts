import { toClipboardCell } from '@/shared/utils';

import type { SapReportCell, SapReportColumn } from '../api';

export { copyToClipboard } from '@/shared/utils';

/**
 * Turn report rows into what a spreadsheet expects on the clipboard: one line
 * per row, a tab between cells, and nothing else.
 *
 * `includeHeaders` puts the column labels on the first line, so the block
 * names its own columns once it lands. No quoting and no thousands separators
 * either way: a formatted "1,23,456.00" pastes as text rather than a number.
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
