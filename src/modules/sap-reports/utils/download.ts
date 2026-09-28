import * as XLSX from 'xlsx';

import type { SapReportCell, SapReportColumn } from '../api';
import { cellNumber, cellText } from './cells';

/**
 * The workbook behind the grid's own Download.
 *
 * What comes down is what is being looked at: the rows the search and the
 * column filters left, in the order the sort put them — or only the ticked
 * ones, when any are ticked, exactly as Copy does. The Excel button above the
 * grid is a different thing: it runs the query on SAP again and exports the
 * whole result, filters and all. This one never goes back to SAP.
 *
 * Numbers go in as numbers, not as the text the cell shows, so the file totals
 * and sorts in Excel. The header row carries an autofilter, so the workbook
 * opens with the same funnel buttons the grid has.
 */
export function buildReportWorkbook({
  columns,
  rows,
  title,
}: {
  columns: SapReportColumn[];
  rows: SapReportCell[][];
  /** The report's name, which becomes the tab's. */
  title: string;
}): XLSX.WorkBook {
  const headers = columns.map((column) => column.label);
  const body = rows.map((row) =>
    columns.map((column, index) =>
      column.type === 'number' ? cellNumber(row[index]) : cellText(row[index], column) || null,
    ),
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);

  worksheet['!cols'] = columns.map((column, index) => ({
    wch:
      Math.min(
        48,
        Math.max(column.label.length, ...rows.map((row) => cellText(row[index], column).length)),
      ) + 2,
  }));
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: Math.max(0, columns.length - 1), r: Math.max(1, body.length) },
    }),
  };

  const workbook = XLSX.utils.book_new();
  // Excel refuses a tab name longer than 31 characters, or one carrying any of
  // : \ / ? * [ ] — so a report's name is trimmed to fit rather than failing
  // the download.
  const tab = title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Report';
  XLSX.utils.book_append_sheet(workbook, worksheet, tab);
  return workbook;
}

/**
 * `Pending Dispatch` → `pending-dispatch-20260822-1431.xlsx`, the same shape
 * the server gives its own export, so the two sit together in Downloads.
 */
export function reportFilename(title: string, now = new Date()): string {
  const stem =
    title
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'sap-report';
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${stem}-${stamp}.xlsx`;
}

/**
 * Hand the rows over as a file.
 *
 * Kept apart from the building above so the shape of the file can be proved
 * in a test — `XLSX.writeFile` reaches for the filesystem.
 */
export function downloadReportRows(args: {
  columns: SapReportColumn[];
  rows: SapReportCell[][];
  title: string;
}) {
  XLSX.writeFile(buildReportWorkbook(args), reportFilename(args.title));
}
