/**
 * Taking back an approval.
 *
 * Says out loud that the attendance sheet will be touched, and reports back how
 * much of it could actually be undone — a day somebody has since corrected for
 * an unrelated reason is left alone, and the operator needs to know that rather
 * than assume a clean reversal.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';

import { useCancelLeave } from '../api';
import type { LeaveRequest } from '../api/leave.api';
import { formatRange } from './statusBits';

export function CancelLeaveDialog({
  request,
  onClose,
}: {
  request: LeaveRequest | null;
  onClose: () => void;
}) {
  const cancel = useCancelLeave();
  const [comment, setComment] = useState('');

  if (!request) return null;

  function submit() {
    if (!request) return;
    if (!comment.trim()) {
      toast.error('A reason is required to cancel an approved leave.');
      return;
    }
    cancel.mutate(
      { id: request.id, comment: comment.trim() },
      {
        onSuccess: (result) => {
          const left = result.attendance_left_alone;
          toast.success(
            `Cancelled. ${result.attendance_reverted} attendance day(s) reverted` +
              (left ? `, ${left} left alone (corrected since).` : '.'),
          );
          setComment('');
          onClose();
        },
        onError: () => undefined,
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel approved leave</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="font-medium">{request.employee_name}</div>
            <div className="text-muted-foreground">
              {request.leave_type_name} · {formatRange(request.from_date, request.to_date)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (required)</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Why this approval is being taken back"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Any day already marked as leave on the attendance sheet goes back to the punch
            machine&apos;s own reading — unless somebody has corrected it since, in which case
            theirs is left alone.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={submit} disabled={cancel.isPending}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel leave'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
