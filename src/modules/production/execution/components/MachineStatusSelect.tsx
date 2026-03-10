import { cn } from '@/shared/utils';

import { MACHINE_STATUS_LABELS } from '../constants';
import { MachineStatusDot } from './MachineStatusDot';
import type { MachineStatus } from '../types';

const STATUSES: MachineStatus[] = ['RUNNING', 'IDLE', 'BREAKDOWN', 'CHANGEOVER'];

interface MachineStatusSelectProps {
  value: MachineStatus;
  disabled?: boolean;
  onChange: (status: MachineStatus) => void;
}

export function MachineStatusSelect({ value, disabled = false, onChange }: MachineStatusSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as MachineStatus)}
        className={cn(
          'h-8 w-full rounded border border-input bg-background pl-6 pr-2 text-xs appearance-none cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {MACHINE_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <MachineStatusDot status={value} />
      </div>
    </div>
  );
}
