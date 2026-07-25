import type { BSTTransferStatus } from '../../types';

const STATUS_CONFIG: Record<BSTTransferStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-700' },
  SCANNING: { label: 'Scanning', cls: 'bg-blue-100 text-blue-800' },
  DISPATCHED: { label: 'Dispatched', cls: 'bg-indigo-100 text-indigo-800' },
  AWAITING_GATE_OUT: { label: 'Awaiting Gate Out', cls: 'bg-amber-100 text-amber-800' },
  GATED_OUT: { label: 'Gated Out', cls: 'bg-amber-100 text-amber-800' },
  IN_TRANSIT: { label: 'In Transit', cls: 'bg-cyan-100 text-cyan-800' },
  AWAITING_GATE_IN: { label: 'Awaiting Gate In', cls: 'bg-amber-100 text-amber-800' },
  GATED_IN: { label: 'Gated In', cls: 'bg-amber-100 text-amber-800' },
  ARRIVED: { label: 'Arrived', cls: 'bg-teal-100 text-teal-800' },
  RECEIVING: { label: 'Receiving', cls: 'bg-purple-100 text-purple-800' },
  RECEIVED: { label: 'Received', cls: 'bg-green-100 text-green-800' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', cls: 'bg-orange-100 text-orange-800' },
  CLOSED: { label: 'Closed', cls: 'bg-slate-100 text-slate-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
};

export function BSTStatusBadge({ status }: { status: BSTTransferStatus }) {
  const c = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}
    >
      {c.label}
    </span>
  );
}
