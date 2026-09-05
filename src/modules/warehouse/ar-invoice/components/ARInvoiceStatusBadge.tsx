import { getSecurityApprovalClasses } from '@/config/constants';
import { cn } from '@/shared/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PENDING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  POSTED: 'Posted',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

// The shared colour map only knows APPROVED / REJECTED / PENDING — fold the
// A/R lifecycle statuses onto those three.
const STATUS_COLOR_KEY: Record<string, string> = {
  PENDING: 'PENDING',
  PENDING_APPROVAL: 'PENDING',
  APPROVED: 'APPROVED',
  POSTED: 'APPROVED',
  REJECTED: 'REJECTED',
  FAILED: 'REJECTED',
  CANCELLED: 'REJECTED',
};

/** Status pill for the local A/R invoice lifecycle. */
export function ARInvoiceStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        getSecurityApprovalClasses(STATUS_COLOR_KEY[status] ?? status),
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
