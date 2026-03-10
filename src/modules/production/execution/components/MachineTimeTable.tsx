import { useMemo } from 'react';

import { Input } from '@/shared/components/ui';

import { MACHINE_TYPE_LABELS } from '../constants';
import type { CreateMachineRuntimeRequest, MachineRuntime, MachineType } from '../types';

const MACHINE_TYPES: MachineType[] = [
  'FILLER',
  'CAPPER',
  'CONVEYOR',
  'LABELER',
  'CODING',
  'SHRINK_PACK',
  'STICKER_LABELER',
  'TAPPING_MACHINE',
];

interface MachineTimeTableProps {
  runtimes: MachineRuntime[];
  disabled?: boolean;
  onSave: (data: CreateMachineRuntimeRequest[]) => void;
}

export function MachineTimeTable({ runtimes, disabled = false, onSave }: MachineTimeTableProps) {
  const rows = useMemo(() => {
    return MACHINE_TYPES.map((type) => {
      const existing = runtimes.find((r) => r.machine_type === type);
      return {
        machineType: type,
        label: MACHINE_TYPE_LABELS[type],
        runtimeMinutes: existing?.runtime_minutes ?? 0,
        downtimeMinutes: existing?.downtime_minutes ?? 0,
        existingId: existing?.id,
      };
    });
  }, [runtimes]);

  const totalRuntime = rows.reduce((sum, r) => sum + r.runtimeMinutes, 0);
  const totalDowntime = rows.reduce((sum, r) => sum + r.downtimeMinutes, 0);

  const handleChange = (
    machineType: MachineType,
    field: 'runtimeMinutes' | 'downtimeMinutes',
    value: number,
  ) => {
    const updated = rows.map((row) =>
      row.machineType === machineType ? { ...row, [field]: value } : row,
    );
    onSave(
      updated.map((row) => ({
        machine_type: row.machineType,
        runtime_minutes: row.runtimeMinutes,
        downtime_minutes: row.downtimeMinutes,
      })),
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2.5 text-left font-medium">Machine</th>
            <th className="w-36 px-3 py-2.5 text-right font-medium">Runtime (min)</th>
            <th className="w-36 px-3 py-2.5 text-right font-medium">Downtime (min)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.machineType} className="border-b last:border-0">
              <td className="px-3 py-1.5 font-medium text-muted-foreground bg-muted/30">
                {row.label}
              </td>
              <td className="px-3 py-1.5">
                <Input
                  type="number"
                  min={0}
                  value={row.runtimeMinutes || ''}
                  disabled={disabled}
                  placeholder="0"
                  className="h-8 text-right font-mono text-xs w-full"
                  onChange={(e) =>
                    handleChange(row.machineType, 'runtimeMinutes', parseInt(e.target.value) || 0)
                  }
                />
              </td>
              <td className="px-3 py-1.5">
                <Input
                  type="number"
                  min={0}
                  value={row.downtimeMinutes || ''}
                  disabled={disabled}
                  placeholder="0"
                  className="h-8 text-right font-mono text-xs w-full"
                  onChange={(e) =>
                    handleChange(row.machineType, 'downtimeMinutes', parseInt(e.target.value) || 0)
                  }
                />
              </td>
            </tr>
          ))}
          <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold">
            <td className="px-3 py-2.5">TOTAL</td>
            <td className="px-3 py-2.5 text-right font-mono">{totalRuntime.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-right font-mono">{totalDowntime.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
