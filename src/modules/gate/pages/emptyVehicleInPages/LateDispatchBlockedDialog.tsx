import { AlertTriangle, Clock, XCircle } from 'lucide-react';

import type { LateDispatchVehicleStatus } from '@/modules/admin/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import type { ExpectedDispatchVehicle } from './emptyVehicleInDispatch';

interface LateDispatchBlockedDialogProps {
  vehicle: ExpectedDispatchVehicle | null;
  /** The server's verdict for this truck, fetched on the "Start Entry" click. */
  status: LateDispatchVehicleStatus | null;
  onClose: () => void;
}

/**
 * The gate's side of the evening cutoff: a wall, not a form.
 *
 * A dispatch truck reaching the gate after the cutoff cannot be loaded, docked and
 * gate-passed the same evening, so the entry is not the gate's to start. Nor is it
 * the gate's to ask for -- whether a load is worth keeping a crew back for is a
 * question only dispatch can answer, and dispatch raises the request from Vehicle
 * Linking, normally hours before the truck turns up. All this screen does is stop
 * the click, say where the truck stands, and name who to go to.
 *
 * It never decides the cutoff itself: `status` is the server's verdict, so the
 * rule lives in exactly one place.
 */
export function LateDispatchBlockedDialog({
  vehicle,
  status,
  onClose,
}: LateDispatchBlockedDialogProps) {
  const open = Boolean(vehicle && status);
  if (!vehicle || !status) return null;

  const approval = status.approval;
  const isWaiting = approval?.status === 'PENDING';
  const wasRejected = approval?.status === 'REJECTED';
  // An approved-but-spent clearance still leaves `requires_approval` true: an
  // earlier entry used it, and this truck needs a fresh one.
  const wasUsed = approval?.status === 'APPROVED';
  const cutoffLabel = formatCutoff(status.cutoff);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left text-base sm:text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {isWaiting ? 'Waiting for approval' : `It is past ${cutoffLabel}`}
          </DialogTitle>
          <DialogDescription className="text-left">
            {isWaiting
              ? `Dispatch has asked for ${vehicle.vehicleNo} to be let in. The entry can be started as soon as an approver clears it.`
              : `A dispatch vehicle gated in after ${cutoffLabel} needs an approval, and ${vehicle.vehicleNo} does not have one.`}
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
                  Raised {formatTimestamp(approval.requested_at)} by{' '}
                  {approval.requested_by_name || 'dispatch'}.
                </div>
                <div className="mt-0.5 break-words text-xs text-amber-700/80 dark:text-amber-400/80">
                  {approval.reason}
                </div>
              </div>
            </div>
          ) : null}

          {wasRejected && approval ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-500/30 dark:bg-red-500/10">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
              <div className="min-w-0 text-red-800 dark:text-red-300">
                This truck was refused: {approval.review_notes || 'no reason given'}.
              </div>
            </div>
          ) : null}

          {wasUsed && approval ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              The approval given for this truck was already used
              {approval.gate_in_entry_no ? ` on ${approval.gate_in_entry_no}` : ''}, so it cannot
              let another entry through.
            </div>
          ) : null}

          {isWaiting ? null : (
            <p className="text-sm text-muted-foreground">
              Ask dispatch to raise the approval from Dispatch &gt; Vehicle Linking. Once it is
              approved, start the entry here as usual.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `17:00` as the gate reads it on the wall - `5:00 PM`. */
function formatCutoff(cutoff: string) {
  const [hours, minutes] = cutoff.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return cutoff;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatTimestamp(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}
