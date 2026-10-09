import { copyToClipboard } from '@/shared/utils/clipboard';

/**
 * Putting a block of cells on the clipboard: as cells, or as a picture.
 *
 * Excel puts the same block on the clipboard in several forms at once and
 * lets whatever you paste into take the one it wants. This used to do the
 * same -- text, an HTML table and a picture in one write -- on the theory
 * that a spreadsheet takes the table and a chat window the picture. But the
 * program you paste into chooses, not us, and a spreadsheet offered a picture
 * beside a table may well take the picture: LibreOffice Calc did, and the
 * sales planning sheet landed as a screenshot where its rows should have
 * gone. The only way to be sure what arrives is to offer one kind of thing.
 *
 * So there are two copies, and the user says which:
 *
 * - `'cells'` (Ctrl+C, the Copy button) writes the HTML table and the
 *   tab-separated text -- a spreadsheet gets cells, a text box the text.
 * - `'picture'` (the Copy as picture button) writes the picture alone, for a
 *   chat window, where a table pasted as text is a wall of words.
 *
 * WHAT GOES IN WHICH
 * The cells are exactly the cells that were picked -- paste them under
 * existing rows in a spreadsheet and nothing extra arrives -- with the
 * figures written plainly (see `plainFigure`). The picture is for a person to
 * read: it keeps the grouping, and gets a heading band on top, because a
 * column of bare numbers in a chat with no heading says nothing. That is a
 * deliberate difference, not an oversight.
 */

export interface CopyBlock {
  /** The picked cells, row by row, already as the text they read. */
  rows: string[][];
  /** Column headings, left to right — drawn on the picture only. */
  headers: string[];
  /**
   * Which columns are figures: they line up right in the picture, and go to a
   * spreadsheet without their grouping.
   */
  alignRight: boolean[];
}

export type CopyForm = 'cells' | 'picture';

/** "7,75,000" or "1,234.50" -- the whole cell a grouped number, and nothing else. */
const GROUPED_FIGURE = /^-?\d{1,3}(?:,\d{2,3})*,\d{3}(?:\.\d+)?$/;

/**
 * A figure as a spreadsheet will read it: "7,75,000" goes as "775000".
 *
 * The grouping is for the eye. A spreadsheet takes a comma as a separator only
 * where its own locale would put one, so lakh grouping pasted into a sheet
 * set to thousands -- Calc in English (USA) -- arrives as text, and a column of
 * it will not add up. Only a cell that is wholly a grouped number is touched:
 * a blank, a dash or a word in a figure column goes as it reads.
 */
export function plainFigure(cell: string): string {
  return GROUPED_FIGURE.test(cell) ? cell.replace(/,/g, '') : cell;
}

/** The cells a spreadsheet gets: as picked, the figures without their grouping. */
function sheetCells(block: CopyBlock): string[][] {
  return block.rows.map((row) =>
    row.map((cell, index) => (block.alignRight[index] ? plainFigure(cell) : cell)),
  );
}

/** Tab-separated, the plainest form, and what a text box will take. */
export function blockToTsv(block: CopyBlock): string {
  return sheetCells(block)
    .map((row) => row.join('\t'))
    .join('\n');
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** A real table, which is what makes a spreadsheet paste it as cells. */
export function blockToHtml(block: CopyBlock): string {
  const body = sheetCells(block)
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, index) =>
              `<td style="border:1px solid #d4d4d8;padding:4px 8px;${
                block.alignRight[index] ? 'text-align:right;' : ''
              }">${escapeHtml(cell)}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  return `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt">${body}</table>`;
}

const FONT = '13px "Segoe UI", system-ui, sans-serif';
const HEAD_FONT = '600 13px "Segoe UI", system-ui, sans-serif';
const PAD = 10;
const ROW_H = 26;
const HEAD_H = 30;
const MAX_COL = 320;

/**
 * The block drawn as a picture, so a chat window has something to show.
 *
 * Always in light colours whatever the page's theme: it is going somewhere
 * else, where a dark strip pasted into a white conversation reads as a
 * mistake.
 */
export async function blockToPng(block: CopyBlock): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return null;

  const columns = block.headers.length;
  const widths: number[] = [];
  for (let c = 0; c < columns; c += 1) {
    measure.font = HEAD_FONT;
    let width = measure.measureText(block.headers[c] ?? '').width;
    measure.font = FONT;
    for (const row of block.rows) {
      width = Math.max(width, measure.measureText(row[c] ?? '').width);
    }
    widths.push(Math.min(MAX_COL, Math.ceil(width) + PAD * 2));
  }

  const width = widths.reduce((total, w) => total + w, 0);
  const height = HEAD_H + block.rows.length * ROW_H;
  if (width === 0 || height === 0) return null;

  // Drawn at twice the size so it is not soft on a normal screen.
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // The heading band.
  ctx.fillStyle = '#e9e4f5';
  ctx.fillRect(0, 0, width, HEAD_H);

  ctx.textBaseline = 'middle';
  const drawRow = (cells: string[], top: number, rowHeight: number, bold: boolean) => {
    ctx.font = bold ? HEAD_FONT : FONT;
    ctx.fillStyle = bold ? '#27272a' : '#18181b';
    let x = 0;
    for (let c = 0; c < columns; c += 1) {
      const text = cells[c] ?? '';
      const columnWidth = widths[c];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, top, columnWidth, rowHeight);
      ctx.clip();
      const right = block.alignRight[c] && !bold;
      ctx.textAlign = bold ? 'center' : right ? 'right' : 'left';
      const at = bold
        ? x + columnWidth / 2
        : right
          ? x + columnWidth - PAD
          : x + PAD;
      ctx.fillText(text, at, top + rowHeight / 2);
      ctx.restore();
      x += columnWidth;
    }
  };

  drawRow(block.headers, 0, HEAD_H, true);

  block.rows.forEach((row, index) => {
    const top = HEAD_H + index * ROW_H;
    if (index % 2 === 1) {
      ctx.fillStyle = '#faf9fc';
      ctx.fillRect(0, top, width, ROW_H);
    }
    drawRow(row, top, ROW_H, false);
  });

  // Lines last, over the fills.
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 1;
  for (let r = 0; r <= block.rows.length; r += 1) {
    const y = HEAD_H + r * ROW_H - 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  let x = 0;
  for (const columnWidth of widths) {
    x += columnWidth;
    ctx.beginPath();
    ctx.moveTo(x - 0.5, 0);
    ctx.lineTo(x - 0.5, height);
    ctx.stroke();
  }
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

function clipboardItemCtor() {
  return (globalThis as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
}

/**
 * Copy a block as cells (the default) or as a picture -- one or the other,
 * never both; see the top of this file for why.
 *
 * Cells fall back to the plain text alone if the browser will not take a
 * multi-format write -- an old one, one refusing the permission, or the app
 * opened over plain HTTP on the LAN. A spreadsheet still splits that text on
 * its tabs, so the copy still lands as cells.
 *
 * A picture has no fallback: text in its place would be a Copy the user did
 * not ask for. It comes back false instead, and the caller says so.
 */
export async function copyBlock(block: CopyBlock, form: CopyForm = 'cells'): Promise<boolean> {
  // `navigator.clipboard` itself is missing over plain HTTP; writing to it then
  // throws, and lands in the same catch as a refusal.
  const Item = clipboardItemCtor();

  if (form === 'picture') {
    if (!Item) return false;
    try {
      const png = await blockToPng(block);
      if (!png) return false;
      await navigator.clipboard.write([new Item({ 'image/png': png })]);
      return true;
    } catch {
      return false;
    }
  }

  const tsv = blockToTsv(block);
  if (Item) {
    try {
      await navigator.clipboard.write([
        new Item({
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
          'text/html': new Blob([blockToHtml(block)], { type: 'text/html' }),
        }),
      ]);
      return true;
    } catch {
      // Fall through to the plain write below.
    }
  }
  return copyToClipboard(tsv);
}
