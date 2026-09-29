/**
 * The Director Inventory as EXIM's "Oil status" sheet: a title with the date,
 * a line per stage in litres and tonnes, and the total. Plain, where EXIM's was
 * painted navy: this app ships the unstyled spreadsheet library.
 */
import * as XLSX from 'xlsx';

import { todayISO } from '../../utils';

export interface DirectorSheetRow {
  label: string;
  litres: number;
  mt: number;
  /** Nothing to report (SAP did not answer): the row is left blank. */
  missing?: boolean;
}

export function exportDirectorInventory(
  rows: DirectorSheetRow[],
  total: { litres: number; mt: number },
  note?: string,
) {
  const day = todayISO().split('-').reverse().join('-');
  const blank = (n: number, missing?: boolean) => (missing || !(n > 0) ? '' : n);

  const aoa: (string | number)[][] = [
    [`OIL STATUS ${day}`, '', ''],
    ['STATUS', 'IN LTR', 'IN MTS'],
    ...rows.map((row) => [
      row.label.toUpperCase(),
      blank(row.litres, row.missing),
      blank(row.mt, row.missing),
    ]),
    ['TOTAL', total.litres, total.mt],
  ];
  if (note) aoa.push([], [note]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  sheet['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }];

  const last = rows.length + 2;
  for (let r = 2; r <= last; r += 1) {
    const litres = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
    const mt = sheet[XLSX.utils.encode_cell({ r, c: 2 })];
    if (litres?.t === 'n') litres.z = '#,##0';
    if (mt?.t === 'n') mt.z = '#,##0.000';
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, `Oil status ${day}`.slice(0, 31));
  XLSX.writeFile(workbook, `director-inventory-${todayISO()}.xlsx`);
}
