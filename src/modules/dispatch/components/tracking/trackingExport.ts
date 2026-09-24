import { format } from 'date-fns';
import * as XLSX from 'xlsx';

import type { DispatchTrackingTruck } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';

/** One column of the download: its heading and what a truck puts under it. */
interface TrackingColumn {
  label: string;
  value: (truck: DispatchTrackingTruck) => string | number | null;
}

function formatted(value: string | null, pattern: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, pattern);
}

/**
 * What a truck's card on the board shows, in the order the card reads it.
 *
 * The download is the board as it is being looked at, so it names nothing the
 * card does not — dates read as the card prints them, and a blank field is a
 * blank cell rather than the card's "-". Counts go in as numbers, so the file
 * totals and sorts in Excel.
 */
export const TRACKING_COLUMNS: TrackingColumn[] = [
  { label: 'Vehicle', value: (truck) => truck.vehicle_number },
  { label: 'Arrival No', value: (truck) => truck.arrival_no },
  { label: 'Status', value: (truck) => truck.current_status_display },
  // The card's red "Late · Nd overdue" badge; blank for a truck that isn't late.
  { label: 'Days Overdue', value: (truck) => (truck.is_late ? truck.days_overdue : null) },
  { label: 'Companies', value: (truck) => truck.companies.join(', ') },
  { label: 'Reach By', value: (truck) => formatted(truck.expected_reach_date, 'dd MMM yyyy') },
  { label: 'Transporter', value: (truck) => truck.transporter_name },
  {
    label: 'Dispatched',
    value: (truck) => formatted(truck.dispatched_at, 'dd MMM yyyy, HH:mm'),
  },
  { label: 'Driver', value: (truck) => truck.driver_name },
  { label: 'Driver Mobile', value: (truck) => truck.driver_mobile },
  { label: 'Gatepass No', value: (truck) => truck.gatepass_no ?? '' },
  { label: 'Bills', value: (truck) => truck.documents.join(', ') },
  { label: 'Customers', value: (truck) => truck.customers.join(', ') },
  { label: 'Updates', value: (truck) => truck.update_count },
  {
    label: 'Last Update',
    value: (truck) => formatted(truck.last_update_at, 'dd MMM yyyy, HH:mm'),
  },
];

export const TRACKING_SHEET_NAME = 'Dispatch Tracking';

/**
 * The workbook behind the board's download: exactly the trucks on screen — the
 * page being looked at, under the filters that are set — in the board's order.
 *
 * The header row carries an autofilter, and an empty board still downloads its
 * headings rather than a blank file that looks like a failure.
 */
export function buildTrackingWorkbook(trucks: DispatchTrackingTruck[]): XLSX.WorkBook {
  const headers = TRACKING_COLUMNS.map((column) => column.label);
  // '' becomes null so an empty field is an empty cell, which Excel's
  // "(Blanks)" filter and COUNTA both see as empty.
  const body = trucks.map((truck) =>
    TRACKING_COLUMNS.map((column) => {
      const value = column.value(truck);
      return value === '' ? null : value;
    }),
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  worksheet['!cols'] = TRACKING_COLUMNS.map((column, index) => ({
    wch:
      Math.min(
        48,
        Math.max(column.label.length, ...body.map((row) => String(row[index] ?? '').length)),
      ) + 2,
  }));
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: headers.length - 1, r: Math.max(1, body.length) },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, TRACKING_SHEET_NAME);
  return workbook;
}

/**
 * The file's name: the dispatch window it covers, and — when the board runs to
 * more than one page — which page it is, so a file of 25 trucks never passes
 * for the whole window.
 */
export function trackingFileName({
  dateFrom,
  dateTo,
  page,
  totalPages,
}: {
  dateFrom: string;
  dateTo: string;
  page: number;
  totalPages: number;
}): string {
  const window = [dateFrom && `from ${dateFrom}`, dateTo && `to ${dateTo}`]
    .filter(Boolean)
    .join(' ');
  const slice = totalPages > 1 ? `page ${page} of ${totalPages}` : '';
  return `${[TRACKING_SHEET_NAME, window, slice].filter(Boolean).join(' ')}.xlsx`;
}

/**
 * Hand the board over as a file. Kept apart from the building above so the
 * file's shape can be proved in a test — `XLSX.writeFile` reaches for the
 * filesystem and cannot be stood in for.
 */
export function downloadTrackingSheet({
  trucks,
  ...name
}: {
  trucks: DispatchTrackingTruck[];
  dateFrom: string;
  dateTo: string;
  page: number;
  totalPages: number;
}) {
  XLSX.writeFile(buildTrackingWorkbook(trucks), trackingFileName(name));
}
