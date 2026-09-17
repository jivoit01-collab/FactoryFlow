import type { ARInvoicePayment, PaymentBucket } from '../types';

/**
 * Which bucket a bill falls in for colouring and filtering.
 *
 * Untracked and an explicit PENDING mark both collapse to UNPAID — a bill
 * nobody has looked at is not a paid one. The difference (somebody checked,
 * versus nobody did) is carried by the badge's label instead, not by the
 * filter.
 */
export const paymentBucket = (
  payment: ARInvoicePayment | null | undefined,
): PaymentBucket => {
  if (payment?.status === 'RECEIVED') return 'RECEIVED';
  if (payment?.status === 'PARTIAL') return 'PARTIAL';
  return 'UNPAID';
};

/** An empty tally, for reducing a list of invoices into per-bucket counts. */
export const emptyPaymentCounts = (): Record<PaymentBucket, number> => ({
  UNPAID: 0,
  PARTIAL: 0,
  RECEIVED: 0,
});

/** Per-bucket counts over a set of invoices. */
export function countPaymentBuckets<T extends { payment: ARInvoicePayment | null }>(
  rows: T[],
): Record<PaymentBucket, number> {
  return rows.reduce((tally, row) => {
    tally[paymentBucket(row.payment)] += 1;
    return tally;
  }, emptyPaymentCounts());
}
