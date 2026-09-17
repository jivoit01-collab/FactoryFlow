import { History } from 'lucide-react';

import { fmtDateTime } from '@/modules/gate/pages/labourGatePages/labourUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useLabourRequestAudit } from '../api/labourRequest.queries';
import { AUDIT_ACTION_TONE } from './labourRequestShared';

/**
 * The trail for one labour request: raised, revised, decided, reopened,
 * withdrawn. Read-only and append-only — the whole point is that an approved
 * number cannot quietly become a different number.
 */
export function LabourRequestHistoryDialog({
  requestId,
  title,
  open,
  onOpenChange,
}: {
  requestId: number | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Only fetch while the dialog is open for this request.
  const { data: logs = [], isLoading } = useLabourRequestAudit(open ? requestId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {logs.map((log) => (
              <li key={log.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background',
                    AUDIT_ACTION_TONE[log.action] ?? 'bg-muted-foreground',
                  )}
                />
                <div className="text-sm font-medium">{log.action_display}</div>
                {log.detail && <div className="text-xs text-muted-foreground">{log.detail}</div>}
                <div className="text-xs text-muted-foreground">
                  {log.performed_by_name ?? '—'} · {fmtDateTime(log.created_at)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
