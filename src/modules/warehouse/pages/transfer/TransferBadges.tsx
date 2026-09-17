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
    PENDING: { label: 'Awaiting decision', className: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400', icon: Clock },
    APPROVED: { label: 'Approved', className: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400', icon: CheckCircle2 },
    PARTIALLY_APPROVED: {
      label: 'Part approved',
      className: 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400',
      icon: AlertTriangle,
    },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400', icon: XCircle },
    CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground', icon: XCircle },
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
    return <span className={`${CHIP} bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground`}>Stock not moved</span>;
  }
  if (status === 'IN_TRANSIT') {
    return (
      <span className={`${CHIP} bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-400`}>
        <Truck className="h-3 w-3" />
        In transit{intransitWarehouse ? ` · ${intransitWarehouse}` : ''}
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className={`${CHIP} bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400`}>
        <AlertTriangle className="h-3 w-3" />
        SAP refused the transfer
      </span>
    );
  }
  return (
    <span className={`${CHIP} bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400`}>
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
    <span className={`${CHIP} bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-400`}>
      <Split className="h-3 w-3" />
      Two legs
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: TransferFindingSeverity }) {
  const className =
    severity === 'critical'
      ? 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400'
      : severity === 'warning'
        ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400'
        : 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground';
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
