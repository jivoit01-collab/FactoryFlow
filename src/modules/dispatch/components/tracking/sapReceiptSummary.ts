import type { TruckDispatchSapReceipt } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';

/** "2 received in SAP · 1 waiting for the proof" — for the toast after an update. */
export function sapReceiptSummary(receipts: TruckDispatchSapReceipt[]): string {
  if (!receipts.length) return '';
  const counts = new Map<string, number>();
  for (const receipt of receipts) {
    counts.set(receipt.status_display, (counts.get(receipt.status_display) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => `${count} ${count === 1 ? 'bill' : 'bills'}: ${label.toLowerCase()}`)
    .join(' · ');
}
