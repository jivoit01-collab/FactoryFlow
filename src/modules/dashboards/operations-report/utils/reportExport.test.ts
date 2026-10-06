import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { ReportDay, ReportMeta } from '../types';
import { daysBetween, resolvePeriod } from './period';
import { buildReportWorkbook, reportFileName, TABLE_HEADER_ROW } from './reportExport';
import { buildReport, fetchSpan } from './summarise';

const NO_META: ReportMeta = { degraded: [], withheld: [], warnings: [] };
const OIL = { code: 'JIVO_OIL', name: 'Jivo Oil' };

const day = (date: string, overrides: Partial<ReportDay> = {}): ReportDay => ({
  date,
  lines: [{ line: '10 Head', runs: 2, cases: 100, litres: 1_000 }],
  wastage: [{ item: 'Caps', unit: 'pcs', quantity: 50, value: 100, unpriced: 0 }],
  labour: [{ group: 'Imran', heads: 10, day_shift: 8, night_shift: 2, cost: 500 }],
  salary: [{ department: 'Packing', monthly: 9_000, cost: 300 }],
  power: [{ area: 'Blowing', kwh: 300, cost: 100 }],
  returns: [],
  ...overrides,
});

function september(meta: ReportMeta = NO_META, overrides: Partial<ReportDay> = {}) {
  const period = resolvePeriod({ view: 'month', date: null, month: '2026-09' }, '2026-10-06');
  const span = fetchSpan(period);
  const days = daysBetween(span.from, span.to).map((date) => day(date, overrides));
  return buildReport(period, { company: OIL, days, meta });
}

/** A sheet's table as objects, keyed by its header row. */
function rows(workbook: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { range: TABLE_HEADER_ROW });
}

describe('buildReportWorkbook', () => {
  it('puts the days first, then a sheet per breakdown', () => {
    const workbook = buildReportWorkbook(september(), 'September 2026');
    expect(workbook.SheetNames).toEqual([
      'Day by day',
      'By line',
      'Wastage',
      'Labour',
      'Salary',
      'Electricity',
      'Goods Return',
    ]);
    expect(workbook.Sheets['Day by day'].A1.v).toBe(
      'Operations Report · Jivo Oil · September 2026',
    );
  });

  it('writes a row a day with salary in the cost, and the month total under them', () => {
    const table = rows(buildReportWorkbook(september(), 'September 2026'), 'Day by day');
    expect(table).toHaveLength(31);

    expect(table[0]).toMatchObject({
      Date: '2026-09-01',
      Day: 'Tue',
      Litres: 1_000,
      'Salary (₹)': 300,
      'Total cost (₹)': 1_000,
      'Salary ₹/L': 0.3,
      'Cost ₹/L': 1,
    });
    expect(table[30]).toMatchObject({
      Date: 'Total',
      Litres: 30_000,
      'Salary (₹)': 9_000,
      'Total cost (₹)': 30_000,
      'Cost ₹/L': 1,
    });
  });

  it('keeps figures as numbers with a format, and an unknown one blank', () => {
    const report = september(NO_META, { salary: null });
    const sheet = buildReportWorkbook(report, 'September 2026').Sheets['Day by day'];
    const header = TABLE_HEADER_ROW;
    // Column C is litres, I is salary.
    expect(sheet[XLSX.utils.encode_cell({ r: header + 1, c: 2 })]).toMatchObject({
      t: 'n',
      v: 1_000,
      z: '#,##0',
    });
    expect(sheet[XLSX.utils.encode_cell({ r: header + 1, c: 8 })]).toBeUndefined();
  });

  it('leaves out a sheet the reader may not see, and says so on the first', () => {
    const meta: ReportMeta = {
      degraded: [],
      withheld: ['labour', 'salary', 'power'],
      warnings: [],
    };
    const workbook = buildReportWorkbook(
      september(meta, { labour: null, salary: null, power: null }),
      'September 2026',
    );
    expect(workbook.SheetNames).not.toContain('Salary');
    expect(workbook.SheetNames).not.toContain('Labour');
    expect(String(workbook.Sheets['Day by day'].A2.v)).toContain('Salary: not shown to you');
  });
});

describe('reportFileName', () => {
  it('names the company and the period', () => {
    expect(reportFileName(september())).toBe('operations_report_JIVO_OIL_2026-09.xlsx');
  });
});
