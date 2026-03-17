import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { MACHINE_TYPE_LABELS } from '../constants';
import type { MachineRuntime } from '../types';

interface MachineTimeTableProps {
  runtimes: MachineRuntime[];
  onAdd?: () => void;
  readOnly?: boolean;
}

export function MachineTimeTable({ runtimes, onAdd, readOnly }: MachineTimeTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Machine Runtime</h3>
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
              <th className="text-left p-2 font-medium">Machine Type</th>
              <th className="text-right p-2 font-medium">Runtime (min)</th>
              <th className="text-right p-2 font-medium">Downtime (min)</th>
              <th className="text-left p-2 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {runtimes.map((r) => (
              <tr key={r.id} className="border-b hover:bg-muted/30">
                <td className="p-2">{MACHINE_TYPE_LABELS[r.machine_type]}</td>
                <td className="p-2 text-right">{r.runtime_minutes}</td>
                <td className="p-2 text-right text-red-600">{r.downtime_minutes}</td>
                <td className="p-2 text-muted-foreground">{r.remarks || '-'}</td>
              </tr>
            ))}
            {runtimes.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No runtime data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
