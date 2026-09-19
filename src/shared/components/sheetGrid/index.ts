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
