import { Badge } from '@/shared/components/ui';

import type { AttendanceStatusValue } from '../api/attendance.api';
import { STATUS_STYLES, statusLabel } from './statusBits';

export function StatusBadge({
  status,
  label,
  muted = false,
}: {
  status: AttendanceStatusValue;
  label?: string;
  /** Renders the machine's reading beside a correction that has replaced it. */
  muted?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={
        muted
          ? 'bg-transparent text-muted-foreground border-dashed line-through'
          : STATUS_STYLES[status]
      }
    >
      {label ?? statusLabel(status)}
    </Badge>
  );
}
