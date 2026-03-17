import type { WasteLog } from '../types';
import { WasteApprovalBadge } from './WasteApprovalBadge';

interface WasteLogTableProps {
  wasteLogs: WasteLog[];
  onApprove?: (wasteId: number, level: 'engineer' | 'am' | 'store' | 'hod') => void;
  onView?: (waste: WasteLog) => void;
}

export function WasteLogTable({ wasteLogs, onView }: WasteLogTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-2 font-medium">Material</th>
            <th className="text-right p-2 font-medium">Qty</th>
            <th className="text-left p-2 font-medium">UoM</th>
            <th className="text-left p-2 font-medium">Reason</th>
            <th className="text-left p-2 font-medium">Status</th>
            <th className="text-center p-2 font-medium">Engineer</th>
            <th className="text-center p-2 font-medium">AM</th>
            <th className="text-center p-2 font-medium">Store</th>
            <th className="text-center p-2 font-medium">HOD</th>
          </tr>
        </thead>
        <tbody>
          {wasteLogs.map((w) => (
            <tr key={w.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onView?.(w)}>
              <td className="p-2">{w.material_name}</td>
              <td className="p-2 text-right font-medium">{w.wastage_qty}</td>
              <td className="p-2">{w.uom}</td>
              <td className="p-2 truncate max-w-[150px]">{w.reason}</td>
              <td className="p-2"><WasteApprovalBadge status={w.wastage_approval_status} /></td>
              <td className="p-2 text-center">{w.engineer_sign ? '✓' : '-'}</td>
              <td className="p-2 text-center">{w.am_sign ? '✓' : '-'}</td>
              <td className="p-2 text-center">{w.store_sign ? '✓' : '-'}</td>
              <td className="p-2 text-center">{w.hod_sign ? '✓' : '-'}</td>
            </tr>
          ))}
          {wasteLogs.length === 0 && (
            <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No waste logs</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
