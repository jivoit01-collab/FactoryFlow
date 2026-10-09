/**
 * The report as a workbook: Summary and Item Master -- the page's two sheets --
 * then Data (every SAP line behind them) and Notes.
 *
 * Built from the same rows the page draws (`compute.ts`), so a sheet can never
 * disagree with the screen it was exported from. Figures go in as numbers with
 * an Excel format, never as the page's formatted text, so the sheet adds up.
 */

import * as XLSX from 'xlsx';

import { NOT_SET } from '../constants';
import type { DocumentLine, ProductionDispatchReport, ReportItem } from '../types';
import {
  type DayItemRow,
  dispatchShare,
  type ItemRow,
  type Measure,
  measure,
  monthsInRange,
  netPallet,
  packingTypeOf,
} from './compute';
import { rangeLabel } from './range';

type Cell = string | number | null;

const WHOLE = '#,##0';
const DECIMAL = '#,##0.00';
const FACTOR = '0.####';
const PERCENT = '0%';

interface Column<Row> {
  header: string;
  value: (row: Row) => Cell;
  format?: string;
}

function sheetOf<Row>(
  title: string,
  notes: string[],
  columns: Column<Row>[],
  rows: Row[],
): XLSX.WorkSheet {
  const header = columns.map((column) => column.header);
  const body = rows.map((row) => columns.map((column) => column.value(row)));
  const top = [[title], ...notes.map((note) => [note]), []];
  const sheet = XLSX.utils.aoa_to_sheet([...top, header, ...body]);

  columns.forEach((column, c) => {
    if (!column.format) return;
    body.forEach((_, offset) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: top.length + 1 + offset, c })];
      if (cell && cell.t === 'n') cell.z = column.format;
    });
  });
  sheet['!cols'] = header.map((name, c) => ({
    wch:
      Math.min(
        60,
        Math.max(
          name.length,
          ...body.map((row) => {
            const value = row[c];
            return typeof value === 'number'
              ? Math.round(value).toString().length + 4
              : String(value ?? '').length;
          }),
        ),
      ) + 2,
  }));
  return sheet;
}

function skuColumns<Row extends ItemRow>(): Column<Row>[] {
  const text = (header: string, pick: (item: ReportItem) => string | null): Column<Row> => ({
    header,
    value: (row) => pick(row.item) ?? NOT_SET,
  });
  return [
    text('Item No.', (item) => item.item_code),
    text('Item Description', (item) => item.item_name),
    text('VARIETY', (item) => item.variety),
    text('SUBGROUP', (item) => item.subgroup),
    text('SKU', (item) => item.sku),
    text('Packing Type', (item) => item.packing_type),
    { header: 'Pcs per Box', value: (row) => row.item.pieces_per_box, format: WHOLE },
    { header: 'Liter Factor', value: (row) => row.item.litres_per_unit, format: FACTOR },
  ];
}

function measureColumns<Row>(prefix: string, pick: (row: Row) => Measure): Column<Row>[] {
  return [
    { header: `${prefix} Qty`, value: (row) => pick(row).qty, format: WHOLE },
    { header: `${prefix} Box`, value: (row) => pick(row).box, format: WHOLE },
    { header: `${prefix} Liter`, value: (row) => pick(row).litres, format: WHOLE },
    { header: `${prefix} Ton`, value: (row) => pick(row).ton, format: DECIMAL },
    { header: `${prefix} PALLET`, value: (row) => pick(row).pallet, format: DECIMAL },
  ];
}

function flowColumns<Row extends ItemRow>(): Column<Row>[] {
  return [
    ...measureColumns<Row>('Prod', (row) => row.production),
    ...measureColumns<Row>('Dispatch', (row) => row.dispatch),
    { header: 'NET PALLET', value: (row) => netPallet(row), format: DECIMAL },
    { header: 'Dispatch / Production %', value: (row) => dispatchShare(row), format: PERCENT },
  ];
}

function tailColumns<Row extends ItemRow>(): Column<Row>[] {
  return [
    { header: 'MOVEMENT', value: (row) => row.item.movement },
    { header: 'Group Qty (not counted)', value: (row) => row.groupDispatch.qty, format: WHOLE },
  ];
}

export function reportFileName(report: ProductionDispatchReport): string {
  return `production_dispatch_oil_${report.from}_${report.to}.xlsx`;
}

export function buildWorkbook(
  report: ProductionDispatchReport,
  days: DayItemRow[],
  items: ItemRow[],
  lines: DocumentLine[],
): XLSX.WorkBook {
  const { settings } = report;
  const period = `Period: ${rangeLabel(report)}   |   Jivo Oil   |   PALLET = Liter / ${settings.pallet_litres}`;
  const movement = `MOVEMENT = FAST / SLOW over the ${settings.movement_window_days} days ${report.movement_window.from} to ${report.movement_window.to}. Group companies' purchases are not counted.`;
  const months = monthsInRange(report);
  const window = settings.movement_window_days;
  const windowMonths = window / settings.month_days;
  const book = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    book,
    sheetOf<DayItemRow>(
      'Summary — SKU by day',
      [period, movement],
      [
        { header: 'Date', value: (row) => row.date },
        ...skuColumns<DayItemRow>(),
        ...flowColumns<DayItemRow>(),
        ...tailColumns<DayItemRow>(),
      ],
      days,
    ),
    'Summary',
  );

  XLSX.utils.book_append_sheet(
    book,
    sheetOf<ItemRow>(
      'Item Master',
      [period, movement],
      [
        ...skuColumns<ItemRow>(),
        ...flowColumns<ItemRow>(),
        {
          header: 'Avg Monthly Dispatch PALLET',
          value: (row) => (months > 0 ? row.dispatch.pallet / months : 0),
          format: DECIMAL,
        },
        {
          header: `Avg Monthly Prod Qty (${window} d)`,
          value: (row) => row.item.window_production / windowMonths,
          format: WHOLE,
        },
        {
          header: `Avg Daily Dispatch Qty (${window} d)`,
          value: (row) => row.item.window_dispatch / window,
          format: WHOLE,
        },
        { header: 'Days to Dispatch', value: (row) => row.item.days_to_dispatch, format: WHOLE },
        ...tailColumns<ItemRow>(),
      ],
      items,
    ),
    'Item Master',
  );

  const byCode = new Map(report.items.map((item) => [item.item_code, item]));
  const figures = (line: DocumentLine) => {
    const item = byCode.get(line.item_code);
    return item ? measure(line.quantity, item, settings) : null;
  };
  XLSX.utils.book_append_sheet(
    book,
    sheetOf<DocumentLine>(
      'Data — every production and dispatch line',
      [period, 'Counted = No: a sale to a group company, left out of every figure.'],
      [
        {
          header: 'Transaction',
          value: (line) => (line.kind === 'PRODUCTION' ? 'Production' : 'Dispatch'),
        },
        { header: 'Doc Type', value: (line) => line.doc_type },
        { header: 'DocDate', value: (line) => line.date },
        { header: 'DocNum', value: (line) => line.doc_num },
        { header: 'Customer Code', value: (line) => line.card_code },
        { header: 'Customer Name', value: (line) => line.card_name },
        { header: 'Warehouse', value: (line) => line.warehouse },
        { header: 'Item No.', value: (line) => line.item_code },
        { header: 'Item Description', value: (line) => line.item_name },
        { header: 'Quantity', value: (line) => line.quantity, format: WHOLE },
        { header: 'Box', value: (line) => figures(line)?.box ?? null, format: WHOLE },
        { header: 'Liter', value: (line) => figures(line)?.litres ?? null, format: WHOLE },
        { header: 'Ton', value: (line) => figures(line)?.ton ?? null, format: DECIMAL },
        { header: 'PALLET', value: (line) => figures(line)?.pallet ?? null, format: DECIMAL },
        {
          header: 'Packing Type',
          value: (line) => {
            const item = byCode.get(line.item_code);
            return item ? packingTypeOf(item) : null;
          },
        },
        { header: 'Counted', value: (line) => (line.is_group ? 'No — group company' : 'Yes') },
      ],
      lines,
    ),
    'Data',
  );

  const notes: [string, Cell, string][] = [
    ['Pallet capacity (Liters)', settings.pallet_litres, 'PALLET = Liter / this'],
    ['Period start', report.from, ''],
    ['Period end', report.to, ''],
    ['Months in period', months, `Days in the period / ${settings.month_days}`],
    [
      'FAST if days to dispatch ≤',
      settings.fast_days,
      'A month of production dispatched within this many days',
    ],
    [
      'Movement window (days)',
      window,
      `${report.movement_window.from} to ${report.movement_window.to}`,
    ],
    ['Oil density (kg per liter)', settings.oil_density, 'Ton = Liter × density / 1000 (net oil)'],
    [
      'Source',
      null,
      'SAP B1 HANA, Jivo Oil; FG items with U_IsLitre = Y; cancelled documents left out',
    ],
    ['Production', null, 'Receipts from production (OIGN) against standard production orders'],
    [
      'Dispatch',
      null,
      'Deliveries (ODLN) + A/R invoices (OINV, items, not reserve) not copied from a delivery',
    ],
    [
      'Not counted',
      null,
      'Sales to group companies (Jivo Mart and the others); stock transfers to own depots',
    ],
    [
      'Classification',
      null,
      'VARIETY = U_Sub_Group, SUBGROUP = U_Variety, SKU = U_SKU, Packing Type = U_Packing_Type (HDFPE read as HDPE)',
    ],
    ['Units', null, 'Box = Quantity / SalFactor2; Liter = Quantity × SalPackUn'],
    [
      'Days to Dispatch',
      null,
      'Avg Monthly Production ÷ Avg Daily Dispatch over the movement window; dispatched but not produced = FAST; not dispatched = SLOW',
    ],
  ];
  XLSX.utils.book_append_sheet(
    book,
    sheetOf<[string, Cell, string]>(
      'Production & Dispatch — Parameters & Notes',
      [],
      [
        { header: 'Parameter', value: (row) => row[0] },
        { header: 'Value', value: (row) => row[1], format: FACTOR },
        { header: 'Note', value: (row) => row[2] },
      ],
      notes,
    ),
    'Notes',
  );

  return book;
}
