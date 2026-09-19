/**
 * Putting a block of cells on the clipboard the way a spreadsheet does.
 *
 * Excel does not copy "the text". It puts the same block on the clipboard in
 * several forms at once and lets whatever you paste into take the one it
 * understands: a spreadsheet takes the HTML table and gets cells, a chat
 * window takes the picture and shows a table, a plain text box takes the
 * tab-separated text. That is why pasting Excel into WhatsApp gives a neat
 * image while pasting tab-separated text gives a wall of words.
 *
 * So this writes all three.
 *
 * WHAT GOES IN WHICH
 * The text and the HTML are exactly the cells that were picked — paste them
 * under existing rows in a spreadsheet and nothing extra arrives. The picture
 * gets a heading band on top, because a picture is for a person to read in a
 * chat and a column of bare numbers with no heading says nothing. That is a
 * deliberate difference, not an oversight.
 */

export interface CopyBlock {
  /** The picked cells, row by row, already as the text they read. */
  rows: string[][];
  /** Column headings, left to right — drawn on the picture only. */
  headers: string[];
  /** Which columns are figures, so they line up right in the picture. */
  alignRight: boolean[];
}

/** Tab-separated, the plainest form, and what a text box will take. */
export function blockToTsv(block: CopyBlock): string {
  return block.rows.map((row) => row.join('\t')).join('\n');
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** A real table, which is what makes a spreadsheet paste it as cells. */
export function blockToHtml(block: CopyBlock): string {
  const body = block.rows
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

/**
 * Copy a block in every form at once.
 *
 * Falls back to the plain text alone if the browser will not take a
 * multi-format write — an old one, or one refusing the clipboard permission.
 * Copying something is always better than copying nothing.
 */
export async function copyBlock(block: CopyBlock): Promise<boolean> {
  const tsv = blockToTsv(block);

  const ClipboardItemCtor = (
    globalThis as unknown as { ClipboardItem?: typeof ClipboardItem }
  ).ClipboardItem;

  if (navigator.clipboard?.write && ClipboardItemCtor) {
    try {
      const png = await blockToPng(block);
      const parts: Record<string, Blob> = {
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
        'text/html': new Blob([blockToHtml(block)], { type: 'text/html' }),
      };
      if (png) parts['image/png'] = png;
      await navigator.clipboard.write([new ClipboardItemCtor(parts)]);
      return true;
    } catch {
      // Fall through to the plain write below.
    }
  }

  try {
    await navigator.clipboard?.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}
