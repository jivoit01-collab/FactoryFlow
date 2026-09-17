import * as XLSX from 'xlsx';

import { type ClipboardCell,formatDate } from '@/shared/utils';

import type { ARInvoicePosting } from '../types';
import { paymentBucket } from './payment';

/** What the payment pill says, as a word a sheet can be filtered on. */
export function paymentLabel(posting: ARInvoicePosting): string {
  const bucket = paymentBucket(posting.payment);
  if (bucket === 'RECEIVED') return 'Paid';
  if (bucket === 'PARTIAL') return 'Part paid';
  return posting.payment ? 'Unpaid' : 'Not tracked';
}

/** The bill's value: SAP's own total once posted, the picked total before that. */
export function invoiceAmount(posting: ARInvoicePosting): number | null {
  const raw = posting.sap_doc_total ?? posting.selected_total;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** SAP's identifier for the bill — the posted number, or the draft it is still held as. */
export function sapReference(posting: ARInvoicePosting): string {
  if (posting.sap_doc_num) return String(posting.sap_doc_num);
  if (posting.sap_draft_entry) return `Draft ${posting.sap_draft_entry}`;
  return '';
}

/** The date the bill carries, falling back to when it was raised here. */
const invoiceDate = (posting: ARInvoicePosting) => posting.doc_date || posting.created_at;

/**
 * The columns on screen.
 *
 * One definition drives the table, the clipboard and the sheet, so a column
 * added to the screen cannot quietly go missing from an export — and what is
 * copied is what the user is looking at, in the same order.
 */
export interface ArInvoiceColumn {
  label: string;
  /** The cell as a spreadsheet should read it: a number stays a number. */
  value: (posting: ARInvoicePosting) => ClipboardCell;
  /** Money reads right-aligned on screen. */
  align?: 'right';
}

export const AR_INVOICE_COLUMNS: ArInvoiceColumn[] = [
  { label: 'Date', value: (p) => (invoiceDate(p) ? formatDate(invoiceDate(p)) : '') },
  { label: 'Customer', value: (p) => p.customer_name || p.customer_code },
  { label: 'Ref', value: (p) => p.customer_ref },
  { label: 'SAP invoice', value: sapReference },
  { label: 'Amount', value: invoiceAmount, align: 'right' },
  { label: 'Status', value: (p) => p.status_display || p.status },
  { label: 'Payment', value: paymentLabel },
];

/**
 * The extra columns only the workbook carries.
 *
 * A sheet is read away from the screen, by somebody who cannot click a row
 * open — so it also answers who raised the bill, when the money came in and
 * why a failed one failed.
 */
const EXPORT_ONLY_COLUMNS: ArInvoiceColumn[] = [
  { label: 'Customer code', value: (p) => p.customer_code },
  { label: 'Paid on', value: (p) => (p.payment?.received_on ? formatDate(p.payment.received_on) : '') },
  { label: 'Amount received', value: (p) => (p.payment?.amount ? Number(p.payment.amount) : null) },
  { label: 'Payment mode', value: (p) => p.payment?.mode_display || '' },
  { label: 'Payment ref', value: (p) => p.payment?.reference || '' },
  { label: 'Marked by', value: (p) => p.payment?.marked_by_name || '' },
  { label: 'Raised by', value: (p) => p.created_by_name || '' },
  { label: 'Raised on', value: (p) => (p.created_at ? formatDate(p.created_at) : '') },
  { label: 'Posted on', value: (p) => (p.posted_at ? formatDate(p.posted_at) : '') },
  { label: 'SAP doc entry', value: (p) => p.sap_doc_entry },
  { label: 'Error', value: (p) => p.error_message || '' },
];

/** One table row, cell by cell, in column order. */
export const toRowCells = (posting: ARInvoicePosting, columns = AR_INVOICE_COLUMNS) =>
  columns.map((column) => column.value(posting));

/** The rows as the clipboard wants them — no headings, just what is on screen. */
export const toClipboardRows = (postings: ARInvoicePosting[]): ClipboardCell[][] =>
  postings.map((posting) => toRowCells(posting));

/** Blank cells travel as '' — `json_to_sheet` drops an undefined key entirely. */
const sheetValue = (cell: ClipboardCell) => (cell === null || cell === undefined ? '' : cell);

/** The workbook: the screen's columns, then the ones only a sheet has room for. */
export function buildArInvoiceWorkbook(postings: ARInvoicePosting[]): XLSX.WorkBook {
  const columns = [...AR_INVOICE_COLUMNS, ...EXPORT_ONLY_COLUMNS];
  const rows = postings.map((posting) =>
    Object.fromEntries(columns.map((column) => [column.label, sheetValue(column.value(posting))])),
  );

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: columns.map((column) => column.label),
  });
  worksheet['!cols'] = columns.map((column) => ({
    wch:
      Math.max(
        column.label.length,
        ...rows.map((row) => String(row[column.label] ?? '').length),
      ) + 2,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AR Invoices');
  return workbook;
}

/** `ar_invoices_2026-09-12.xlsx` — dated so successive exports do not overwrite. */
export const arInvoiceFileName = (today = new Date()) =>
  `ar_invoices_${today.toISOString().slice(0, 10)}.xlsx`;

/** Download the rows on screen as a workbook. */
export function exportArInvoices(postings: ARInvoicePosting[]): void {
  XLSX.writeFile(buildArInvoiceWorkbook(postings), arInvoiceFileName());
}
