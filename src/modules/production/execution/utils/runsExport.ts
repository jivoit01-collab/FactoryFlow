import * as XLSX from 'xlsx';

import { formatDateTime } from '@/shared/utils';

import type { LiveStatus, ProductionRun } from '../types';
import {
  dateRangeLabel,
  type ProductionGroup,
  runLitres,
  runProducedCases,
  summariseProduction,
} from './runProduction';

export const RUNS_SHEET_NAME = 'Runs';
export const TOTALS_SHEET_NAME = 'Totals';

const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
  DRAFT: 'Draft',
  RUNNING: 'Running',
  BREAKDOWN: 'Breakdown',
  STOPPED: 'Stopped',
  COMPLETED: 'Completed',
};

/** A remark can run to a paragraph; past this the column just gets in the way. */
const MAX_COLUMN_WIDTH = 60;

/** Null is an empty cell; an empty string would be a text cell Excel's "Blanks" filter misses. */
type Cell = string | number | null;
type ExportRow = Record<string, Cell>;

/** A decimal string as a number a sheet can add up, or a blank. */
const num = (value: string | null | undefined): Cell => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Whether a run's cases are its final count or what its segments have logged so far. */
function countedAs(run: ProductionRun, cases: number): string | null {
  if (run.status === 'COMPLETED') return 'Final count';
  return cases > 0 ? 'So far' : null;
}

function runRow(run: ProductionRun): ExportRow {
  const cases = runProducedCases(run);
  const litres = runLitres(run, cases);
  const row: ExportRow = {
    'Run #': run.run_number,
    Date: run.date,
    Product: run.product,
    'Item Code': run.item_code,
    Line: run.line_name,
    Status: LIVE_STATUS_LABELS[run.live_status] ?? run.live_status ?? run.status,
    Cases: cases,
    'Counted As': countedAs(run, cases),
    'Pcs / Case': run.pieces_per_case ?? null,
    'Litres / Pc': num(run.litres_per_piece),
    Litres: litres == null ? null : Math.round(litres * 1000) / 1000,
    'Required Qty': num(run.required_qty),
    Rejected: num(run.rejected_qty),
    'SAP Entry': run.sap_doc_entry ?? null,
    Supervisor: run.supervisor,
    Created: run.created_at ? formatDateTime(run.created_at) : null,
    Remark: run.planning_remark,
  };
  for (const key of Object.keys(row)) if (row[key] === '') row[key] = null;
  return row;
}

function widths(rows: Cell[][]): XLSX.ColInfo[] {
  const columns = Math.max(0, ...rows.map((row) => row.length));
  return Array.from({ length: columns }, (_, i) => ({
    wch: Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(...rows.map((row) => String(row[i] ?? '').length)) + 2,
    ),
  }));
}

function runsSheet(runs: ProductionRun[]): XLSX.WorkSheet {
  const rows = runs.map(runRow);
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const header = Object.keys(rows[0]);
    sheet['!cols'] = widths([header, ...rows.map((row) => header.map((key) => row[key]))]);
  }
  return sheet;
}

export interface RunsExportScope {
  dateFrom: string;
  dateTo: string;
  /** The line picked on the board; empty for every line. */
  lineName?: string;
  /** The status picked on the board; empty for every status. */
  statusLabel?: string;
  search?: string;
  companyName?: string;
}

const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const groupRow = (label: string, group: ProductionGroup): Cell[] => [
  label,
  Math.round(group.cases * 10) / 10,
  group.runs,
  Math.round(group.litres),
];

/** The strip above the table, and what it was narrowed to, for a reader who never saw the board. */
function totalsSheet(runs: ProductionRun[], scope: RunsExportScope): XLSX.WorkSheet {
  const { completed, running, total, unsized } = summariseProduction(runs);
  const rows: Cell[][] = [
    ['Company', scope.companyName || null],
    ['Dates', capitalised(dateRangeLabel(scope.dateFrom, scope.dateTo))],
    ['Line', scope.lineName || 'All lines'],
    ['Status', scope.statusLabel || 'All statuses'],
    ['Search', scope.search?.trim() || null],
    [],
    ['', 'Cases', 'Runs', 'Litres'],
    groupRow('Total', total),
    groupRow('Completed', completed),
    groupRow('In progress (so far)', running),
    [],
    ['Runs without a litre size', unsized],
    ['Exported', formatDateTime(new Date())],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = widths(rows);
  return sheet;
}

/**
 * The board as a workbook: the runs exactly as the table lists them, and the
 * totals the strip above it shows. Drafts stay on the runs sheet — they are on
 * the board — but, as on screen, count towards nothing.
 */
export function buildRunsWorkbook(runs: ProductionRun[], scope: RunsExportScope): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, runsSheet(runs), RUNS_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, totalsSheet(runs, scope), TOTALS_SHEET_NAME);
  return workbook;
}

/** `production_jivo_oil_2026-09-01_to_2026-09-26.xlsx` — the dates the sheet covers, in its name. */
export function runsExportFileName(
  companyCode: string | undefined,
  dateFrom: string,
  dateTo: string,
  today: string,
): string {
  const company = (companyCode || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  let range: string;
  if (dateFrom && dateTo) range = dateFrom === dateTo ? dateFrom : `${dateFrom}_to_${dateTo}`;
  else if (dateFrom) range = `from_${dateFrom}`;
  else if (dateTo) range = `to_${dateTo}`;
  else range = `all_dates_${today}`;
  return ['production', company, range].filter(Boolean).join('_') + '.xlsx';
}
