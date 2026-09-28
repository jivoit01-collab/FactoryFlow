import * as XLSX from 'xlsx';

import { formatDate, formatDateTime, formatTime } from '@/shared/utils';

import type { EmptyVehicleGateOutEntry } from '../api/emptyVehicleOut/emptyVehicleOut.api';
import type { VehicleEntry } from '../api/vehicle/vehicleEntry.api';

export const VEHICLES_SHEET_NAME = 'Vehicles';
export const SUMMARY_SHEET_NAME = 'Summary';

/** A remark can run to a paragraph; past this the column just gets in the way. */
const MAX_COLUMN_WIDTH = 60;

/** Null is an empty cell; an empty string would be a text cell Excel's "Blanks" filter misses. */
type Cell = string | number | null;
type ExportRow = Record<string, Cell>;

/** Words in a status code that are initials, and stay capitals. */
const INITIALS = new Set(['QC', 'QAM', 'PO']);

/** `QC_AWAITING_QAM` as `QC Awaiting QAM`. */
function statusLabel(status: string | undefined): string | null {
  if (!status) return null;
  return status
    .split('_')
    .map((word) => (INITIALS.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(' ');
}

/**
 * The moment a vehicle left. Security types the out date and time at the gate,
 * as the factory's local date and clock, so they are read as local time -- the
 * same way the page shows them.
 */
function outMoment(out: EmptyVehicleGateOutEntry): Date | null {
  const moment = new Date(`${out.gate_out_date}T${out.out_time.slice(0, 8)}`);
  return Number.isNaN(moment.getTime()) ? null : moment;
}

/** `2026-09-28` as `28-09-2026`, without a round trip through a timezone. */
function outDate(out: EmptyVehicleGateOutEntry): string {
  const [year, month, day] = out.gate_out_date.split('-');
  return `${day}-${month}-${year}`;
}

function hoursInside(inAt: Date | null, out: EmptyVehicleGateOutEntry | undefined): Cell {
  const outAt = out ? outMoment(out) : null;
  if (!inAt || !outAt) return null;
  const hours = (outAt.getTime() - inAt.getTime()) / 3_600_000;
  return hours >= 0 ? Math.round(hours * 100) / 100 : null;
}

function vehicleRow(entry: VehicleEntry, out: EmptyVehicleGateOutEntry | undefined): ExportRow {
  const inAt = entry.entry_time ? new Date(entry.entry_time) : null;
  const hasIn = inAt !== null && !Number.isNaN(inAt.getTime());
  const row: ExportRow = {
    'Entry No.': entry.entry_no,
    'Vehicle No.': entry.vehicle?.vehicle_number ?? null,
    'Vehicle Type': entry.vehicle?.vehicle_type?.name ?? null,
    Transporter: entry.vehicle?.transporter?.name ?? null,
    Driver: entry.driver?.name ?? null,
    'Driver Mobile': entry.driver?.mobile_no ?? null,
    'Supplier(s)': (entry.suppliers ?? []).map((s) => s.supplier_name).join(', '),
    Material: entry.material_type?.label ?? null,
    'In Date': hasIn ? formatDate(inAt) : null,
    'In Time': hasIn ? formatTime(inAt) : null,
    'Out Date': out ? outDate(out) : null,
    'Out Time': out ? out.out_time.slice(0, 5) : null,
    'Hours Inside': hoursInside(hasIn ? inAt : null, out),
    Status: statusLabel(entry.status),
    QC: entry.qc_final_status?.display ?? null,
    Remarks: entry.remarks ?? null,
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

function vehiclesSheet(
  entries: VehicleEntry[],
  outByEntryId: Map<number, EmptyVehicleGateOutEntry>,
): XLSX.WorkSheet {
  const rows = entries.map((entry) => vehicleRow(entry, outByEntryId.get(entry.id)));
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const header = Object.keys(rows[0]);
    sheet['!cols'] = widths([header, ...rows.map((row) => header.map((key) => row[key]))]);
  }
  return sheet;
}

export interface RawMaterialsExportScope {
  dateFrom?: string;
  dateTo?: string;
  /** The material filter as the page labels it, e.g. "RM only". */
  materialLabel?: string;
  /** The status the list was opened on, from the URL; empty for every status. */
  status?: string;
  search?: string;
  companyName?: string;
}

const isoAsDate = (iso: string) => iso.split('-').reverse().join('-');

function datesLabel(dateFrom?: string, dateTo?: string): string {
  if (dateFrom && dateTo) {
    return dateFrom === dateTo ? isoAsDate(dateFrom) : `${isoAsDate(dateFrom)} to ${isoAsDate(dateTo)}`;
  }
  if (dateFrom) return `From ${isoAsDate(dateFrom)}`;
  if (dateTo) return `Up to ${isoAsDate(dateTo)}`;
  return 'All dates';
}

/** What the list was narrowed to, and how many of its vehicles have left, for a reader who never saw the page. */
function summarySheet(
  entries: VehicleEntry[],
  outByEntryId: Map<number, EmptyVehicleGateOutEntry>,
  scope: RawMaterialsExportScope,
): XLSX.WorkSheet {
  const out = entries.filter((entry) => outByEntryId.has(entry.id)).length;
  const rows: Cell[][] = [
    ['Company', scope.companyName || null],
    ['Entry dates', datesLabel(scope.dateFrom, scope.dateTo)],
    ['Material', scope.materialLabel || 'All Materials'],
    ['Status', statusLabel(scope.status) || 'All statuses'],
    ['Search', scope.search?.trim() || null],
    [],
    ['Vehicles', entries.length],
    ['Out', out],
    ['Not marked out', entries.length - out],
    [],
    ['Exported', formatDateTime(new Date())],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = widths(rows);
  return sheet;
}

/**
 * The RM/PM gate list as a workbook: each vehicle exactly as the table lists
 * it, with the date and time it came in and the date and time it went out,
 * and a summary of what the list was filtered to.
 *
 * `outByEntryId` holds each entry's completed empty-vehicle gate-out; an entry
 * missing from it is still inside, or left without being marked out.
 */
export function buildRawMaterialsWorkbook(
  entries: VehicleEntry[],
  outByEntryId: Map<number, EmptyVehicleGateOutEntry>,
  scope: RawMaterialsExportScope,
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, vehiclesSheet(entries, outByEntryId), VEHICLES_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, summarySheet(entries, outByEntryId, scope), SUMMARY_SHEET_NAME);
  return workbook;
}

/** `rm_pm_gate_jivo_oil_2026-09-01_to_2026-09-28.xlsx` — the dates the sheet covers, in its name. */
export function rawMaterialsExportFileName(
  companyCode: string | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined,
  today: string,
): string {
  const company = (companyCode || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  let range: string;
  if (dateFrom && dateTo) range = dateFrom === dateTo ? dateFrom : `${dateFrom}_to_${dateTo}`;
  else if (dateFrom) range = `from_${dateFrom}`;
  else if (dateTo) range = `to_${dateTo}`;
  else range = `all_dates_${today}`;
  return ['rm_pm_gate', company, range].filter(Boolean).join('_') + '.xlsx';
}
