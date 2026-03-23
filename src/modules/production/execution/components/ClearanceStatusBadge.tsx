import { CLEARANCE_STATUS_COLORS, CLEARANCE_STATUS_ICONS, CLEARANCE_STATUS_LABELS } from '../constants';
import type { ClearanceStatus } from '../types';

interface ClearanceStatusBadgeProps {
  status: ClearanceStatus;
}

export function ClearanceStatusBadge({ status }: ClearanceStatusBadgeProps) {
  const colors = CLEARANCE_STATUS_COLORS[status];
  const Icon = CLEARANCE_STATUS_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      <Icon className="h-3 w-3" />
      {CLEARANCE_STATUS_LABELS[status]}
    </span>
  );
}
