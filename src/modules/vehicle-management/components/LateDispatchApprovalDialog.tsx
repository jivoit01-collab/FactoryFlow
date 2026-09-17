import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { type LateDispatchApproval, useCreateLateDispatchApproval } from '@/modules/admin/api';
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
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils/error';

/** The truck this request is about, as the linking page already knows it. */
export interface LateDispatchApprovalTarget {
  vehicleId: number;
  vehicleNumber: string;
  billDocNums: string[];
  customers: string[];
}

interface LateDispatchApprovalDialogProps {
  target: LateDispatchApprovalTarget | null;
  /** This truck's existing request, if dispatch has already asked. */
  existing: LateDispatchApproval | null;
  /** Today as YYYY-MM-DD, the day the request defaults to. */
  today: string;
  onClose: () => void;
}

/**
 * Dispatch asks for a truck to be let in after the evening cutoff.
 *
 * A truck reaching the gate late cannot be loaded, docked and gate-passed the same
 * evening, so the gate refuses to start its entry without an approval. Only
 * dispatch can ask for one: they booked the truck and are the only side that knows
 * whether this load is worth keeping a loading crew back for.
 *
 * Asked from here rather than at the gate, and normally in the afternoon -- while
 * the truck is still on the road and somebody is still around to answer, instead of
 * at 8 PM with a driver waiting outside. No arrival time is collected, because
 * nobody knows it yet; the gate stamps the real one onto the approval as it spends
 * it.
 */
export function LateDispatchApprovalDialog({
  target,
  existing,
  today,
  onClose,
}: LateDispatchApprovalDialogProps) {
  const [reason, setReason] = useState('');
  const [gateInDate, setGateInDate] = useState(today);
  const [formError, setFormError] = useState('');
  const createRequest = useCreateLateDispatchApproval();

  const open = Boolean(target);
  // Mounted keyed on the truck, so a fresh target arrives with an empty form.
  if (!target) return null;

  const isWaiting = existing?.status === 'PENDING';
  const isApproved = existing?.status === 'APPROVED' && !existing.consumed_at;
  const wasRejected = existing?.status === 'REJECTED';
  // Nothing left to ask while a live request or an unspent clearance stands.
  const canAsk = !isWaiting && !isApproved;

  const closeDialog = () => {
    if (createRequest.isPending) return;
    onClose();
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setFormError('Say why this truck should be let in after the cutoff.');
      return;
    }
    setFormError('');
    try {
      await createRequest.mutateAsync({
        vehicle_id: target.vehicleId,
        gate_in_date: gateInDate,
        reason: trimmed,
      });
      toast.success(
        `${target.vehicleNumber} sent for approval. The gate can start its entry once it is cleared.`,
      );
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Could not send this vehicle for approval'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? closeDialog() : null)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left text-base sm:text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Late gate-in approval
          </DialogTitle>
          <DialogDescription className="text-left">
            {canAsk
              ? `Ask for ${target.vehicleNumber} to be let in for dispatch after the evening cutoff. Raise it before the truck reaches the gate — until it is approved the gate cannot start the entry.`
              : `Where ${target.vehicleNumber} stands on the evening cutoff.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="font-medium">{target.vehicleNumber}</div>
            <div className="text-xs text-muted-foreground">
              {target.billDocNums.length} bill{target.billDocNums.length === 1 ? '' : 's'}
              {target.billDocNums.length ? ` · ${target.billDocNums.join(', ')}` : ''}
            </div>
            {target.customers.length ? (
              <div className="mt-0.5 break-words text-xs text-muted-foreground">
                {target.customers.join(', ')}
              </div>
            ) : null}
          </div>

          {isWaiting && existing ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0">
                <div className="text-amber-800 dark:text-amber-300">
                  Already waiting with the approver for {existing.gate_in_date}.
                </div>
                <div className="mt-0.5 break-words text-xs text-amber-700/80 dark:text-amber-400/80">
                  Raised by {existing.requested_by_name || 'dispatch'} — {existing.reason}
                </div>
              </div>
            </div>
          ) : null}

          {isApproved && existing ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <div className="min-w-0 text-emerald-800 dark:text-emerald-300">
                Approved for {existing.gate_in_date} by{' '}
                {existing.reviewed_by_name || 'an approver'}. The gate can start the entry.
              </div>
            </div>
          ) : null}

          {wasRejected && existing ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-500/30 dark:bg-red-500/10">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
              <div className="min-w-0 text-red-800 dark:text-red-300">
                An earlier request was refused: {existing.review_notes || 'no reason given'}. You
                can ask again if something has changed.
              </div>
            </div>
          ) : null}

          {canAsk ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="late-dispatch-date">Day the truck is expected</Label>
                <Input
                  id="late-dispatch-date"
                  type="date"
                  value={gateInDate}
                  onChange={(event) => setGateInDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="late-dispatch-reason">Why should it be let in late?</Label>
                <Textarea
                  id="late-dispatch-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setFormError('');
                  }}
                  placeholder="e.g. held up at the previous delivery; load is ready and the crew is on shift"
                />
              </div>
            </>
          ) : null}

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={closeDialog}
            disabled={createRequest.isPending}
          >
            {canAsk ? 'Cancel' : 'Close'}
          </Button>
          {canAsk ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void submit()}
              disabled={createRequest.isPending || !gateInDate}
            >
              {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send for Approval
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
