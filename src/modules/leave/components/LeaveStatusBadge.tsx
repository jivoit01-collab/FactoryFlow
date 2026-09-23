import { Badge } from '@/shared/components/ui';

import type { LeaveRequestStatus } from '../api/leave.api';
import { STATUS_STYLES, statusLabel } from './statusBits';

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {statusLabel(status)}
    </Badge>
  );
}
