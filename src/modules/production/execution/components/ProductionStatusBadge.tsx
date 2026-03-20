import { RUN_STATUS_COLORS, RUN_STATUS_ICONS, RUN_STATUS_LABELS } from '../constants';
import type { RunStatus } from '../types';

interface ProductionStatusBadgeProps {
  status: RunStatus;
}

export function ProductionStatusBadge({ status }: ProductionStatusBadgeProps) {
  const colors = RUN_STATUS_COLORS[status];
  const Icon = RUN_STATUS_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      <Icon className="h-3 w-3" />
      {RUN_STATUS_LABELS[status]}
    </span>
  );
}
