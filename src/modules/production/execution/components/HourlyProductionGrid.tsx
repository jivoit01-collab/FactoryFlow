import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/shared/utils';
import { Input } from '@/shared/components/ui';

import { TIME_SLOTS } from '../constants';
import { MachineStatusDot } from './MachineStatusDot';
import { MachineStatusSelect } from './MachineStatusSelect';
import type { CreateLogRequest, MachineStatus, ProductionLog } from '../types';

interface HourlyProductionGridProps {
  logs: ProductionLog[];
  disabled?: boolean;
  onLogsChange: (logs: CreateLogRequest[]) => void;
}

interface GridRow {
  timeSlot: string;
  start: string;
  end: string;
  producedCases: number;
  machineStatus: MachineStatus;
  recdMinutes: number;
  breakdownDetail: string;
  remarks: string;
}

function buildRows(logs: ProductionLog[]): GridRow[] {
  return TIME_SLOTS.map((slot) => {
    const existing = logs.find((l) => l.time_slot === slot.slot);
    return {
      timeSlot: slot.slot,
      start: slot.start,
      end: slot.end,
      producedCases: existing?.produced_cases ?? 0,
      machineStatus: existing?.machine_status ?? 'RUNNING',
      recdMinutes: existing?.recd_minutes ?? 0,
      breakdownDetail: existing?.breakdown_detail ?? '',
      remarks: existing?.remarks ?? '',
    };
  });
}

function rowsToRequests(rows: GridRow[]): CreateLogRequest[] {
  return rows.map((row) => ({
    time_slot: row.timeSlot,
    time_start: row.start,
    time_end: row.end,
    produced_cases: row.producedCases,
    machine_status: row.machineStatus,
    recd_minutes: row.recdMinutes,
    breakdown_detail: row.breakdownDetail,
    remarks: row.remarks,
  }));
}

export function HourlyProductionGrid({
  logs,
  disabled = false,
  onLogsChange,
}: HourlyProductionGridProps) {
  const [rows, setRows] = useState<GridRow[]>(() => buildRows(logs));

  // Sync from backend when logs change (e.g. after save)
  useEffect(() => {
    setRows(buildRows(logs));
  }, [logs]);

  // Current hour detection
  const now = new Date();
  const currentHour = `${String(now.getHours()).padStart(2, '0')}:00`;

  const updateRow = useCallback(
    (index: number, field: keyof GridRow, value: string | number) => {
      setRows((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        onLogsChange(rowsToRequests(updated));
        return updated;
      });
    },
    [onLogsChange],
  );

  // Totals
  const totalProduction = rows.reduce((sum, r) => sum + r.producedCases, 0);
  const totalMinutes = rows.reduce((sum, r) => sum + r.recdMinutes, 0);

  return (
    <div className="space-y-3">
      {/* Status legend */}
      <div className="flex items-center gap-4 text-xs">
        <MachineStatusDot status="RUNNING" showLabel />
        <MachineStatusDot status="BREAKDOWN" showLabel />
        <MachineStatusDot status="IDLE" showLabel />
        <MachineStatusDot status="CHANGEOVER" showLabel />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-32 px-3 py-2.5 text-left font-medium">Time</th>
              <th className="w-28 px-3 py-2.5 text-right font-medium">Prod (Cases)</th>
              <th className="w-32 px-3 py-2.5 text-center font-medium">Machine</th>
              <th className="w-24 px-3 py-2.5 text-right font-medium">Recd Mins</th>
              <th className="px-3 py-2.5 text-left font-medium">Breakdown Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isCurrentHour = row.start === currentHour;
              const isFuture = row.start > currentHour;

              return (
                <tr
                  key={row.timeSlot}
                  className={cn(
                    'border-b last:border-0 transition-colors',
                    isCurrentHour && 'border-l-[3px] border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
                    isFuture && !disabled && 'opacity-60',
                  )}
                >
                  {/* Time slot */}
                  <td className="px-3 py-1.5 font-medium text-muted-foreground bg-muted/30">
                    {row.timeSlot}
                  </td>

                  {/* Production cases */}
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={row.producedCases || ''}
                      disabled={disabled}
                      placeholder="0"
                      className="h-8 text-right font-mono text-xs w-full"
                      onChange={(e) =>
                        updateRow(idx, 'producedCases', parseInt(e.target.value) || 0)
                      }
                    />
                  </td>

                  {/* Machine status */}
                  <td className="px-3 py-1.5">
                    <MachineStatusSelect
                      value={row.machineStatus}
                      disabled={disabled}
                      onChange={(status) => updateRow(idx, 'machineStatus', status)}
                    />
                  </td>

                  {/* Recorded minutes */}
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={row.recdMinutes || ''}
                      disabled={disabled}
                      placeholder="0"
                      className="h-8 text-right font-mono text-xs w-full"
                      onChange={(e) =>
                        updateRow(idx, 'recdMinutes', Math.min(60, parseInt(e.target.value) || 0))
                      }
                    />
                  </td>

                  {/* Breakdown detail */}
                  <td className="px-3 py-1.5">
                    <Input
                      value={row.breakdownDetail}
                      disabled={disabled}
                      placeholder="—"
                      className="h-8 text-xs w-full"
                      onChange={(e) => updateRow(idx, 'breakdownDetail', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}

            {/* Total row */}
            <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold">
              <td className="px-3 py-2.5">TOTAL</td>
              <td className="px-3 py-2.5 text-right font-mono">
                {totalProduction.toLocaleString()}
              </td>
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-right font-mono">{totalMinutes}</td>
              <td className="px-3 py-2.5" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
