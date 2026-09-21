import { describe, expect, it } from 'vitest';

import type { SapReportCell, SapReportColumn } from '../../api';
import { isSummableColumn, sumNumericColumns } from '../totals';

function number(key: string, label = key): SapReportColumn {
  return { key, label, type: 'number' };
}

describe('isSummableColumn', () => {
  it('adds up the quantities a report is read for', () => {
    expect(isSummableColumn(number('Liter'))).toBe(true);
    expect(isSummableColumn(number('Qty'))).toBe(true);
    expect(isSummableColumn(number('Box'))).toBe(true);
    expect(isSummableColumn(number('DocTotal', 'Doc Total'))).toBe(true);
    expect(isSummableColumn(number('NoOfBoxes', 'No of Boxes'))).toBe(true);
  });

  it('leaves out the numbers that are labels', () => {
    expect(isSummableColumn(number('DocNum', 'Doc No.'))).toBe(false);
    expect(isSummableColumn(number('DocEntry'))).toBe(false);
    expect(isSummableColumn(number('LineNum', 'Line Num'))).toBe(false);
    expect(isSummableColumn(number('ObjType', 'Object Type'))).toBe(false);
    expect(isSummableColumn(number('Year', 'Fiscal Year'))).toBe(false);
    expect(isSummableColumn(number('BASE_REF'))).toBe(false);
  });

  it('ignores the "(2)" a duplicated heading gets on its key', () => {
    expect(isSummableColumn({ key: 'DocNum (2)', label: 'DocNum', type: 'number' })).toBe(false);
    expect(isSummableColumn({ key: 'Qty (2)', label: 'Qty', type: 'number' })).toBe(true);
  });

  it('leaves percentages alone — the sum of a discount is not a discount', () => {
    expect(isSummableColumn(number('Disc', 'Disc %'))).toBe(false);
  });

  it('never sums text or dates', () => {
    expect(isSummableColumn({ key: 'CardName', label: 'Customer', type: 'text' })).toBe(false);
    expect(isSummableColumn({ key: 'DocDate', label: 'Date', type: 'date' })).toBe(false);
  });
});

describe('sumNumericColumns', () => {
  const columns: SapReportColumn[] = [
    { key: 'DocNum', label: 'Doc No.', type: 'number' },
    { key: 'CardName', label: 'Customer', type: 'text' },
    { key: 'Liter', label: 'Liter', type: 'number' },
    { key: 'Box', label: 'Box', type: 'number' },
  ];

  const rows: SapReportCell[][] = [
    [1001, 'ACME TRADERS', 12.5, 3],
    [1002, 'BHARAT OIL', 7.25, 1],
    [1003, 'CHANDNI STORES', null, 2],
  ];

  it('totals only the amount columns, keeping their place in the result', () => {
    expect(sumNumericColumns(columns, rows)).toEqual([
      { index: 2, column: columns[2], total: 19.75, isWhole: false, count: 2 },
      { index: 3, column: columns[3], total: 6, isWhole: true, count: 3 },
    ]);
  });

  it('drops a column no row filled in rather than showing a zero', () => {
    const empty: SapReportCell[][] = [[1001, 'ACME TRADERS', null, 2]];
    expect(sumNumericColumns(columns, empty).map((total) => total.column.key)).toEqual(['Box']);
  });

  it('does not let float drift decide whether a total is whole', () => {
    const drift: SapReportCell[][] = [
      [1, 'A', 0.1, 0],
      [2, 'B', 0.2, 0],
    ];
    expect(sumNumericColumns(columns, drift)[0].total).toBe(0.3);
  });

  it('reads a number SAP handed back as text', () => {
    const asText: SapReportCell[][] = [[1, 'A', '12.5', '3']];
    expect(sumNumericColumns(columns, asText).map((total) => total.total)).toEqual([12.5, 3]);
  });

  it('totals nothing when there are no rows', () => {
    expect(sumNumericColumns(columns, [])).toEqual([]);
  });
});
