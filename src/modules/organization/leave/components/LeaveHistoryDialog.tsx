/**
 * Everything that ever happened to one request.
 *
 * Includes the PROJECTED / UNPROJECTED entries, which is the point: a manager
 * asking "why does the attendance sheet say this person was on leave?" gets the
 * answer here, with the decision and the authority it was made under.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui';

import { useLeaveHistory } from '../api';
import type { LeaveRequest, LeaveTrailEntry } from '../api/leave.api';
import { authorityLabel } from './statusBits';

const ACTION_LABELS: Record<LeaveTrailEntry['action'], string> = {
  APPLIED: 'Applied',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn by the applicant',
  CANCELLED: 'Cancelled after approval',
  PROJECTED: 'Written to the attendance sheet',
  UNPROJECTED: 'Removed from the attendance sheet',
};

export function LeaveHistoryDialog({
  request,
  onClose,
}: {
  request: LeaveRequest | null;
  onClose: () => void;
}) {
  const { data: trail = [], isLoading } = useLeaveHistory(request?.id ?? null);

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>History</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : trail.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing recorded.</p>
        ) : (
          <ol className="space-y-3">
            {trail.map((entry) => (
              <li key={entry.id} className="border-l-2 pl-3">
                <div className="text-sm font-medium">{ACTION_LABELS[entry.action]}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(entry.performed_at).toLocaleString()}
                  {entry.performed_by_name ? ` · ${entry.performed_by_name}` : ''}
                  {entry.authority ? ` · ${authorityLabel(entry.authority as never)}` : ''}
                </div>
                {entry.comment ? (
                  <div className="mt-1 text-sm whitespace-pre-wrap">{entry.comment}</div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
