import * as XLSX from 'xlsx';

import { formatDate, formatDateTimeShort } from '@/shared/utils';

import { RETURNABLE_STATUS_LABELS } from '../constants/returnable.constants';
import type { ReturnableGatePassListItem } from '../types';

type Cell = string | number;

/** A date as the screen writes it, or blank. */
const day = (value: string | null) => (value ? formatDate(value) : '');

/** A date and time, or blank. */
const moment = (value: string | null) => (value ? formatDateTimeShort(value) : '');

/** A quantity as a number, so the sheet can total it. */
const quantity = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

interface ReturnableColumn {
  label: string;
  value: (pass: ReturnableGatePassListItem) => Cell;
}

/**
 * The register's columns, in the order the screen shows them, then the ones a
 * sheet has room for: it is read by somebody who cannot open the pass, so it
 * also says who the material went to and when it left and came back.
 */
export const RETURNABLE_EXPORT_COLUMNS: ReturnableColumn[] = [
  { label: 'Pass No', value: (p) => p.pass_no },
  { label: 'Type', value: (p) => (p.is_returnable ? 'Returnable' : 'Non-returnable') },
  { label: 'Status', value: (p) => RETURNABLE_STATUS_LABELS[p.status] ?? p.status_display },
  // Overdue is a flag beside the status, not a status of its own.
  { label: 'Days Overdue', value: (p) => (p.is_overdue ? p.days_overdue : '') },
  { label: 'Purpose', value: (p) => p.purpose_display },
  { label: 'Going To', value: (p) => p.destination },
  { label: 'Item Name', value: (p) => p.item_names },
  { label: 'Items', value: (p) => p.item_count },
  // Nothing is pending on a non-returnable pass; the screen shows a dash.
  { label: 'Pending Qty', value: (p) => (p.is_returnable ? quantity(p.pending_return_qty) : '') },
  { label: 'Expected Back', value: (p) => day(p.expected_return_date) },
  { label: 'Raised By', value: (p) => p.created_by_name },
  { label: 'Raised On', value: (p) => moment(p.created_at) },
  { label: 'Department', value: (p) => p.department_name },
  { label: 'Party', value: (p) => p.party_name },
  { label: 'Recipient', value: (p) => p.recipient_name },
  { label: 'Material Indent', value: (p) => p.material_indent_no },
  { label: 'Gate Out', value: (p) => moment(p.gate_out_at) },
  { label: 'Last Return', value: (p) => moment(p.last_return_at) },
];

/** The workbook: one row per gate pass, as filtered on screen. */
export function buildReturnableWorkbook(passes: ReturnableGatePassListItem[]): XLSX.WorkBook {
  const columns = RETURNABLE_EXPORT_COLUMNS;
  const rows = passes.map((pass) =>
    Object.fromEntries(columns.map((column) => [column.label, column.value(pass) ?? ''])),
  );

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: columns.map((column) => column.label),
  });
  // Item names are a comma-joined list and can run long; cap the width so
  // one pass with twenty items does not push every other column off screen.
  worksheet['!cols'] = columns.map((column) => ({
    wch: Math.min(
      60,
      Math.max(column.label.length, ...rows.map((row) => String(row[column.label]).length)) + 2,
    ),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Gate Passes');
  return workbook;
}

/**
 * `returnable_gate_passes_2026-10-08.xlsx` — dated so successive exports do
 * not overwrite. Local date: the UTC one is still yesterday before 5:30 IST.
 */
export const returnableFileName = (today = new Date()) =>
  `returnable_gate_passes_${formatDate(today, 'YYYY-MM-DD')}.xlsx`;

/** Download the passes on screen as a workbook. */
export function exportReturnableGatePasses(passes: ReturnableGatePassListItem[]): void {
  XLSX.writeFile(buildReturnableWorkbook(passes), returnableFileName());
}
