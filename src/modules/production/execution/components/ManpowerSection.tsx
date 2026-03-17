import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { SHIFT_COLORS, SHIFT_LABELS } from '../constants';
import type { Manpower } from '../types';

interface ManpowerSectionProps {
  entries: Manpower[];
  onAdd?: () => void;
  readOnly?: boolean;
}

export function ManpowerSection({ entries, onAdd, readOnly }: ManpowerSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Manpower</h3>
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
              <th className="text-left p-2 font-medium">Shift</th>
              <th className="text-right p-2 font-medium">Workers</th>
              <th className="text-left p-2 font-medium">Supervisor</th>
              <th className="text-left p-2 font-medium">Engineer</th>
              <th className="text-left p-2 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const shiftColors = SHIFT_COLORS[e.shift];
              return (
                <tr key={e.id} className="border-b hover:bg-muted/30">
                  <td className="p-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${shiftColors.bg} ${shiftColors.text} ${shiftColors.darkBg} ${shiftColors.darkText}`}>
                      {SHIFT_LABELS[e.shift]}
                    </span>
                  </td>
                  <td className="p-2 text-right font-medium">{e.worker_count}</td>
                  <td className="p-2">{e.supervisor}</td>
                  <td className="p-2">{e.engineer}</td>
                  <td className="p-2 text-muted-foreground">{e.remarks || '-'}</td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No manpower data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
