import { cn } from '@/shared/utils';

import { MACHINE_STATUS_LABELS } from '../constants';
import type { MachineStatus } from '../types';

const DOT_COLORS: Record<MachineStatus, string> = {
  RUNNING: 'bg-green-500',
  IDLE: 'bg-gray-400',
  BREAKDOWN: 'bg-red-500',
  CHANGEOVER: 'bg-amber-500',
};

interface MachineStatusDotProps {
  status: MachineStatus;
  showLabel?: boolean;
  className?: string;
}

export function MachineStatusDot({ status, showLabel = false, className }: MachineStatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', DOT_COLORS[status])} />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{MACHINE_STATUS_LABELS[status]}</span>
      )}
    </span>
  );
}
