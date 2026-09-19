import type { CashEntry } from '@/modules/accounts/api';
import { formatDay, formatNumber } from '@/shared/utils';

/**
 * The columns of the cash book read as a sheet.
 *
 * Kept apart from the table that draws them, the way the dispatch sheet keeps
 * its own: a file that exports both a component and a constant cannot be hot
 * reloaded, and the columns are the part most likely to be edited.
 */

const money = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '' : formatNumber(Number(value));

/** One column of the sheet. The same shape the dispatch sheet uses. */
export interface CashSheetColumn {
  key: string;
  /**
   * The server's name for this column, for its filter and its sort.
   *
   * Most match the key; the two money columns do not, because the server
   * calls the payments column `amount` while the sheet calls it what the
   * heading says.
   */
  filterKey?: string;
  label: string;
  align?: 'left' | 'right';
  /** Wide free text, so the cell may be narrow and truncate. */
  wide?: boolean;
  value: (row: CashEntry) => string;
  /** What it is worth when the selection is added up; absent for text. */
  number?: (row: CashEntry) => number | null;
}

/**
 * The register as a spreadsheet: the columns the book has, in its own order.
 *
 * Everything a cell shows is a string here, including the money — a sheet
 * pastes what it displays, and a figure that arrives in Excel as
 * "1,410.00" is what the custodian sees on the screen they copied it from.
 * `number` is what the status bar adds up, which is the figure behind it.
 */
export const CASH_SHEET_COLUMNS: CashSheetColumn[] = [
  { key: 'serial', label: 'Sr.', align: 'right', value: (row) => String(row.serial_number ?? '') },
  { key: 'date', label: 'Date', value: (row) => formatDay(row.entry_date) },
  { key: 'bunch', label: 'Bunch', value: (row) => (row.bunch ? String(row.bunch.number) : '') },
  { key: 'branch', label: 'Branch', value: (row) => row.branch_name ?? '' },
  { key: 'gl_code', label: 'G/L', value: (row) => row.gl_account_code },
  {
    key: 'gl_name',
    filterKey: 'gl',
    label: 'G/L head',
    wide: true,
    value: (row) => row.gl_account_name,
  },
  { key: 'item', label: 'Item', value: (row) => row.item },
  { key: 'detail', label: 'Detail', wide: true, value: (row) => row.detail },
  {
    key: 'out',
    filterKey: 'amount',
    label: 'Amount',
    align: 'right',
    value: (row) => (row.direction === 'OUT' ? money(row.amount) : ''),
    number: (row) => (row.direction === 'OUT' ? Number(row.amount) : null),
  },
  {
    key: 'in',
    label: 'In',
    align: 'right',
    value: (row) => (row.direction === 'IN' ? money(row.amount) : ''),
    number: (row) => (row.direction === 'IN' ? Number(row.amount) : null),
  },
  {
    key: 'balance',
    label: 'Balance',
    align: 'right',
    value: (row) => money(row.balance_after),
    // Deliberately no `number`: a running balance is not a quantity to add
    // up, and a status bar offering to sum one is offering nonsense.
  },
  { key: 'advance', label: 'Advance', value: (row) => row.advance_holder_name ?? '' },
  { key: 'source', label: 'Source', value: (row) => row.atm_account_name ?? '' },
  { key: 'approval', label: 'Approval', value: (row) => row.approval_label },
  { key: 'approver', label: 'With', value: (row) => row.approver_name ?? '' },
];
