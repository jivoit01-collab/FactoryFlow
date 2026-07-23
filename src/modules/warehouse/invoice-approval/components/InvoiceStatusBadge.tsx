import { getSecurityApprovalClasses } from '@/config/constants';
import { cn } from '@/shared/utils';

import type { InvoiceStatus } from '../types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  EDITED: 'Edited',
  REJECTED: 'Rejected',
  ERROR: 'Error',
  POSTED_TO_SAP: 'Posted to SAP',
  CL_RAISED: 'CL Raised',
};

/**
 * Approval status pill. Reuses the shared security-approval colour map
 * (green / red / amber for APPROVED / REJECTED / PENDING; grey fallback for the rest).
 */
export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        getSecurityApprovalClasses(status),
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
