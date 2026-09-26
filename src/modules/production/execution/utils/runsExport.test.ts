import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { ProductionRun } from '../types';
import {
  buildRunsWorkbook,
  RUNS_SHEET_NAME,
  runsExportFileName,
  TOTALS_SHEET_NAME,
} from './runsExport';

const run = (fields: Partial<ProductionRun>) =>
  ({
    id: 1,
    run_number: 1,
    sap_doc_entry: null,
    line: 1,
    line_name: 'L1 Clear Pack',
    product: 'COLD PRESS 1 LTR 20 PCS',
    item_code: 'FG0001',
    date: '2026-09-25',
    created_at: '2026-09-25T02:30:00Z',
    required_qty: '1800.00',
    total_production: '0.0',
    rejected_qty: '0.0',
    pieces_per_case: 20,
    litres_per_piece: '1.0000',
    supervisor: 'Gautam',
    planning_remark: '',
    status: 'COMPLETED',
    live_status: 'COMPLETED',
    ...fields,
  }) as ProductionRun;

const RUNS = [
  run({ id: 1, run_number: 1, total_production: '1766.0', produced_cases: '1766.0' }),
  run({
    id: 2,
    run_number: 2,
    product: 'COLD PRESS SUNFLOWER 5 LTR 4 PCS',
    pieces_per_case: 4,
    litres_per_piece: '5.0000',
    produced_cases: '905.0',
    status: 'IN_PROGRESS',
    live_status: 'RUNNING',
  }),
  run({ id: 3, run_number: 3, produced_cases: '0.0', status: 'DRAFT', live_status: 'DRAFT' }),
  run({
    id: 4,
    run_number: 4,
    product: 'TEST SAMPLE',
    litres_per_piece: null,
    total_production: '100.0',
    produced_cases: '100.0',
    sap_doc_entry: 4412,
    planning_remark: 'Backfilled from PRODUCTION OIL PLANT.xlsx',
  }),
];

const sheet = (workbook: XLSX.WorkBook, name: string) =>
  XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name]);

const grid = (workbook: XLSX.WorkBook, name: string) =>
  XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, blankrows: false });

/** The workbook as Excel will open it: written to a file and read back. */
const saved = (workbook: XLSX.WorkBook) =>
  XLSX.read(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));

describe('buildRunsWorkbook', () => {
  const workbook = saved(
    buildRunsWorkbook(RUNS, {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-26',
      companyName: 'Jivo Oil',
    }),
  );

  it('lists every run on the board, in its order, drafts included', () => {
    expect(workbook.SheetNames).toEqual([RUNS_SHEET_NAME, TOTALS_SHEET_NAME]);
    expect(sheet(workbook, RUNS_SHEET_NAME).map((r) => r['Run #'])).toEqual([1, 2, 3, 4]);
  });

  it('writes cases and litres as numbers, and says which cases are final', () => {
    const [completed, running, draft, sample] = sheet(workbook, RUNS_SHEET_NAME);

    expect(completed).toMatchObject({
      Date: '2026-09-25',
      Line: 'L1 Clear Pack',
      Status: 'Completed',
      Cases: 1766,
      'Counted As': 'Final count',
      'Pcs / Case': 20,
      'Litres / Pc': 1,
      Litres: 35320,
      'Required Qty': 1800,
    });
    expect(running).toMatchObject({
      Status: 'Running',
      Cases: 905,
      'Counted As': 'So far',
      Litres: 18100,
    });
    expect(draft).toMatchObject({ Status: 'Draft', Cases: 0 });
    expect(draft['Counted As']).toBeUndefined();
    // No litre size: an empty cell — not a zero, and not an empty text cell.
    expect(sample.Litres).toBeUndefined();
    expect(sample['Pcs / Case']).toBe(20);
    expect(sample).toMatchObject({
      'SAP Entry': 4412,
      Remark: 'Backfilled from PRODUCTION OIL PLANT.xlsx',
    });
  });

  it('carries the totals the strip shows, and what they were narrowed to', () => {
    const rows = grid(workbook, TOTALS_SHEET_NAME);

    expect(rows).toContainEqual(['Company', 'Jivo Oil']);
    expect(rows).toContainEqual(['Dates', '01-09-2026 to 26-09-2026']);
    expect(rows).toContainEqual(['Line', 'All lines']);
    expect(rows).toContainEqual(['Status', 'All statuses']);
    expect(rows).toContainEqual(['Total', 2771, 3, 53420]);
    expect(rows).toContainEqual(['Completed', 1866, 2, 35320]);
    expect(rows).toContainEqual(['In progress (so far)', 905, 1, 18100]);
    expect(rows).toContainEqual(['Runs without a litre size', 1]);
  });

  it('names the line and status when the board was narrowed to them', () => {
    const narrowed = saved(
      buildRunsWorkbook(RUNS, {
        dateFrom: '',
        dateTo: '',
        lineName: 'L1 Clear Pack',
        statusLabel: 'Completed',
        search: ' cold ',
      }),
    );
    const rows = grid(narrowed, TOTALS_SHEET_NAME);

    expect(rows).toContainEqual(['Dates', 'All dates']);
    expect(rows).toContainEqual(['Line', 'L1 Clear Pack']);
    expect(rows).toContainEqual(['Status', 'Completed']);
    expect(rows).toContainEqual(['Search', 'cold']);
  });
});

describe('runsExportFileName', () => {
  it('puts the company and the dates covered in the name', () => {
    expect(runsExportFileName('JIVO_OIL', '2026-09-01', '2026-09-26', '2026-09-26')).toBe(
      'production_jivo_oil_2026-09-01_to_2026-09-26.xlsx',
    );
    expect(runsExportFileName('JIVO_OIL', '2026-09-25', '2026-09-25', '2026-09-26')).toBe(
      'production_jivo_oil_2026-09-25.xlsx',
    );
    expect(runsExportFileName('JIVO_OIL', '2026-09-01', '', '2026-09-26')).toBe(
      'production_jivo_oil_from_2026-09-01.xlsx',
    );
  });

  it('stamps the day an undated export was taken', () => {
    expect(runsExportFileName('JIVO_BEVERAGES', '', '', '2026-09-26')).toBe(
      'production_jivo_beverages_all_dates_2026-09-26.xlsx',
    );
    expect(runsExportFileName(undefined, '', '', '2026-09-26')).toBe(
      'production_all_dates_2026-09-26.xlsx',
    );
  });
});
