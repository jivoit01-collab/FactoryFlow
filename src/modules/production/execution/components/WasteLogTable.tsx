import { CheckCircle2, Clock, Minus } from 'lucide-react';

import { cn } from '@/shared/utils';

import { WASTE_APPROVAL_COLORS, WASTE_APPROVAL_LABELS } from '../constants';
import type { WasteLog } from '../types';

interface WasteLogTableProps {
  wasteLogs: WasteLog[];
  onRowClick: (wasteLog: WasteLog) => void;
}

function ApprovalCell({
  signed,
  signedBy,
  signedAt,
}: {
  signed: boolean;
  signedBy: string;
  signedAt: string | null;
}) {
  if (signed && signedBy) {
    return (
      <span
        className="inline-flex items-center gap-1 text-green-600 text-xs"
        title={`Signed by: ${signedBy}${signedAt ? ` on ${new Date(signedAt).toLocaleString()}` : ''}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Signed
      </span>
    );
  }
  if (signedBy === '' && !signed) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
        <Clock className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  }
  return (
    <span className="text-gray-400">
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

export function WasteLogTable({ wasteLogs, onRowClick }: WasteLogTableProps) {
  if (wasteLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No waste logs found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2.5 text-left font-medium">Material</th>
            <th className="px-3 py-2.5 text-right font-medium">Wastage Qty</th>
            <th className="px-3 py-2.5 text-left font-medium">Reason</th>
            <th className="px-3 py-2.5 text-center font-medium">Engineer</th>
            <th className="px-3 py-2.5 text-center font-medium">AM</th>
            <th className="px-3 py-2.5 text-center font-medium">Store</th>
            <th className="px-3 py-2.5 text-center font-medium">HOD</th>
            <th className="px-3 py-2.5 text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {wasteLogs.map((log) => {
            const colors = WASTE_APPROVAL_COLORS[log.wastage_approval_status];
            const label = WASTE_APPROVAL_LABELS[log.wastage_approval_status];
            return (
              <tr
                key={log.id}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onRowClick(log)}
              >
                <td className="px-3 py-2 font-medium">{log.material_name}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {Number(log.wastage_qty).toLocaleString()} {log.uom}
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">
                  {log.reason || '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  <ApprovalCell
                    signed={!!log.engineer_signed_by}
                    signedBy={log.engineer_sign}
                    signedAt={log.engineer_signed_at}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <ApprovalCell
                    signed={!!log.am_signed_by}
                    signedBy={log.am_sign}
                    signedAt={log.am_signed_at}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <ApprovalCell
                    signed={!!log.store_signed_by}
                    signedBy={log.store_sign}
                    signedAt={log.store_signed_at}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <ApprovalCell
                    signed={!!log.hod_signed_by}
                    signedBy={log.hod_sign}
                    signedAt={log.hod_signed_at}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      colors.bg,
                      colors.text,
                      colors.darkBg,
                      colors.darkText,
                    )}
                  >
                    {label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
