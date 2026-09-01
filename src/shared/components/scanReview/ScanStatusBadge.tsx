import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/shared/components/ui';

/**
 * The scan states a bill line (or a whole bill) can be in, shared by every scan
 * review screen (dispatch docking, BST) so the same state always wears the same
 * badge. `exempt` is a line that never requires scanning (e.g. packaging
 * material on a BST); `offBill` is a scan whose item is on no bill line.
 */
export type ScanRowStatus = 'open' | 'partial' | 'complete' | 'over' | 'exempt' | 'offBill';

export function ScanStatusBadge({ status, label }: { status: ScanRowStatus; label?: ReactNode }) {
  switch (status) {
    case 'complete':
      return (
        <Badge variant="success">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          {label ?? 'Complete'}
        </Badge>
      );
    case 'partial':
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          {label ?? 'Partial'}
        </Badge>
      );
    case 'over':
      return (
        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          {label ?? 'Over'}
        </Badge>
      );
    case 'exempt':
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
          {label ?? 'Scan not required'}
        </Badge>
      );
    case 'offBill':
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          {label ?? 'Not on bill'}
        </Badge>
      );
    default:
      return <Badge variant="outline">{label ?? 'Open'}</Badge>;
  }
}
