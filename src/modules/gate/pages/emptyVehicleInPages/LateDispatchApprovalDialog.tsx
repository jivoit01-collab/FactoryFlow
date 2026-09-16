import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  type LateDispatchVehicleStatus,
  useCreateLateDispatchApproval,
} from '@/modules/admin/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type { ExpectedDispatchVehicle } from './emptyVehicleInDispatch';

interface LateDispatchApprovalDialogProps {
  vehicle: ExpectedDispatchVehicle | null;
  /** The server's verdict for this truck, fetched on the "Start Entry" click. */
  status: LateDispatchVehicleStatus | null;
  onClose: () => void;
}

/**
 * The gate's side of the evening cutoff.
 *
 * A dispatch truck that reaches the gate after the cutoff cannot be loaded, docked
 * and gate-passed the same evening, so the entry is not the gate's to start alone.
 * This stops the "Start Entry" click, says so, and offers to send the vehicle for
 * approval. It never decides the cutoff itself — `status` is the server's verdict,
 * so the rule lives in exactly one place.
 */
export function LateDispatchApprovalDialog({
  vehicle,
  status,
  onClose,
}: LateDispatchApprovalDialogProps) {
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const createRequest = useCreateLateDispatchApproval();

  const open = Boolean(vehicle && status);

  // The board mounts this keyed on the vehicle, so a fresh truck (or a reopened
  // dialog) arrives with an empty form -- no effect resetting state behind it.
  if (!vehicle || !status) return null;

  const approval = status.approval;
  const isWaiting = approval?.status === 'PENDING';
  const wasRejected = approval?.status === 'REJECTED';
  // An approved-but-spent clearance still leaves `requires_approval` true: it was
  // used by an earlier entry and this truck needs a fresh one.
  const wasUsed = approval?.status === 'APPROVED';
  const cutoffLabel = formatCutoff(status.cutoff);

  const closeDialog = () => {
    if (createRequest.isPending) return;
    onClose();
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setFormError('Say why this truck should be let in tonight.');
      return;
    }
    setFormError('');
    try {
      await createRequest.mutateAsync({
        vehicle_id: vehicle.vehicleId,
        gate_in_date: status.gate_in_date,
        in_time: currentTime(),
        reason: trimmed,
      });
      toast.success(
        `${vehicle.vehicleNo} sent for approval. You can start the entry once it is approved.`,
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
            {isWaiting ? 'Approval already sent' : `It is past ${cutoffLabel}`}
          </DialogTitle>
          <DialogDescription className="text-left">
            {isWaiting
              ? `${vehicle.vehicleNo} has already been sent for approval. The entry can be started once an approver clears it.`
              : `A dispatch vehicle gated in after ${cutoffLabel} needs an approval. ${vehicle.vehicleNo} cannot be started until one is given.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="font-medium">{vehicle.vehicleNo}</div>
            <div className="text-xs text-muted-foreground">
              {vehicle.docNums.length} bill{vehicle.docNums.length === 1 ? '' : 's'}
              {vehicle.docNums.length ? ` · ${vehicle.docNums.join(', ')}` : ''}
            </div>
            {vehicle.customers.length ? (
              <div className="mt-0.5 break-words text-xs text-muted-foreground">
                {vehicle.customers.join(', ')}
              </div>
            ) : null}
          </div>

          {isWaiting && approval ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0">
                <div className="text-amber-800 dark:text-amber-300">
                  Waiting with the approver since {formatTimestamp(approval.requested_at)}.
                </div>
                <div className="mt-0.5 break-words text-xs text-amber-700/80 dark:text-amber-400/80">
                  Sent by {approval.requested_by_name || 'the gate'} — {approval.reason}
                </div>
              </div>
            </div>
          ) : null}

          {wasRejected && approval ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              An earlier request was rejected: {approval.review_notes || 'no reason given'}. You
              can send it again if something has changed.
            </div>
          ) : null}

          {wasUsed && approval ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              The approval given for this truck was already used
              {approval.gate_in_entry_no ? ` on ${approval.gate_in_entry_no}` : ''}. Sending it
              again asks for a fresh one.
            </div>
          ) : null}

          {isWaiting ? null : (
            <div className="space-y-2">
              <Label htmlFor="late-dispatch-reason">Why is this truck being let in late?</Label>
              <Textarea
                id="late-dispatch-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setFormError('');
                }}
                placeholder="e.g. truck was held up at the previous delivery; load is ready and the crew is on shift"
              />
            </div>
          )}

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
            {isWaiting ? 'Close' : 'Cancel'}
          </Button>
          {isWaiting ? null : (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void submit()}
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send for Approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `17:00` as the gate reads it on the wall — `5:00 PM`. */
function formatCutoff(cutoff: string) {
  const [hours, minutes] = cutoff.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return cutoff;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatTimestamp(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}
