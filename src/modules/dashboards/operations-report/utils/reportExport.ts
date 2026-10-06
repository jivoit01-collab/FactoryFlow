/**
 * The report as a workbook: the days first — what "Day by day" draws, as
 * figures — then the period's breakdowns, a sheet each.
 *
 * Built from the same `OperationsReport` the page draws, so a sheet can never
 * disagree with the screen it was exported from. Numbers go in as numbers with
 * an Excel format, never as the page's formatted strings, so the sheet adds up.
 * An unknown figure is an empty cell — never a zero, the page's own rule.
 */

import * as XLSX from 'xlsx';

import type { OperationsReport, ReportSection, ReportTotals } from '../types';
import { SECTION_LABEL, sectionGap } from './sections';

type Cell = string | number | null;

/** Excel's number formats for the kinds of figure the report has. */
const FORMAT = {
  whole: '#,##0',
  rupees: '#,##0',
  perLitre: '0.00',
  decimal: '#,##0.0',
} as const;

interface Column<T> {
  header: string;
  value: (row: T) => Cell;
  format?: string;
}

interface SheetSpec<T> {
  name: string;
  /** What the rows are, under the title. */
  note: string;
  columns: Column<T>[];
  rows: T[];
  /** The totals line, if the sheet has one. */
  total?: T;
}

/** A sheet's table worked out: its cells, and each column's number format. */
export interface Table {
  name: string;
  note: string;
  header: string[];
  body: Cell[][];
  formats: (string | undefined)[];
}

/**
 * A figure as it goes in a cell: to the paisa, and a cost per litre to four
 * places — so a sum of thirty days reads as the month, not 24999.90000000002.
 */
function cellOf(value: Cell, format: string | undefined): Cell {
  if (typeof value !== 'number') return value;
  const scale = format === FORMAT.perLitre ? 1e4 : 1e2;
  return Math.round(value * scale) / scale;
}

function table<T>(spec: SheetSpec<T>): Table {
  return {
    name: spec.name,
    note: spec.note,
    header: spec.columns.map((column) => column.header),
    body: [...spec.rows, ...(spec.total ? [spec.total] : [])].map((row) =>
      spec.columns.map((column) => cellOf(column.value(row), column.format)),
    ),
    formats: spec.columns.map((column) => column.format),
  };
}

/** Labour, salary, power and wastage spent; null if any is unknown. */
export function spendOf(totals: ReportTotals): number | null {
  const parts = [totals.labourCost, totals.salaryCost, totals.powerCost, totals.wastageValue];
  return parts.every((part) => part !== null)
    ? parts.reduce<number>((sum, part) => sum + (part ?? 0), 0)
    : null;
}

/** The period in a file name: `2026-09` for a month, `2026-09-14` for a day. */
export function reportFileName(report: OperationsReport): string {
  const span = report.view === 'month' ? report.from.slice(0, 7) : report.from;
  return `operations_report_${report.company.code}_${span}.xlsx`;
}

/** Rows above the table: the title, what the rows are, and a blank line. */
export const TABLE_HEADER_ROW = 3;

function sheetOf(title: string, { header, body, formats, note }: Table): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet([[title], [note], [], header, ...body]);

  formats.forEach((format, column) => {
    if (!format) return;
    body.forEach((_, offset) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: TABLE_HEADER_ROW + 1 + offset, c: column })];
      if (cell && cell.t === 'n') cell.z = format;
    });
  });

  sheet['!cols'] = header.map((name, column) => ({
    wch:
      Math.max(
        name.length,
        ...body.map((row) => {
          const value = row[column];
          return typeof value === 'number'
            ? value.toFixed(0).length + 4
            : String(value ?? '').length;
        }),
      ) + 2,
  }));
  return sheet;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return DAY_NAMES[new Date(year, month - 1, day, 12).getDay()];
}

type DayRow = ReportTotals & { date: string | null };

/** One row a day, every head and its cost per litre, and the span's total under them. */
export function daySheet(report: OperationsReport): Table {
  const money = (header: string, pick: (row: DayRow) => number | null): Column<DayRow> => ({
    header,
    value: pick,
    format: FORMAT.rupees,
  });
  const perLitre = (header: string, pick: (row: DayRow) => number | null): Column<DayRow> => ({
    header,
    value: pick,
    format: FORMAT.perLitre,
  });

  return table<DayRow>({
    name: 'Day by day',
    note:
      report.view === 'day'
        ? 'The fortnight to the day shown. Blank = not known (not zero). People: on the total line, a daily average.'
        : 'Each day of the month. Blank = not known (not zero). People: on the total line, a daily average.',
    columns: [
      { header: 'Date', value: (row) => row.date ?? 'Total' },
      { header: 'Day', value: (row) => (row.date ? weekday(row.date) : null) },
      { header: 'Litres', value: (row) => row.litres, format: FORMAT.whole },
      { header: 'Cases', value: (row) => row.cases, format: FORMAT.whole },
      { header: 'Runs', value: (row) => row.runs, format: FORMAT.whole },
      money('Wastage (₹)', (row) => row.wastageValue),
      { header: 'People', value: (row) => row.heads, format: FORMAT.decimal },
      money('Labour (₹)', (row) => row.labourCost),
      money('Salary (₹)', (row) => row.salaryCost),
      { header: 'kWh', value: (row) => row.kwh, format: FORMAT.whole },
      money('Electricity (₹)', (row) => row.powerCost),
      money('Total cost (₹)', spendOf),
      perLitre('Labour ₹/L', (row) => row.perLitre.labour),
      perLitre('Salary ₹/L', (row) => row.perLitre.salary),
      perLitre('Electricity ₹/L', (row) => row.perLitre.power),
      perLitre('Wastage ₹/L', (row) => row.perLitre.wastage),
      perLitre('Cost ₹/L', (row) => row.perLitre.total),
      { header: 'kWh per KL', value: (row) => row.kwhPerKl, format: FORMAT.decimal },
      { header: 'GR returns', value: (row) => row.grReturns, format: FORMAT.whole },
      { header: 'GR pieces', value: (row) => row.grQuantity, format: FORMAT.whole },
      money('GR value (₹)', (row) => row.grValue),
    ],
    rows: report.daily,
    total: { ...report.dailyTotals, date: null },
  });
}

/** The period's breakdowns, one sheet each; a section that was not read has none. */
export function breakdownSheets(report: OperationsReport): Table[] {
  const { breakdown, totals } = report;
  const month = report.view === 'month';
  const perLitre = (value: number) =>
    totals.litres !== null && totals.litres > 0 ? value / totals.litres : null;
  const sheets: Table[] = [];

  if (breakdown.lines) {
    sheets.push(
      table<{ line: string; runs: Cell; cases: Cell; litres: Cell }>({
        name: 'By line',
        note: "Cases off each line's runs, in litres where the run knows its pack size.",
        columns: [
          { header: 'Line', value: (row) => row.line },
          { header: 'Runs', value: (row) => row.runs, format: FORMAT.whole },
          { header: 'Cases', value: (row) => row.cases, format: FORMAT.whole },
          { header: 'Litres', value: (row) => row.litres, format: FORMAT.whole },
        ],
        rows: breakdown.lines,
        total: { line: 'Total', runs: totals.runs, cases: totals.cases, litres: totals.litres },
      }),
    );
  }

  if (breakdown.wastage) {
    sheets.push(
      table<{
        item: string;
        quantity: Cell;
        unit: Cell;
        value: Cell;
        perLitre: Cell;
        unpriced: Cell;
      }>({
        name: 'Wastage',
        note: "Packing material booked as waste, dated by its run and valued at that run's SAP price.",
        columns: [
          { header: 'Material', value: (row) => row.item },
          { header: 'Quantity', value: (row) => row.quantity, format: FORMAT.decimal },
          { header: 'Unit', value: (row) => row.unit },
          { header: 'Value (₹)', value: (row) => row.value, format: FORMAT.rupees },
          { header: '₹/L', value: (row) => row.perLitre, format: FORMAT.perLitre },
          { header: 'Rows unpriced', value: (row) => row.unpriced, format: FORMAT.whole },
        ],
        rows: breakdown.wastage.map((row) => ({ ...row, perLitre: perLitre(row.value) })),
        total: {
          item: 'Total',
          quantity: null,
          unit: null,
          value: totals.wastageValue,
          perLitre: totals.perLitre.wastage,
          unpriced: totals.wastageUnpriced,
        },
      }),
    );
  }

  if (breakdown.labour) {
    sheets.push(
      table<{
        group: string;
        heads: Cell;
        day_shift: Cell;
        night_shift: Cell;
        cost: Cell;
      }>({
        name: 'Labour',
        note: month
          ? 'Contract labour through the gate, people averaged per day; cost at the Cost Master rate.'
          : 'Contract labour through the gate, by contractor and shift; cost at the Cost Master rate.',
        columns: [
          { header: 'Contractor', value: (row) => row.group },
          {
            header: month ? 'People a day' : 'People',
            value: (row) => row.heads,
            format: FORMAT.decimal,
          },
          { header: 'Day shift', value: (row) => row.day_shift, format: FORMAT.decimal },
          { header: 'Night shift', value: (row) => row.night_shift, format: FORMAT.decimal },
          { header: 'Cost (₹)', value: (row) => row.cost, format: FORMAT.rupees },
        ],
        rows: breakdown.labour,
        total: {
          group: 'Total',
          heads: totals.heads,
          day_shift: null,
          night_shift: null,
          cost: totals.labourCost,
        },
      }),
    );
  }

  if (breakdown.salary) {
    sheets.push(
      table<{ department: string; monthly: Cell; cost: Cell; perLitre: Cell }>({
        name: 'Salary',
        note: "Staff on the payroll, by department: the month's bill at the Cost Master salary rate, spread over its days.",
        columns: [
          { header: 'Department', value: (row) => row.department },
          { header: 'A month (₹)', value: (row) => row.monthly, format: FORMAT.rupees },
          {
            header: month ? 'This month (₹)' : 'This day (₹)',
            value: (row) => row.cost,
            format: FORMAT.rupees,
          },
          { header: '₹/L', value: (row) => row.perLitre, format: FORMAT.perLitre },
        ],
        rows: breakdown.salary.map((row) => ({ ...row, perLitre: perLitre(row.cost) })),
        total: {
          department: 'Total',
          monthly: totals.salaryMonthly,
          cost: totals.salaryCost,
          perLitre: totals.perLitre.salary,
        },
      }),
    );
  }

  if (breakdown.power) {
    sheets.push(
      table<{ area: string; kwh: Cell; cost: Cell }>({
        name: 'Electricity',
        note: "This company's share of each meter's own units (reading less sub-meters).",
        columns: [
          { header: 'Meter', value: (row) => row.area },
          { header: 'kWh', value: (row) => row.kwh, format: FORMAT.whole },
          { header: 'Cost (₹)', value: (row) => row.cost, format: FORMAT.rupees },
        ],
        rows: breakdown.power,
        total: { area: 'Total', kwh: totals.kwh, cost: totals.powerCost },
      }),
    );
  }

  if (breakdown.returns) {
    sheets.push(
      table<{
        label: string;
        returns: Cell;
        numbers: Cell;
        quantity: Cell;
        value: Cell;
        unpriced: Cell;
      }>({
        name: 'Goods Return',
        note: 'Customer returns by the day the truck arrived, valued at the invoice price; not part of the cost per litre.',
        columns: [
          { header: 'Condition', value: (row) => row.label },
          { header: 'Returns', value: (row) => row.returns, format: FORMAT.whole },
          { header: 'GR numbers', value: (row) => row.numbers },
          { header: 'Pieces', value: (row) => row.quantity, format: FORMAT.whole },
          { header: 'Value (₹)', value: (row) => row.value, format: FORMAT.rupees },
          { header: 'Lines unpriced', value: (row) => row.unpriced, format: FORMAT.whole },
        ],
        rows: breakdown.returns.map((row) => ({
          label: row.label,
          returns: row.entries.length,
          numbers: row.entries.join(', '),
          quantity: row.quantity,
          value: row.value,
          unpriced: row.unpriced,
        })),
        total: {
          label: 'Total',
          returns: totals.grReturns,
          numbers: null,
          quantity: totals.grQuantity,
          value: totals.grValue,
          unpriced: totals.grUnpriced,
        },
      }),
    );
  }

  return sheets;
}

const SECTIONS: ReportSection[] = ['production', 'wastage', 'labour', 'salary', 'power', 'returns'];

/**
 * The whole workbook. `periodLabel` is what the page heads the report with —
 * "September 2026" — so the sheet says the same thing.
 */
export function buildReportWorkbook(report: OperationsReport, periodLabel: string): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const title = `Operations Report · ${report.company.name} · ${periodLabel}`;

  const days = daySheet(report);
  // Said on the first sheet, which is the one everybody opens: a blank column
  // is otherwise indistinguishable from a register nobody filled in.
  const missing = SECTIONS.map((section) => {
    const gap = sectionGap(report.meta, section);
    return gap ? `${SECTION_LABEL[section]}: ${gap.toLowerCase()}` : null;
  }).filter(Boolean);
  if (missing.length) days.note = `${days.note} ${missing.join('; ')}.`;

  XLSX.utils.book_append_sheet(workbook, sheetOf(title, days), days.name);
  for (const sheet of breakdownSheets(report)) {
    XLSX.utils.book_append_sheet(workbook, sheetOf(title, sheet), sheet.name);
  }
  return workbook;
}
