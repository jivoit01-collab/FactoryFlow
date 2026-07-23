import type { BSTSourceType } from '../../types';

// A *live* internal transfer: an intra-company stock transfer with no gate step.
// These become receivable the moment the sender scans the first box, so the
// destination can accept/reject while the sender is still scanning. Mirrors
// `BSTService._is_live` on the backend. (INVOICE / gated transfers stay
// sequential: scan → approve → [gate] → receive.)
export function isLiveBst(t: { source_type: BSTSourceType; requires_gate: boolean }): boolean {
  return t.source_type === 'STOCK_TRANSFER' && !t.requires_gate;
}

/** Shared date+time formatting for BST screens (date + HH:MM, no seconds). */
export function formatBstDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
