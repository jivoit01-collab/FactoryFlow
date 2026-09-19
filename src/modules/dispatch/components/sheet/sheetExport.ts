import * as XLSX from 'xlsx';

import type { DispatchSheetRow } from '../../types/sheet.types';
import type { SheetColumn } from './sheetColumns';

/**
 * The workbook behind the download.
 *
 * What comes down is what is being looked at: the columns of the tab that is
 * open, the rows that survived the column filters, in the order they are
 * sorted. Anything else would be a surprise — somebody who has filtered to one
 * transporter and one week is downloading that week, not the month behind it.
 *
 * Numbers go in as numbers, not as the text the cell shows, so the file totals
 * and sorts in Excel. The header row carries an autofilter, so the workbook
 * opens with the same funnel buttons this page has.
 */
export function buildSheetWorkbook({
  rows,
  columns,
  sheet,
}: {
  rows: DispatchSheetRow[];
  columns: SheetColumn[];
  /** The tab's own name — the company whose sheet this is. */
  sheet: string;
}): XLSX.WorkBook {
  const body = rows.map((row) => {
    const line: Record<string, string | number | null> = {};
    for (const column of columns) {
      line[column.label] = column.number
        ? (column.number(row) ?? null)
        : column.value(row);
    }
    return line;
  });

  const headers = columns.map((column) => column.label);
  // aoa first, so an empty selection still downloads a sheet with its headings
  // rather than a blank file that looks like a failure.
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  if (body.length > 0) {
    XLSX.utils.sheet_add_json(worksheet, body, { origin: 'A2', skipHeader: true, header: headers });
  }

  worksheet['!cols'] = columns.map((column) => ({
    wch:
      Math.min(
        48,
        Math.max(
          column.label.length,
          ...rows.map((row) => column.value(row).length),
        ),
      ) + 2,
  }));
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: Math.max(0, columns.length - 1), r: Math.max(1, body.length) },
    }),
  };

  const workbook = XLSX.utils.book_new();
  // Excel refuses a tab name longer than 31 characters, or one carrying any
  // of : \ / ? * [ ] -- so a company name is trimmed to fit rather than
  // failing the download.
  const tab = sheet.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';
  XLSX.utils.book_append_sheet(workbook, worksheet, tab);
  return workbook;
}

/**
 * Hand the sheet over as a file, named for the tab and the window it covers.
 *
 * The writing is separated from the building above so the shape of the file
 * can be proved in a test -- `XLSX.writeFile` reaches for the filesystem and
 * cannot be stood in for, being an ES module's own export.
 */
export function downloadSheet(args: {
  rows: DispatchSheetRow[];
  columns: SheetColumn[];
  sheet: string;
  dateFrom: string;
  dateTo: string;
}) {
  XLSX.writeFile(
    buildSheetWorkbook(args),
    `Dispatch Sheet ${args.sheet} ${args.dateFrom} to ${args.dateTo}.xlsx`,
  );
}
