import { WASTE_APPROVAL_COLORS, WASTE_APPROVAL_ICONS, WASTE_APPROVAL_LABELS } from '../constants';
import type { WasteApprovalStatus } from '../types';

interface WasteApprovalBadgeProps {
  status: WasteApprovalStatus;
}

export function WasteApprovalBadge({ status }: WasteApprovalBadgeProps) {
  const colors = WASTE_APPROVAL_COLORS[status];
  const Icon = WASTE_APPROVAL_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      <Icon className="h-3 w-3" />
      {WASTE_APPROVAL_LABELS[status]}
    </span>
  );
}
