import { Clock, XCircle } from 'lucide-react';

import type { EntryStepPosting } from '../api';

/** How a change to the order in SAP stands, when it is not simply done: waiting for SAP, or refused. */
export function ChangeState({ posting }: { posting: EntryStepPosting | null }) {
  if (!posting) return null;
  if (posting.status === 'QUEUED' || posting.status === 'SENDING') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          A change is waiting for SAP and goes through by itself when SAP answers.
          {posting.last_error ? ` ${posting.last_error}` : ''}
        </span>
      </div>
    );
  }
  if (posting.status === 'REJECTED') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>The last change was refused: {posting.last_error || 'SAP refused it.'}</span>
      </div>
    );
  }
  return null;
}
