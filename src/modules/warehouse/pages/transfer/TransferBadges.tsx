/**
 * Shared status badges for warehouse transfer requests.
 *
 * The two status axes are deliberately shown separately everywhere: approval is
 * the app's decision, posting is where SAP has got to. Collapsing them into one
 * chip hides the state that actually matters — an approved request that was
 * never posted is reserving stock nobody has moved.
 */

import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Split, Truck, XCircle } from 'lucide-react';

import type {
  TransferFindingSeverity,
  TransferPostingStatus,
  TransferRequestStatus,
  TransferRouteType,
} from '../../types';

const CHIP = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

export function ApprovalBadge({ status }: { status: TransferRequestStatus }) {
  const config: Record<
    TransferRequestStatus,
    { label: string; className: string; icon: typeof Clock }
  > = {
    PENDING: { label: 'Awaiting decision', className: 'bg-amber-100 text-amber-800', icon: Clock },
    APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    PARTIALLY_APPROVED: {
      label: 'Part approved',
      className: 'bg-blue-100 text-blue-800',
      icon: AlertTriangle,
    },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
    CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-700', icon: XCircle },
  };
  const c = config[status] ?? config.PENDING;
  const Icon = c.icon;
  return (
    <span className={`${CHIP} ${c.className}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

export function PostingBadge({
  status,
  intransitWarehouse,
}: {
  status: TransferPostingStatus;
  intransitWarehouse?: string;
}) {
  if (status === 'NOT_POSTED') {
    // Deliberately not "not in SAP": the request document already exists there.
    // This badge is about the transfer, i.e. whether stock has actually moved.
    return <span className={`${CHIP} bg-slate-100 text-slate-700`}>Stock not moved</span>;
  }
  if (status === 'IN_TRANSIT') {
    return (
      <span className={`${CHIP} bg-indigo-100 text-indigo-800`}>
        <Truck className="h-3 w-3" />
        In transit{intransitWarehouse ? ` · ${intransitWarehouse}` : ''}
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className={`${CHIP} bg-red-100 text-red-800`}>
        <AlertTriangle className="h-3 w-3" />
        SAP refused the transfer
      </span>
    );
  }
  return (
    <span className={`${CHIP} bg-green-100 text-green-800`}>
      <CheckCircle2 className="h-3 w-3" />
      Stock moved
    </span>
  );
}

/**
 * A cross-branch move is worth calling out on every row: SAP forces it through
 * an in-transit warehouse, so it takes two documents and is only finished once
 * the receiving side confirms it.
 */
export function RouteBadge({ routeType }: { routeType: TransferRouteType }) {
  if (routeType !== 'CROSS_BRANCH') return null;
  return (
    <span className={`${CHIP} bg-purple-100 text-purple-800`}>
      <Split className="h-3 w-3" />
      Two legs
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: TransferFindingSeverity }) {
  const className =
    severity === 'critical'
      ? 'bg-red-100 text-red-800'
      : severity === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';
  return <span className={`${CHIP} ${className}`}>{severity}</span>;
}

export function Route({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
      {from || '—'}
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      {to || '—'}
    </span>
  );
}
