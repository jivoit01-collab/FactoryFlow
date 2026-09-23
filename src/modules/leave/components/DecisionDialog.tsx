/**
 * Approve or reject one request.
 *
 * The reject path makes the comment mandatory in the UI as well as on the
 * server. That is duplication on purpose: somebody was told no and will ask
 * why, and finding that out after the round trip means retyping the decision.
 *
 * Partial approval is offered only where it can mean anything — a request of
 * two or more days. For a single day, approving "some" of it is just approving
 * it, and an extra control saying so is noise.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';

import { useApproveLeave, useRejectLeave } from '../api';
import type { LeaveRequest } from '../api/leave.api';
import { authorityLabel, formatDate, formatRange, portionLabel } from './statusBits';

interface Props {
  request: LeaveRequest | null;
  mode: 'approve' | 'reject';
  onClose: () => void;
}

export function DecisionDialog({ request, mode, onClose }: Props) {
  const approve = useApproveLeave();
  const reject = useRejectLeave();

  const [comment, setComment] = useState('');
  const [excluded, setExcluded] = useState<string[]>([]);

  if (!request) return null;

  const pendingDays = request.days.filter((day) => day.status === 'PENDING');
  const canSplit = mode === 'approve' && pendingDays.length > 1;
  const keptDates = pendingDays.map((day) => day.date).filter((date) => !excluded.includes(date));

  function toggle(date: string) {
    setExcluded((current) =>
      current.includes(date) ? current.filter((d) => d !== date) : [...current, date],
    );
  }

  function close() {
    setComment('');
    setExcluded([]);
    onClose();
  }

  function submit() {
    if (!request) return;

    if (mode === 'reject') {
      if (!comment.trim()) {
        toast.error('A reason is required to reject a request.');
        return;
      }
      reject.mutate(
        { id: request.id, comment: comment.trim() },
        {
          onSuccess: () => {
            toast.success('Request rejected.');
            close();
          },
          onError: () => undefined,
        },
      );
      return;
    }

    if (canSplit && keptDates.length === 0) {
      toast.error('Approving no dates at all is a rejection — use Reject instead.');
      return;
    }

    approve.mutate(
      {
        id: request.id,
        payload: {
          comment: comment.trim(),
          // Only send the list when it actually narrows the request; an
          // unmodified full approval should look like one on the trail.
          only_dates: canSplit && excluded.length > 0 ? keptDates : undefined,
        },
      },
      {
        onSuccess: (updated) => {
          toast.success(`Approved ${updated.total_days} day(s).`);
          close();
        },
        onError: () => undefined,
      },
    );
  }

  const busy = approve.isPending || reject.isPending;

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'approve' ? 'Approve leave' : 'Reject leave'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="font-medium">
              {request.employee_name}{' '}
              <span className="text-muted-foreground">({request.employee_code})</span>
            </div>
            <div className="text-muted-foreground">
              {request.leave_type_name} · {formatRange(request.from_date, request.to_date)} ·{' '}
              {request.total_days} day(s)
            </div>
            <div className="mt-2 whitespace-pre-wrap">{request.reason}</div>
            {request.my_authority ? (
              <div className="mt-2 text-xs text-muted-foreground">
                {authorityLabel(request.my_authority)}
              </div>
            ) : null}
          </div>

          {canSplit ? (
            <div className="space-y-2">
              <Label>Days to approve</Label>
              <div className="space-y-1 rounded-md border p-2">
                {pendingDays.map((day) => (
                  <label key={day.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={!excluded.includes(day.date)}
                      onCheckedChange={() => toggle(day.date)}
                    />
                    <span>{formatDate(day.date)}</span>
                    {day.portion !== 'FULL' ? (
                      <span className="text-xs text-muted-foreground">
                        {portionLabel(day.portion)}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
              {excluded.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {excluded.length} day(s) will be rejected.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="decision-comment">
              {mode === 'reject' ? 'Reason (required)' : 'Comment (optional)'}
            </Label>
            <Textarea
              id="decision-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              placeholder={
                mode === 'reject'
                  ? 'Why this is being refused'
                  : 'Anything the applicant should know'
              }
            />
          </div>

          {mode === 'approve' ? (
            <p className="text-xs text-muted-foreground">
              Approved days appear on the attendance sheet as leave. The punch machine&apos;s own
              reading is kept alongside, untouched.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            variant={mode === 'reject' ? 'destructive' : 'default'}
          >
            {busy ? 'Saving…' : mode === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
