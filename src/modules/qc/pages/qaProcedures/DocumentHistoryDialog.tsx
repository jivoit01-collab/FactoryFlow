import { History, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { formatDateTimeFull } from '@/shared/utils';

import { useQCDocumentFileHistory } from '../../api/qcDocumentFileAudit';
import type { QCDocumentFile } from '../../types/qcDocumentFile.types';
import { AuditActionBadge, AuditChanges } from './AuditEventDisplay';

interface DocumentHistoryDialogProps {
  document: QCDocumentFile | null;
  onClose: () => void;
}

/**
 * Everything that has happened to one controlled document, newest first.
 *
 * Opened from the viewer, where the question actually comes up — "is this the
 * sheet I signed off, or has someone changed it since?" The wide, filterable
 * view of the same rows is the QA Procedure Log page.
 */
export default function DocumentHistoryDialog({ document, onClose }: DocumentHistoryDialogProps) {
  const { data, isLoading, error } = useQCDocumentFileHistory(document?.id ?? null);
  const entries = data?.results ?? [];

  return (
    <Dialog open={document !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History
          </DialogTitle>
          <DialogDescription>
            Every change made to{' '}
            <span className="font-mono">{document?.document_code || document?.title}</span>, newest
            first. Reading a procedure is not a change and is not recorded.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">
            {error.message || 'Could not load the history.'}
          </p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing recorded yet. Documents filed before the log was switched on have no entries.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {entries.map((entry) => (
              <li key={entry.id} className="relative">
                {/* The dot sits on the rail, hence the negative offset. */}
                <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-border ring-4 ring-background" />
                <div className="flex flex-wrap items-center gap-2">
                  <AuditActionBadge entry={entry} />
                  <span className="text-sm font-medium">{entry.user_name || 'Unknown user'}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeFull(entry.created_at)}
                  </span>
                </div>
                <div className="mt-1">
                  <AuditChanges entry={entry} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
