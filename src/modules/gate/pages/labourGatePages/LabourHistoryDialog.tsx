import { History } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { LabourAuditAction } from '../../api/labourGate/labourGate.api';
import { useLabourEntryAudit } from '../../api/labourGate/labourGate.queries';
import { fmtDateTime } from './labourUtils';

const ACTION_TONE: Record<LabourAuditAction, string> = {
  CREATE_IN: 'bg-green-500',
  UPDATE_IN: 'bg-blue-500',
  MARK_OUT: 'bg-amber-500',
  UNDO_OUT: 'bg-slate-400',
  DELETE: 'bg-red-500',
  RESTORE: 'bg-emerald-500',
};

export function LabourHistoryDialog({
  entryId,
  title,
  open,
  onOpenChange,
}: {
  entryId: number | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Only fetch while the dialog is open for this entry.
  const { data: logs = [], isLoading } = useLabourEntryAudit(open ? entryId : null);

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
                    ACTION_TONE[log.action] ?? 'bg-muted-foreground',
                  )}
                />
                <div className="text-sm font-medium">{log.action_display}</div>
                {log.detail && (
                  <div className="text-xs text-muted-foreground">{log.detail}</div>
                )}
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
