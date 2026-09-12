/**
 * Putting a table on the clipboard, for pasting into a spreadsheet.
 *
 * A spreadsheet reads a tab as the next column and a newline as the next row,
 * so that — and nothing else — is what a "copy table" writes. No quoting, no
 * thousands separators: the rows are meant to land inside a sheet the user has
 * already built, so anything we add is something they have to delete, and a
 * formatted "1,23,456.00" pastes as text rather than as a number.
 */
export type ClipboardCell = string | number | boolean | null | undefined;

/** One cell, made safe to sit between two tabs. */
export function toClipboardCell(cell: ClipboardCell): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : '';
  if (typeof cell === 'boolean') return cell ? 'TRUE' : 'FALSE';
  // A tab inside a remark would start a new column and a newline a new row,
  // shearing every cell after it one place across the sheet.
  return cell.replace(/[\t\r\n]+/g, ' ');
}

/** Rows as tab-separated lines. Excel on Windows splits on CRLF; the rest accept it too. */
export function buildTsv(rows: ClipboardCell[][]): string {
  return rows.map((row) => row.map(toClipboardCell).join('\t')).join('\r\n');
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
