import { MACHINE_STATUS_COLORS, MACHINE_STATUS_LABELS } from '../constants';
import type { MachineStatus } from '../types';

interface MachineStatusDotProps {
  status: MachineStatus;
  showLabel?: boolean;
}

export function MachineStatusDot({ status, showLabel = true }: MachineStatusDotProps) {
  const colors = MACHINE_STATUS_COLORS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${colors.bg}`} />
      {showLabel && <span className={colors.text}>{MACHINE_STATUS_LABELS[status]}</span>}
    </span>
  );
}
