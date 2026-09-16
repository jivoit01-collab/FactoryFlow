import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type { LabourRequest, LabourRequestStatus } from '../types';

type Decision = Exclude<LabourRequestStatus, 'PENDING'>;

/**
 * The considered decision: approve fewer people than were asked for, or reject
 * with a reason. A plain full approval is one click on the row itself — this
 * dialog exists for the cases where the number or the reason matters.
 *
 * Approving MORE than was asked for is refused here as well as on the backend:
 * extra heads are somebody's request to make, and letting an approver invent
 * them would lose who wanted them.
 */
export function DecideLabourRequestDialog({
  request,
  open,
  onOpenChange,
  onDecide,
}: {
  request: LabourRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecide: (decision: Decision, approvedCount: number, note: string) => Promise<void>;
}) {
  const [approved, setApproved] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Re-seed each time a different request opens the dialog.
  useEffect(() => {
    if (request) {
      setApproved(String(request.requested_count));
      setNote('');
    }
  }, [request]);

  const asked = request?.requested_count ?? 0;
  const approvedNumber = parseInt(approved, 10);
  const approvedValid = !Number.isNaN(approvedNumber) && approvedNumber >= 0;
  const overAsk = approvedValid && approvedNumber > asked;

  const submit = async (decision: Decision) => {
    if (decision === 'APPROVED') {
      if (!approvedValid) {
        toast.error('Enter how many are approved');
        return;
      }
      if (overAsk) {
        toast.error(`Only ${asked} were requested`);
        return;
      }
    }
    setBusy(true);
    try {
      await onDecide(decision, approvedNumber, note.trim());
      toast.success(decision === 'APPROVED' ? 'Request approved' : 'Request rejected');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the decision'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Decide labour request</DialogTitle>
          <DialogDescription>
            {request
              ? `${request.department_name} · ${
                  request.shift === 'DAY' ? 'Day' : 'Night'
                } shift · ${request.work_date}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">Requested</p>
              <p className="text-3xl font-bold">{asked}</p>
              {request.note && (
                <p className="mt-1 text-sm text-muted-foreground">{request.note}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="approved-count">Approve how many</Label>
              <Input
                id="approved-count"
                type="number"
                min="0"
                max={asked}
                inputMode="numeric"
                value={approved}
                onChange={(e) => setApproved(e.target.value.replace(/[^0-9]/g, ''))}
                className="border-2 text-right font-medium"
              />
              {overAsk && (
                <p className="text-xs text-destructive">
                  Only {asked} {asked === 1 ? 'was' : 'were'} requested — approve up to that.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="decision-note">Reason (optional)</Label>
              <Input
                id="decision-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. only one line running"
                maxLength={255}
                className="border-2 font-medium"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => submit('REJECTED')}
            disabled={busy}
          >
            <X className="mr-1 h-4 w-4" /> Reject
          </Button>
          <Button type="button" onClick={() => submit('APPROVED')} disabled={busy || overAsk}>
            <Check className="mr-1 h-4 w-4" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
