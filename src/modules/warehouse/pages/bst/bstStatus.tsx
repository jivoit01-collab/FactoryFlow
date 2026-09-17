import type { BSTTransferStatus } from '../../types';

const STATUS_CONFIG: Record<BSTTransferStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground' },
  SCANNING: { label: 'Scanning', cls: 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400' },
  DISPATCHED: { label: 'Dispatched', cls: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-400' },
  AWAITING_GATE_OUT: { label: 'Awaiting Gate Out', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400' },
  GATED_OUT: { label: 'Gated Out', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400' },
  IN_TRANSIT: { label: 'In Transit', cls: 'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-400' },
  AWAITING_GATE_IN: { label: 'Awaiting Gate In', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400' },
  GATED_IN: { label: 'Gated In', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400' },
  ARRIVED: { label: 'Arrived', cls: 'bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-400' },
  RECEIVING: { label: 'Receiving', cls: 'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-400' },
  RECEIVED: { label: 'Received', cls: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', cls: 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-400' },
  CLOSED: { label: 'Closed', cls: 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400' },
};

export function BSTStatusBadge({ status }: { status: BSTTransferStatus }) {
  const c = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}
    >
      {c.label}
    </span>
  );
}
