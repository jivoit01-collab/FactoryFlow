import * as XLSX from 'xlsx';

import { formatDate, formatDateToISOString, formatNumber } from '@/shared/utils';

import type { CustomerLedger, CustomerLedgerLine } from '../types';

/**
 * The range the ledger opens on: the financial year so far (1 April to
 * today), which is the statement an accountant asks for first.
 */
export function defaultLedgerRange(today = new Date()): { from: string; to: string } {
  // January–March still belong to the year that started last April.
  const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    from: formatDateToISOString(new Date(startYear, 3, 1)),
    to: formatDateToISOString(today),
  };
}

/** An amount as a ledger prints it: two decimals, Indian grouping. */
export const ledgerAmount = (value: number) => formatNumber(value, 2);

/**
 * A balance with its side: `12,345.00 Dr` when the customer owes, `Cr` when
 * we owe them (an advance, an unadjusted receipt), bare when it is nil.
 */
export function drCr(balance: number): string {
  const rounded = Math.round(balance * 100) / 100;
  if (rounded === 0) return ledgerAmount(0);
  return `${ledgerAmount(Math.abs(rounded))} ${rounded > 0 ? 'Dr' : 'Cr'}`;
}

/** A SAP date (`YYYY-MM-DD`) for display, read as a local calendar day. */
export function ledgerDate(value: string | null | undefined): string {
  if (!value) return '';
  // `new Date('2026-04-01')` is UTC midnight — the previous day west of Greenwich.
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return formatDate(new Date(year, month - 1, day));
}

/** A bill with something still unpaid after its due date. */
export function isOverdue(line: CustomerLedgerLine, today = new Date()): boolean {
  return line.open_amount > 0 && !!line.due_date && line.due_date < formatDateToISOString(today);
}

/** The ledger as a sheet: opening row, every posting, closing row. */
export function buildCustomerLedgerWorkbook(ledger: CustomerLedger): XLSX.WorkBook {
  const header = [
    'Date',
    'Type',
    'Doc no.',
    'Reference',
    'Narration',
    'Account',
    'Debit',
    'Credit',
    'Balance',
    'Dr/Cr',
    'Due date',
    'Pending',
  ];
  const side = (balance: number) => (balance > 0 ? 'Dr' : balance < 0 ? 'Cr' : '');
  const balanceCells = (balance: number) => [Math.round(balance * 100) / 100, side(balance)];

  const rows: (string | number)[][] = [
    [`${ledger.customer_name} (${ledger.customer_code})`],
    [
      `Ledger ${ledger.date_from ? ledgerDate(ledger.date_from) : 'from the start'} to ${
        ledger.date_to ? ledgerDate(ledger.date_to) : 'today'
      }`,
    ],
    [],
    header,
    [
      ledger.date_from ? ledgerDate(ledger.date_from) : '',
      'Opening balance',
      '',
      '',
      '',
      '',
      '',
      '',
      ...balanceCells(ledger.opening_balance),
    ],
    ...ledger.lines.map((line) => [
      ledgerDate(line.date),
      line.trans_type_label,
      line.doc_num,
      line.reference,
      line.narration,
      line.offset_name || line.offset_account,
      line.debit || '',
      line.credit || '',
      ...balanceCells(line.balance),
      ledgerDate(line.due_date),
      line.open_amount || '',
    ]),
    [
      ledger.date_to ? ledgerDate(ledger.date_to) : '',
      'Closing balance',
      '',
      '',
      '',
      '',
      ledger.total_debit,
      ledger.total_credit,
      ...balanceCells(ledger.closing_balance),
    ],
  ];
  if (ledger.truncated) {
    rows.push(
      [],
      [`Only the first ${ledger.lines.length} of ${ledger.total} postings are listed.`],
    );
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [12, 18, 12, 16, 40, 28, 14, 14, 16, 6, 12, 14].map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
  return workbook;
}

/** `ledger_CUSTA000486_2026-04-01_2026-10-03.xlsx` */
export const customerLedgerFileName = (ledger: CustomerLedger) =>
  ['ledger', ledger.customer_code, ledger.date_from, ledger.date_to].filter(Boolean).join('_') +
  '.xlsx';

export function exportCustomerLedger(ledger: CustomerLedger): void {
  XLSX.writeFile(buildCustomerLedgerWorkbook(ledger), customerLedgerFileName(ledger));
}
