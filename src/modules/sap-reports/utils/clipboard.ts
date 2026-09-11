import type { SapReportCell, SapReportColumn } from '../api';

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
  const lines = rows.map((row) => columns.map((_, index) => toCell(row[index])).join('\t'));
  if (options.includeHeaders) {
    lines.unshift(columns.map((column) => toCell(column.label)).join('\t'));
  }
  // Excel on Windows splits rows on CRLF; everything else accepts it too.
  return lines.join('\r\n');
}

function toCell(cell: SapReportCell | undefined): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : '';
  if (typeof cell === 'boolean') return cell ? 'TRUE' : 'FALSE';
  // A tab inside a remark would start a new column and a newline a new row,
  // shearing every cell after it one place across the sheet.
  return cell.replace(/[\t\r\n]+/g, ' ');
}

/**
 * Copy text, falling back to the old selection trick.
 *
 * `navigator.clipboard` exists only in a secure context, and the app is also
 * reached over plain HTTP on the factory LAN, where it is simply undefined.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or a non-secure origin — try the legacy path.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  // Off-screen but still focusable: execCommand only copies a live selection.
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
