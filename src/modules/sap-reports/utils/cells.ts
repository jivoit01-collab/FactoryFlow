import { formatNumber } from '@/shared/utils';

import type { SapReportCell, SapReportColumn } from '../api';

/**
 * What a cell reads as on screen — one spelling, used by the grid, by the
 * column filters and by the search.
 *
 * They have to agree. A filter offering "1,234.50" when the cell under it says
 * "1234.5" is a filter that appears to match nothing, which is worse than a
 * column having no filter at all.
 */
export function cellText(cell: SapReportCell | undefined, column: SapReportColumn): string {
  if (cell === null || cell === undefined || cell === '') return '';
  if (column.type === 'number' && typeof cell === 'number') {
    // Whole numbers are counts and document numbers; decimals are money or
    // quantities. Showing "626080206.00" for an invoice number reads as a bug.
    return Number.isInteger(cell) ? cell.toLocaleString() : formatNumber(cell);
  }
  return String(cell);
}

/** A cell as a number, or null when it does not hold one. */
export function cellNumber(cell: SapReportCell | undefined): number | null {
  if (cell === null || cell === undefined || cell === '' || typeof cell === 'boolean') return null;
  const value = typeof cell === 'number' ? cell : Number(cell);
  return Number.isFinite(value) ? value : null;
}
