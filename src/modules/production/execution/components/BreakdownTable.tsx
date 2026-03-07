import { CheckCircle2, Pencil, Trash2, XCircle } from 'lucide-react';

import { Badge, Button } from '@/shared/components/ui';

import { BREAKDOWN_TYPE_LABELS } from '../constants';
import type { MachineBreakdown } from '../types';

interface BreakdownTableProps {
  breakdowns: MachineBreakdown[];
  disabled?: boolean;
  onEdit: (breakdown: MachineBreakdown) => void;
  onDelete: (breakdownId: number) => void;
}

export function BreakdownTable({
  breakdowns,
  disabled = false,
  onEdit,
  onDelete,
}: BreakdownTableProps) {
  if (breakdowns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No breakdowns recorded. Click "+ Add Breakdown" to log one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-10 px-3 py-2.5 text-left font-medium">#</th>
            <th className="px-3 py-2.5 text-left font-medium">Time</th>
            <th className="px-3 py-2.5 text-left font-medium">Machine</th>
            <th className="px-3 py-2.5 text-right font-medium">Duration</th>
            <th className="px-3 py-2.5 text-center font-medium">Type</th>
            <th className="px-3 py-2.5 text-left font-medium">Reason</th>
            <th className="px-3 py-2.5 text-center font-medium">Recovered</th>
            {!disabled && <th className="w-24 px-3 py-2.5 text-center font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {breakdowns.map((bd, idx) => (
            <tr key={bd.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
              <td className="px-3 py-2 font-mono text-xs">
                {bd.start_time} - {bd.end_time || '—'}
              </td>
              <td className="px-3 py-2">{bd.machine_name}</td>
              <td className="px-3 py-2 text-right font-mono">
                {bd.breakdown_minutes} min
              </td>
              <td className="px-3 py-2 text-center">
                <Badge
                  variant={bd.type === 'LINE' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {BREAKDOWN_TYPE_LABELS[bd.type] || bd.type}
                </Badge>
              </td>
              <td className="px-3 py-2 max-w-[200px] truncate">{bd.reason}</td>
              <td className="px-3 py-2 text-center">
                {bd.is_unrecovered ? (
                  <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                    <XCircle className="h-3.5 w-3.5" />
                    No
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Yes
                  </span>
                )}
              </td>
              {!disabled && (
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(bd)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700"
                      onClick={() => onDelete(bd.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
