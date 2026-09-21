import type { SapReportCell, SapReportColumn } from '../api';
import { cellNumber } from './cells';

/**
 * Last words that mark a numeric column as a label rather than an amount.
 *
 * SAP hands back document numbers, line numbers, object types and years as
 * DECIMALs, so "is it a number?" is not enough to decide what is worth adding
 * up. A column of DocNums adds to a number nobody asked for, and standing next
 * to the real totals it makes those harder to trust.
 */
const LABEL_WORDS = new Set([
  'no',
  'nos',
  'num',
  'number',
  'code',
  'id',
  'entry',
  'ref',
  'type',
  'key',
  'year',
  'month',
  'week',
  'sr',
  'srno',
  'slno',
  'sno',
  'serial',
  'line',
  'row',
  'seq',
]);

/** `DocNum` / `Qty In Box` / `BASE_REF` → the words it is made of, lowercased. */
function words(heading: string): string[] {
  return heading
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Whether a column holds amounts worth adding up.
 *
 * A percentage is left out for the same reason a document number is: the sum of
 * a discount column is not a discount.
 */
export function isSummableColumn(column: SapReportColumn): boolean {
  if (column.type !== 'number') return false;
  if (column.label.includes('%') || column.key.includes('%')) return false;

  const parts = words(column.label).length ? words(column.label) : words(column.key);
  // A duplicated heading gets a "(2)" on its key; that suffix is not the heading.
  while (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) parts.pop();
  if (!parts.length) return false;

  // "No of Boxes" is a count; "Box No" is a label. Only the last word decides.
  return !LABEL_WORDS.has(parts[parts.length - 1]);
}

export interface ColumnTotal {
  /** Where the column sits in the result, so the total can be lined up with it. */
  index: number;
  column: SapReportColumn;
  total: number;
  /** Every value added was whole, so the total prints without decimals. */
  isWhole: boolean;
  /** How many rows actually carried a number — a column of blanks is dropped. */
  count: number;
}

/**
 * Add up every numeric column that holds amounts, over the rows given.
 *
 * Columns that were entirely blank are left out rather than shown as zero: a
 * report that returns an empty column should not put a 0 on top of the page.
 */
export function sumNumericColumns(
  columns: SapReportColumn[],
  rows: SapReportCell[][],
): ColumnTotal[] {
  const totals: ColumnTotal[] = [];

  columns.forEach((column, index) => {
    if (!isSummableColumn(column)) return;

    let total = 0;
    let count = 0;
    let isWhole = true;

    for (const row of rows) {
      const value = cellNumber(row[index]);
      if (value === null) continue;
      total += value;
      count += 1;
      if (!Number.isInteger(value)) isWhole = false;
    }

    if (!count) return;
    // Adding floats drifts — 0.1 + 0.2 is 0.30000000000000004 — and that drift
    // is what decides whether the total prints as whole.
    totals.push({ index, column, total: Math.round(total * 1e6) / 1e6, isWhole, count });
  });

  return totals;
}
