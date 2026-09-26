/**
 * Turning an uploaded Excel sheet (`SheetLayout`) into something a table can
 * draw: which cells show, how far each spans, and each cell's look as CSS.
 *
 * Pure functions, kept apart from the component so they can be tested and
 * reused by the screen, the designer and the print view alike.
 */
import type { CSSProperties } from 'react';

import type {
  CellField,
  CellFields,
  CellFieldType,
  SheetCell,
  SheetLayout,
  SheetStyle,
} from '../types/qcRecord.types';

// ---------------------------------------------------------------------------
// Cell references
// ---------------------------------------------------------------------------

export function columnLetter(col: number): string {
  let letters = '';
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function toRef(row: number, col: number): string {
  return `${columnLetter(col)}${row}`;
}

/** 'D10' -> { row: 10, col: 4 }. */
export function parseRef(ref: string): { row: number; col: number } {
  const match = /^([A-Z]{1,3})(\d+)$/.exec(ref);
  if (!match) throw new Error(`Not a cell reference: ${ref}`);
  let col = 0;
  for (const char of match[1]) col = col * 26 + (char.charCodeAt(0) - 64);
  return { row: Number(match[2]), col };
}

function parseRange(range: string) {
  const [start, end = start] = range.split(':');
  const a = parseRef(start);
  const b = parseRef(end);
  return { minRow: a.row, minCol: a.col, maxRow: b.row, maxCol: b.col };
}

// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

/** Typed in, and stored per record. */
export const VALUE_FIELD_TYPES: CellFieldType[] = ['TEXT', 'NUMBER', 'TIME', 'DATE', 'CHOICE'];

/** Shown from the record itself, never typed into the cell. */
export const BOUND_FIELD_TYPES: CellFieldType[] = [
  'RECORD_DATE',
  'SHIFT',
  'REMARKS',
  'SIGN_SUBMITTED',
  'SIGN_APPROVED',
];

export const FIELD_TYPE_LABEL: Record<CellFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  TIME: 'Time',
  DATE: 'Date',
  CHOICE: 'Choice',
  RECORD_DATE: "Record's date",
  SHIFT: "Record's shift",
  REMARKS: 'Remarks',
  SIGN_SUBMITTED: 'Submitted by (signature)',
  SIGN_APPROVED: 'Approved by (signature)',
};

/** Faint hint drawn in an empty cell in the designer, so types read at a glance. */
export const FIELD_TYPE_HINT: Record<CellFieldType, string> = {
  TEXT: 'Aa',
  NUMBER: '123',
  TIME: 'hh:mm',
  DATE: 'dd-mm-yyyy',
  CHOICE: '▾',
  RECORD_DATE: '‹date›',
  SHIFT: '‹shift›',
  REMARKS: '‹remarks›',
  SIGN_SUBMITTED: '‹submitted by›',
  SIGN_APPROVED: '‹approved by›',
};

/** Designer tint per type. Fixed colours: the sheet is always drawn as paper. */
export const FIELD_TYPE_TINT: Record<CellFieldType, string> = {
  TEXT: 'rgba(14, 165, 233, 0.16)',
  NUMBER: 'rgba(16, 185, 129, 0.18)',
  TIME: 'rgba(139, 92, 246, 0.18)',
  DATE: 'rgba(139, 92, 246, 0.18)',
  CHOICE: 'rgba(245, 158, 11, 0.2)',
  RECORD_DATE: 'rgba(217, 70, 239, 0.18)',
  SHIFT: 'rgba(217, 70, 239, 0.18)',
  REMARKS: 'rgba(217, 70, 239, 0.18)',
  SIGN_SUBMITTED: 'rgba(217, 70, 239, 0.18)',
  SIGN_APPROVED: 'rgba(217, 70, 239, 0.18)',
};

export function isValueField(field: CellField | undefined): boolean {
  return !!field && VALUE_FIELD_TYPES.includes(field.type);
}

// ---------------------------------------------------------------------------
// The grid a table draws
// ---------------------------------------------------------------------------

export interface GridCell {
  ref: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  cell: SheetCell | undefined;
  style: SheetStyle;
  field: CellField | undefined;
  /** Label text that may run on into the empty cells to its right, as in Excel. */
  spills: boolean;
}

export interface GridRow {
  row: number;
  height: number;
  cells: GridCell[];
}

export interface SheetGrid {
  cols: { col: number; width: number }[];
  rows: GridRow[];
  /** Natural size in pixels, at Excel's 100% zoom. */
  width: number;
  height: number;
  /** Top-left pixel of each sheet column / row, hidden ones included. */
  colStart: number[];
  rowStart: number[];
}

const BOUND_OR_LOOSE_SPAN: CellFieldType[] = BOUND_FIELD_TYPES;

/**
 * Lay the sheet out as table rows.
 *
 * Merged blocks become row/col spans. A field sitting in a cell with no
 * border -- 'Remarks: ____', a signature line -- also spans the empty,
 * border-free cells to its right, the way text runs on in Excel, so there is
 * room to write in it.
 */
export function buildSheetGrid(layout: SheetLayout, fields: CellFields = {}): SheetGrid {
  const { minRow, minCol, maxRow, maxCol } = parseRange(layout.range);
  const colHidden = (col: number) => !!layout.cols[col - minCol]?.hidden;
  const rowHidden = (row: number) => !!layout.rows[row - minRow]?.hidden;

  const covered = new Set<string>();
  const spans = new Map<string, { rowSpan: number; colSpan: number }>();
  for (const block of layout.merges) {
    const { minRow: r1, minCol: c1, maxRow: r2, maxCol: c2 } = parseRange(block);
    let rowSpan = 0;
    for (let row = r1; row <= r2; row += 1) if (!rowHidden(row)) rowSpan += 1;
    let colSpan = 0;
    for (let col = c1; col <= c2; col += 1) if (!colHidden(col)) colSpan += 1;
    spans.set(toRef(r1, c1), { rowSpan: Math.max(rowSpan, 1), colSpan: Math.max(colSpan, 1) });
    for (let row = r1; row <= r2; row += 1) {
      for (let col = c1; col <= c2; col += 1) {
        if (row !== r1 || col !== c1) covered.add(toRef(row, col));
      }
    }
  }

  const styleOf = (ref: string): SheetStyle => {
    const cell = layout.cells[ref];
    return cell ? (layout.styles[cell.s] ?? {}) : {};
  };
  const isBlank = (ref: string) => !layout.cells[ref]?.v && !fields[ref] && !covered.has(ref);

  const colStart: number[] = [];
  let x = 0;
  const cols: SheetGrid['cols'] = [];
  for (let col = minCol; col <= maxCol; col += 1) {
    colStart.push(x);
    if (colHidden(col)) continue;
    const width = layout.cols[col - minCol]?.w ?? 64;
    cols.push({ col, width });
    x += width;
  }

  const rowStart: number[] = [];
  let y = 0;
  const rows: GridRow[] = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    rowStart.push(y);
    if (rowHidden(row)) continue;
    const height = layout.rows[row - minRow]?.h ?? 20;
    y += height;

    const cells: GridCell[] = [];
    // Cells swallowed by a field running on to the right.
    const swallowed = new Set<number>();
    for (let col = minCol; col <= maxCol; col += 1) {
      if (colHidden(col) || swallowed.has(col)) continue;
      const ref = toRef(row, col);
      if (covered.has(ref)) continue;
      const style = styleOf(ref);
      const field = fields[ref];
      const merged = spans.get(ref) ?? { rowSpan: 1, colSpan: 1 };
      const { rowSpan } = merged;
      let { colSpan } = merged;

      if (field && !spans.has(ref)) {
        const loose = !style.bl && !style.br && !style.bt && !style.bb;
        if (loose || BOUND_OR_LOOSE_SPAN.includes(field.type)) {
          let next = col + 1;
          let rightEdge = !!style.br;
          while (next <= maxCol && !rightEdge) {
            const nextRef = toRef(row, next);
            const nextStyle = styleOf(nextRef);
            if (colHidden(next)) {
              next += 1;
              continue;
            }
            if (!isBlank(nextRef) || spans.has(nextRef) || nextStyle.bl) break;
            swallowed.add(next);
            colSpan += 1;
            rightEdge = !!nextStyle.br;
            next += 1;
          }
        }
      }

      const cell = layout.cells[ref];
      let spills = false;
      const alignedLeft = (style.ha ?? (cell?.n ? 'right' : 'left')) === 'left';
      if (cell?.v && !style.wr && !spans.has(ref) && !field && alignedLeft) {
        const nextRef = toRef(row, col + 1);
        spills = col < maxCol && isBlank(nextRef) && !spans.has(nextRef);
      }
      cells.push({ ref, row, col, rowSpan, colSpan, cell, style, field, spills });
    }
    rows.push({ row, height, cells });
  }

  return { cols, rows, width: x, height: y, colStart, rowStart };
}

// ---------------------------------------------------------------------------
// Style -> CSS
// ---------------------------------------------------------------------------

const BORDER_CSS: Record<string, string> = {
  thin: '1px solid',
  hair: '1px dotted',
  dotted: '1px dotted',
  dashed: '1px dashed',
  dashDot: '1px dashed',
  dashDotDot: '1px dashed',
  medium: '2px solid',
  mediumDashed: '2px dashed',
  mediumDashDot: '2px dashed',
  mediumDashDotDot: '2px dashed',
  slantDashDot: '2px dashed',
  thick: '3px solid',
  double: '3px double',
};

const FONT_FALLBACK: Record<string, string> = {
  'times new roman': '"Times New Roman", Times, serif',
  calibri: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  cambria: 'Cambria, Caladea, Georgia, serif',
  'arial narrow': '"Arial Narrow", Arial, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  tahoma: 'Tahoma, Verdana, sans-serif',
};

function fontFamily(name: string | undefined): string {
  if (!name) return FONT_FALLBACK.calibri;
  return FONT_FALLBACK[name.toLowerCase()] ?? `"${name.replace(/"/g, '')}", Arial, sans-serif`;
}

/** Excel font points at a zoom, as CSS pixels. */
export function fontPx(style: SheetStyle, scale: number): number {
  return (((style.fs ?? 11) * 96) / 72) * scale;
}

/** A cell's look as inline CSS, at `scale` (1 = Excel's 100% zoom). */
export function cellCss(gridCell: GridCell, scale: number): CSSProperties {
  const { style, cell } = gridCell;
  const css: CSSProperties = {
    fontFamily: fontFamily(style.ff),
    fontSize: `${fontPx(style, scale)}px`,
    lineHeight: 1.2,
    fontWeight: style.b ? 700 : 400,
    fontStyle: style.i ? 'italic' : 'normal',
    textDecoration:
      [style.u && 'underline', style.st && 'line-through'].filter(Boolean).join(' ') || 'none',
    color: style.fc ?? '#000000',
    backgroundColor: style.bg,
    textAlign: style.ha ?? (cell?.n ? 'right' : 'left'),
    verticalAlign: style.va ?? 'bottom',
    whiteSpace: style.wr ? 'pre-wrap' : 'pre',
    overflow: gridCell.spills ? 'visible' : 'hidden',
    wordBreak: style.wr ? 'break-word' : undefined,
    padding: `0 ${Math.max(1, 3 * scale)}px`,
    paddingLeft: style.ind ? `${Math.max(1, 3 * scale) + style.ind * 9 * scale}px` : undefined,
    boxSizing: 'border-box',
  };
  const sides = [
    ['borderLeft', style.bl],
    ['borderRight', style.br],
    ['borderTop', style.bt],
    ['borderBottom', style.bb],
  ] as const;
  for (const [key, value] of sides) {
    if (value) css[key] = `${BORDER_CSS[value] ?? '1px solid'} #000`;
  }
  if (style.rot === 90) {
    css.writingMode = 'vertical-rl';
    css.transform = 'rotate(180deg)';
  } else if (style.rot === 180) {
    css.writingMode = 'vertical-rl';
  } else if (style.rot === 255) {
    css.writingMode = 'vertical-rl';
    css.textOrientation = 'upright';
  }
  return css;
}

// ---------------------------------------------------------------------------
// Selection and printing helpers
// ---------------------------------------------------------------------------

/** Every drawn cell whose top-left falls in the rectangle between two refs. */
export function refsInRect(grid: SheetGrid, from: string, to: string): string[] {
  const a = parseRef(from);
  const b = parseRef(to);
  const top = Math.min(a.row, b.row);
  const bottom = Math.max(a.row, b.row);
  const left = Math.min(a.col, b.col);
  const right = Math.max(a.col, b.col);
  const refs: string[] = [];
  for (const row of grid.rows) {
    if (row.row < top || row.row > bottom) continue;
    for (const cell of row.cells) {
      if (cell.col >= left && cell.col <= right) refs.push(cell.ref);
    }
  }
  return refs;
}

/** 'D10:M10' style summary of a selection, for the designer's panel. */
export function describeRefs(refs: string[]): string {
  if (refs.length === 0) return '';
  if (refs.length === 1) return refs[0];
  const points = refs.map(parseRef);
  const top = Math.min(...points.map((p) => p.row));
  const bottom = Math.max(...points.map((p) => p.row));
  const left = Math.min(...points.map((p) => p.col));
  const right = Math.max(...points.map((p) => p.col));
  return `${toRef(top, left)}:${toRef(bottom, right)}`;
}

/** The printed page's usable area in CSS pixels: A4 at 96 dpi, less 8 mm
 * margins and room for the header and footer lines. */
const PRINT_AREA = {
  landscape: { width: 1062, height: 660 },
  portrait: { width: 734, height: 990 },
} as const;

/** How far a printout may stretch a sheet out of its own proportions. */
const MAX_PRINT_STRETCH = 1.6;

/**
 * Horizontal and vertical zoom that fill one printed A4 page with the sheet.
 *
 * QA's sheets rarely have the page's own proportions, so a proportional fit
 * leaves a third of the page blank and the text tiny. Each direction is
 * fitted on its own instead, within MAX_PRINT_STRETCH of the other; the text
 * follows the smaller zoom, so it still fits its rows, and gets the room of
 * the wider columns to wrap in. A sheet more than twice the page's height is
 * fitted to width and runs over pages, rather than shrunk unreadably small.
 */
export function printScale(
  grid: SheetGrid,
  orientation: 'portrait' | 'landscape',
): { x: number; y: number } {
  const page = PRINT_AREA[orientation];
  if (grid.width <= 0 || grid.height <= 0) return { x: 1, y: 1 };
  let x = page.width / grid.width;
  let y = page.height / grid.height;
  if (grid.height * x > page.height * 2) return { x, y: x };
  x = Math.min(x, y * MAX_PRINT_STRETCH);
  y = Math.min(y, x * MAX_PRINT_STRETCH);
  return { x, y };
}

/**
 * A sign-off as a signature cell shows it: the name over the date and time,
 * so it fits the narrow cell a paper form leaves for a signature.
 */
export function signature(name: string | null | undefined, at: string | null | undefined): string {
  if (!name) return '';
  if (!at) return name;
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return name;
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${pad(when.getDate())}-${pad(when.getMonth() + 1)}-${when.getFullYear()} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
  return `${name}\n${stamp}`;
}

/** 'YYYY-MM-DD' -> 'DD-MM-YYYY', the way the paper forms write a date. */
export function toDDMMYYYY(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}-${month}-${year}` : iso;
}
