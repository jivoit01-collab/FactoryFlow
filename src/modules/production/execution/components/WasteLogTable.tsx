import type { WasteLog } from '../types';
import { WasteApprovalBadge } from './WasteApprovalBadge';

interface WasteLogTableProps {
  wasteLogs: WasteLog[];
  onView?: (waste: WasteLog) => void;
  showRunNumber?: boolean;
}

const getApprovalSign = (waste: WasteLog) => (
  waste.approved_sign || waste.hod_sign || waste.store_sign || waste.am_sign || waste.engineer_sign || ''
);

export function WasteLogTable({ wasteLogs, onView, showRunNumber = false }: WasteLogTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {showRunNumber && <th className="text-left p-2 font-medium">Run</th>}
            <th className="text-left p-2 font-medium">Material</th>
            <th className="text-right p-2 font-medium">Qty</th>
            <th className="text-left p-2 font-medium">UoM</th>
            <th className="text-left p-2 font-medium">Reason</th>
            <th className="text-left p-2 font-medium">Status</th>
            <th className="text-left p-2 font-medium">Approved By</th>
          </tr>
        </thead>
        <tbody>
          {wasteLogs.map((w) => (
            <tr key={w.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onView?.(w)}>
              {showRunNumber && (
                <td className="p-2">
                  <span className="font-medium">
                    {w.run_number != null ? `#${w.run_number}` : 'Standalone'}
                  </span>
                  <span className="text-xs text-muted-foreground block">{w.log_date || w.run_date}</span>
                  <span className="text-xs text-muted-foreground block truncate max-w-[150px]">{w.run_product}</span>
                </td>
              )}
              <td className="p-2">{w.material_name}</td>
              <td className="p-2 text-right font-medium">{w.wastage_qty}</td>
              <td className="p-2">{w.uom}</td>
              <td className="p-2 truncate max-w-[150px]">{w.reason}</td>
              <td className="p-2"><WasteApprovalBadge status={w.wastage_approval_status} /></td>
              <td className="p-2">{getApprovalSign(w) || '-'}</td>
            </tr>
          ))}
          {wasteLogs.length === 0 && (
            <tr><td colSpan={showRunNumber ? 7 : 6} className="p-4 text-center text-muted-foreground">No waste logs</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
