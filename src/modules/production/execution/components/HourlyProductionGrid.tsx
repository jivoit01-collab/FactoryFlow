import { Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import type { ProductionLog } from '../types';
import { MachineStatusDot } from './MachineStatusDot';

interface HourlyProductionGridProps {
  logs: ProductionLog[];
  onAdd?: () => void;
  onEdit?: (log: ProductionLog) => void;
  readOnly?: boolean;
}

export function HourlyProductionGrid({ logs, onAdd, onEdit, readOnly }: HourlyProductionGridProps) {
  const totalProduction = logs.reduce((sum, l) => sum + l.produced_cases, 0);
  const totalMinutes = logs.reduce((sum, l) => sum + l.recd_minutes, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Hourly Production Log</h3>
        {!readOnly && onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Entry
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Time Slot</th>
              <th className="text-right p-2 font-medium">Cases</th>
              <th className="text-left p-2 font-medium">Status</th>
              <th className="text-right p-2 font-medium">Minutes</th>
              <th className="text-left p-2 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b hover:bg-muted/30 cursor-pointer"
                onClick={() => onEdit?.(log)}
              >
                <td className="p-2">{log.time_slot}</td>
                <td className="p-2 text-right font-medium">{log.produced_cases}</td>
                <td className="p-2"><MachineStatusDot status={log.machine_status} /></td>
                <td className="p-2 text-right">{log.recd_minutes}</td>
                <td className="p-2 text-muted-foreground truncate max-w-[200px]">{log.remarks || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No entries yet</td></tr>
            )}
          </tbody>
          {logs.length > 0 && (
            <tfoot>
              <tr className="border-t-2 font-semibold bg-muted/30">
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{totalProduction}</td>
                <td className="p-2" />
                <td className="p-2 text-right">{totalMinutes}</td>
                <td className="p-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
