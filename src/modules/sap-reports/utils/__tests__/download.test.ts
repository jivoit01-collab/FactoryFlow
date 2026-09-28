import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { SapReportCell, SapReportColumn } from '../../api';
import { buildReportWorkbook, reportFilename } from '../download';

const columns: SapReportColumn[] = [
  { key: 'DocNum', label: 'Doc No.', type: 'number' },
  { key: 'CardName', label: 'Customer', type: 'text' },
  { key: 'DocDate', label: 'Date', type: 'date' },
  { key: 'Ltrs', label: 'Ltrs', type: 'number' },
];

const rows: SapReportCell[][] = [
  [1001, 'ACME TRADERS', '2026-09-01', 1234.5],
  [1002, null, '2026-09-02', null],
];

function sheetOf(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  return workbook.Sheets[workbook.SheetNames[0]];
}

describe('buildReportWorkbook', () => {
  it('leads with the headings, then the rows in the order given', () => {
    const sheet = sheetOf(buildReportWorkbook({ columns, rows, title: 'Pending Dispatch' }));

    expect(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })).toEqual([
      ['Doc No.', 'Customer', 'Date', 'Ltrs'],
      [1001, 'ACME TRADERS', '2026-09-01', 1234.5],
      [1002, null, '2026-09-02', null],
    ]);
  });

  it('writes figures as numbers, so the file adds up in Excel', () => {
    const sheet = sheetOf(buildReportWorkbook({ columns, rows, title: 'Pending Dispatch' }));

    expect(sheet.D2.t).toBe('n');
    expect(sheet.A2.t).toBe('n');
    expect(sheet.B2.t).toBe('s');
  });

  it('opens with a funnel on every heading', () => {
    const sheet = sheetOf(buildReportWorkbook({ columns, rows, title: 'Pending Dispatch' }));

    expect(sheet['!autofilter']?.ref).toBe('A1:D3');
  });

  it('trims the tab name to what Excel will take', () => {
    const workbook = buildReportWorkbook({
      columns,
      rows,
      title: 'Stock Status [BH] With Opening and Closing: All Godowns',
    });

    expect(workbook.SheetNames[0]).toBe('Stock Status  BH  With Opening');
    expect(workbook.SheetNames[0].length).toBeLessThanOrEqual(31);
  });

  it('still gives a sheet with its headings when no row is shown', () => {
    const sheet = sheetOf(buildReportWorkbook({ columns, rows: [], title: 'Pending Dispatch' }));

    expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })).toEqual([
      ['Doc No.', 'Customer', 'Date', 'Ltrs'],
    ]);
  });
});

describe('reportFilename', () => {
  it('names the file the way the server names its own export', () => {
    expect(reportFilename('FG STOCK LTR', new Date(2026, 8, 28, 9, 5))).toBe(
      'fg-stock-ltr-20260928-0905.xlsx',
    );
  });

  it('falls back to a plain name when the title has nothing to spell', () => {
    expect(reportFilename('—', new Date(2026, 8, 28, 9, 5))).toBe('sap-report-20260928-0905.xlsx');
  });
});
