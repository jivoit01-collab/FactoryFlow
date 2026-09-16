import type {
  GoodsReturnApprovalStatus,
  GoodsReturnBasis,
  GoodsReturnInvoiceRef,
  GoodsReturnItemCondition,
  GoodsReturnStatus,
} from './api';

export const BASIS_LABELS: Record<GoodsReturnBasis, string> = {
  INVOICE: 'Against Invoice',
  DEBIT_NOTE: 'Against Debit Note',
  LETTER_PAD: 'Against Letter Pad',
};

/** What to call the customer's own reference number, per basis.
 *
 *  An invoice-basis return already carries the bill numbers, so its label is
 *  never shown — it is here only to keep the record total.
 */
export const REF_NO_LABELS: Record<GoodsReturnBasis, string> = {
  INVOICE: 'Reference Number',
  DEBIT_NOTE: 'Debit Note Number',
  LETTER_PAD: 'Letter Pad Number',
};

export const STATUS_LABELS: Record<GoodsReturnStatus, string> = {
  DRAFT: 'Draft',
  AWAITING_ARRIVAL: 'Awaiting Arrival',
  ARRIVED: 'Arrived',
  RECEIVED: 'Received (not in SAP)',
  PARTIALLY_POSTED: 'Partly posted to SAP',
  POSTED: 'Posted to SAP',
  CANCELLED: 'Cancelled',
};

export const STATUS_BADGE_CLASS: Record<GoodsReturnStatus, string> = {
  DRAFT: 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground',
  AWAITING_ARRIVAL: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400',
  ARRIVED: 'bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-400',
  // Deliberately not the same green as POSTED: the goods are in, but there is
  // no SAP document behind it yet.
  RECEIVED: 'bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-400',
  // Some of its invoices are in SAP and some are not — read as unfinished, not
  // as a failure: the documents SAP took are real.
  PARTIALLY_POSTED: 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-400',
  POSTED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
  CANCELLED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400',
};

export const APPROVAL_LABELS: Record<GoodsReturnApprovalStatus, string> = {
  NOT_REQUIRED: 'Not required',
  PENDING: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const APPROVAL_BADGE_CLASS: Record<GoodsReturnApprovalStatus, string> = {
  NOT_REQUIRED: 'bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground',
  PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400',
};

/**
 * The condition picker, most-used first — `DAMAGED` is the default the line is
 * created with, and `LEAKED` sits next to it because the two are what the clerk
 * is choosing between on nearly every line.
 *
 * `LEAKED` is deliberately its own option rather than a word typed into the
 * reason box: oil coming back wet is the commonest return and the only one that
 * points at a specific cause, so it has to be countable without reading prose.
 */
export const CONDITION_OPTIONS: { value: GoodsReturnItemCondition; label: string }[] = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LEAKED', label: 'Leaked' },
  { value: 'GOOD', label: 'Good' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'OTHER', label: 'Other' },
];

export const ATTACHMENT_TYPE_BY_BASIS: Record<
  GoodsReturnBasis,
  'INVOICE_COPY' | 'DEBIT_NOTE' | 'LETTER_PAD'
> = {
  INVOICE: 'INVOICE_COPY',
  DEBIT_NOTE: 'DEBIT_NOTE',
  LETTER_PAD: 'LETTER_PAD',
};

/** Invoice-ref id → the invoice number to show against a line.
 *
 *  A return line knows only which ref it belongs to, and every page that lists
 *  lines has to name the bill they came off: each invoice posts its own A/R
 *  Return, so the invoice is what says which document a line will land on. Falls
 *  back to the SAP doc entry for the rare ref whose number was never snapshotted.
 */
export function invoiceNumbersByRef(refs: GoodsReturnInvoiceRef[]): Record<number, string> {
  return Object.fromEntries(
    refs.map((ref) => [ref.id, ref.sap_invoice_doc_num || String(ref.sap_invoice_doc_entry)]),
  );
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

/** Date-only display (no time). */
export function formatDate(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

/** Value for a <input type="date"> from a date/ISO string. */
export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}
