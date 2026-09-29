/**
 * Oil Stock as a spreadsheet, laid out as EXIM's was: a title, the stage
 * headings over their vendors, each oil by its short code, a subtotal and a
 * blank row under every group, and the totals.
 *
 * EXIM's sheet was coloured cell by cell with a styling build of the library;
 * this app ships the plain one, so the layout is kept and the colours are not.
 * Numbers go in as numbers (blank for nothing), so the sheet still adds up.
 */
import * as XLSX from 'xlsx';

import { todayISO } from '../../utils';
import { fromKg, fromLitres, type OilUnit, roundTo, shortCode, UNIT_SHORT } from './oilUnits';
import { type MatrixGroup, type MatrixLine, sumKeys, type Sums, totalIn } from './stockMatrix';

export interface OilStockExport {
  lines: MatrixLine[];
  groups: MatrixGroup[];
  totals: Sums;
  showTank: boolean;
  showOutside: boolean;
  byVendor: boolean;
  unit: OilUnit;
  rounded: boolean;
  /** "Vendor: ADANI WILMAR", to say what the sheet was narrowed to. */
  narrowedTo?: string;
}

type Cell = string | number;

export function exportOilStock({
  lines,
  groups,
  totals,
  showTank,
  showOutside,
  byVendor,
  unit,
  rounded,
  narrowedTo,
}: OilStockExport) {
  const keys = groups.flatMap((group) => group.sourceKeys);
  const columns = groups.flatMap((group) => group.columns);
  const lead = 2 + (showTank ? 1 : 0) + (showOutside ? 1 : 0);
  const width = lead + columns.length + 1;
  const u = UNIT_SHORT[unit];
  const today = todayISO().split('-').reverse().join('-');

  const value = (n: number): Cell => {
    const v = roundTo(n, rounded);
    return v === 0 ? '' : v;
  };

  const figures = (sums: Sums): Cell[] => [
    ...(showTank ? [value(fromLitres(sums.tankL, unit))] : []),
    ...(showOutside ? [value(fromKg(sums.outsideKg, unit))] : []),
    ...columns.map((column) => value(fromKg(sumKeys(sums.values, column.sourceKeys), unit))),
    value(totalIn(unit, sums, keys)),
  ];

  const rows: Cell[][] = [];
  rows.push([`Oil stock — ${u} — ${today}${narrowedTo ? ` — ${narrowedTo}` : ''}`]);

  const heading: Cell[] = ['Code', 'Oil'];
  if (showTank) heading.push(`In tank (${u})`);
  if (showOutside) heading.push(`Outside factory (${u})`);
  for (const group of groups) {
    heading.push(group.label);
    for (let i = 1; i < group.columns.length; i += 1) heading.push('');
  }
  heading.push(`Total (${u})`);
  rows.push(heading);

  const vendors: Cell[] = new Array(lead).fill('');
  for (const column of columns) vendors.push(byVendor ? column.label : '');
  vendors.push('');
  rows.push(vendors);

  const numberRows: number[] = [];
  for (const line of lines) {
    if (line.kind === 'oil') {
      numberRows.push(rows.length);
      rows.push([
        shortCode(line.oil.code),
        line.oil.name,
        ...figures({
          tankL: line.oil.tankL,
          outsideKg: line.oil.outsideKg,
          values: line.oil.values,
        }),
      ]);
    } else {
      numberRows.push(rows.length);
      rows.push(['Subtotal', '', ...figures(line.sums)]);
      rows.push(new Array(width).fill(''));
    }
  }

  const totalRow = rows.length;
  numberRows.push(totalRow);
  rows.push(['Total', '', ...figures(totals)]);

  // EXIM's grand total carried one figure per stage, across its vendors.
  const byStage = byVendor && groups.some((group) => group.columns.length > 1);
  const stageRow = rows.length;
  if (byStage) {
    const cells: Cell[] = ['By stage', '', ...new Array(lead - 2).fill('')];
    for (const group of groups) {
      cells.push(value(fromKg(sumKeys(totals.values, group.sourceKeys), unit)));
      for (let i = 1; i < group.columns.length; i += 1) cells.push('');
    }
    cells.push('');
    numberRows.push(stageRow);
    rows.push(cells);
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: width - 1 } }];
  // The fixed headings stand over both header rows.
  for (let c = 0; c < lead; c += 1) merges.push({ s: { r: 1, c }, e: { r: 2, c } });
  merges.push({ s: { r: 1, c: width - 1 }, e: { r: 2, c: width - 1 } });
  let cursor = lead;
  for (const group of groups) {
    const span = group.columns.length;
    if (span > 1) {
      merges.push({ s: { r: 1, c: cursor }, e: { r: 1, c: cursor + span - 1 } });
      if (byStage)
        merges.push({ s: { r: stageRow, c: cursor }, e: { r: stageRow, c: cursor + span - 1 } });
    } else if (!byVendor) {
      merges.push({ s: { r: 1, c: cursor }, e: { r: 2, c: cursor } });
    }
    cursor += span;
  }
  sheet['!merges'] = merges;

  sheet['!cols'] = [
    { wch: 12 },
    { wch: 30 },
    ...new Array(lead - 2).fill({ wch: 16 }),
    ...columns.map(() => ({ wch: 18 })),
    { wch: 14 },
  ];

  const format = rounded ? '#,##0' : '#,##0.000';
  for (const r of numberRows) {
    for (let c = 2; c < width; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = format;
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Oil stock');
  XLSX.writeFile(workbook, `oil-stock-${todayISO()}.xlsx`);
}
