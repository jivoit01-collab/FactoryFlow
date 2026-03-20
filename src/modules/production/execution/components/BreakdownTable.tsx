import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { BREAKDOWN_TYPE_COLORS, BREAKDOWN_TYPE_LABELS } from '../constants';
import type { MachineBreakdown } from '../types';

interface BreakdownTableProps {
  breakdowns: MachineBreakdown[];
  onAdd?: () => void;
  onEdit?: (b: MachineBreakdown) => void;
  readOnly?: boolean;
}

export function BreakdownTable({ breakdowns, onAdd, onEdit, readOnly }: BreakdownTableProps) {
  const totalMinutes = breakdowns.reduce((sum, b) => sum + b.breakdown_minutes, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Breakdowns</h3>
        {!readOnly && onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" /> Log Breakdown
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Machine</th>
              <th className="text-left p-2 font-medium">Type</th>
              <th className="text-left p-2 font-medium">Start</th>
              <th className="text-left p-2 font-medium">End</th>
              <th className="text-right p-2 font-medium">Minutes</th>
              <th className="text-left p-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((b) => {
              const typeColors = BREAKDOWN_TYPE_COLORS[b.type];
              return (
                <tr key={b.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onEdit?.(b)}>
                  <td className="p-2">{b.machine_name || `Machine #${b.machine}`}</td>
                  <td className="p-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors.bg} ${typeColors.text} ${typeColors.darkBg} ${typeColors.darkText}`}>
                      {BREAKDOWN_TYPE_LABELS[b.type]}
                    </span>
                  </td>
                  <td className="p-2">{new Date(b.start_time).toLocaleTimeString()}</td>
                  <td className="p-2">{new Date(b.end_time).toLocaleTimeString()}</td>
                  <td className="p-2 text-right font-medium">{b.breakdown_minutes}</td>
                  <td className="p-2 truncate max-w-[200px]">{b.reason}</td>
                </tr>
              );
            })}
            {breakdowns.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No breakdowns recorded</td></tr>
            )}
          </tbody>
          {breakdowns.length > 0 && (
            <tfoot>
              <tr className="border-t-2 font-semibold bg-muted/30">
                <td colSpan={4} className="p-2">Total</td>
                <td className="p-2 text-right">{totalMinutes} min</td>
                <td className="p-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
