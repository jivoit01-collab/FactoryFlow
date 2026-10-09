/**
 * Bill numbers out of whatever was pasted into a bill field: a column or block
 * copied from Excel, Google Sheets, Zoho Sheet or LibreOffice (cells split by
 * tabs, rows by line breaks), a list typed into a chat, or a single number.
 *
 * Every run of digits long enough to be a full bill number counts. Shorter runs
 * (a quantity, the day of a date, the ".00" of a number shown with decimals)
 * are left out, so pasting part of a number still types it into the search box.
 * A number the sheet shows with digit grouping (626,100,246, or the Indian
 * 62,61,00,246) is read as one number. Order is kept and repeats are dropped.
 */
export const MIN_PASTED_BILL_DIGITS = 6;

const GROUPED_NUMBER = /(?<![\d,])\d{1,3}(?:,\d{2})*(?:,\d{3})+(?!\d)/g;

export function billNumbersFromText(text: string): string[] {
  const ungrouped = text.replace(GROUPED_NUMBER, (grouped) => grouped.replace(/,/g, ''));
  const numbers = new Set<string>();
  for (const run of ungrouped.match(/\d+/g) ?? []) {
    if (run.length >= MIN_PASTED_BILL_DIGITS) numbers.add(run);
  }
  return [...numbers];
}

/** One line per table cell, ignoring the styles a sheet ships with its HTML. */
function htmlCellsText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, script').forEach((node) => node.remove());
  const cells = Array.from(doc.querySelectorAll('td, th'), (cell) => cell.textContent ?? '');
  return cells.length > 0 ? cells.join('\n') : (doc.body.textContent ?? '');
}

/**
 * The bill numbers on the clipboard. Every sheet puts a plain-text copy there;
 * the HTML copy is read only when an app left the plain text out.
 */
export function billNumbersFromClipboard(data: Pick<DataTransfer, 'getData'>): string[] {
  const text = data.getData('text/plain');
  if (text.trim()) return billNumbersFromText(text);
  const html = data.getData('text/html');
  return html ? billNumbersFromText(htmlCellsText(html)) : [];
}
