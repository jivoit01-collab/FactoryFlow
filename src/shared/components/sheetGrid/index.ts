/**
 * The spreadsheet kit.
 *
 * The people who keep these registers kept them in Excel for years, and more
 * than one screen now replaces one of those books — the cash book, and the
 * dispatch sheet. They are read the same way, so the parts that make a table
 * read like a sheet live here rather than inside whichever module happened to
 * need them first: a filter and a sort on every column header, arrow keys that
 * walk the cells, and cell selection -- a dragged block, a row, a column or
 * the sheet -- with the figures for whatever is picked.
 */
export {
  blockToHtml,
  blockToPng,
  blockToTsv,
  type CopyBlock,
  copyBlock,
} from './clipboard';
export { ColumnFilter, type ColumnValue } from './ColumnFilter';
export { SortHeader } from './SortHeader';
export { type SortDirection, type SortState, toSortParam, useClientSort } from './sorting';
export { BLANK, type ColumnSpec, useLocalColumns } from './useLocalColumns';
export {
  type CellRange,
  columnLetter,
  rangeAddress,
  type SelectionFigures,
  useSheetSelection,
} from './useSheetSelection';
export { useSpreadsheetKeys } from './useSpreadsheetKeys';

/**
 * The look of a totals row, so every sheet's reads the same.
 *
 * It sits at the TOP of the body rather than the foot: these tables scroll,
 * and a total you have to reach the bottom of four hundred rows to see is one
 * nobody reads.
 */
export const TOTALS_ROW_CLASS =
  'border-b-2 bg-muted/50 font-semibold [&>td]:px-3 [&>td]:py-2';
