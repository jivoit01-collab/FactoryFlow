import { toast } from 'sonner';

import { sapReceiptSummary } from '@/modules/dispatch/components/tracking/sapReceiptSummary';
import {
  type TruckDispatchSapReceiptStatus,
  type TruckDispatchUpdate,
  useSendDeliveryToSap,
  useUploadProof,
} from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';
import { Button, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';
import { getErrorMessage } from '@/shared/utils/error';

const RECEIPT_CLASS: Record<TruckDispatchSapReceiptStatus, string> = {
  POSTED:
    'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ALREADY_RECEIVED:
    'border-emerald-200 dark:border-emerald-500/20 bg-transparent text-emerald-700 dark:text-emerald-400',
  WAITING:
    'border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  NEEDS_PROOF:
    'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  BY_HAND:
    'border-orange-300 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  REFUSED:
    'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  SUPERSEDED:
    'border-gray-300 dark:border-border bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground',
};

/** Attaches the proof to an update saved without one. On a delivery it is what
 *  SAP waits for, so the bills go to SAP as soon as it is attached. */
function ProofUpload({ arrivalId, updateId }: { arrivalId: number; updateId: number }) {
  const upload = useUploadProof();
  const inputId = `late-proof-${updateId}`;

  const handleChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await upload.mutateAsync({ arrivalId, updateId, file });
      toast.success('Proof attached', {
        description: sapReceiptSummary(result.sap_receipts) || undefined,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to attach the proof'));
    }
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Label htmlFor={inputId} className="cursor-pointer text-xs text-blue-600 hover:underline">
        {upload.isPending ? 'Attaching and sending to SAP…' : 'Attach proof of delivery'}
      </Label>
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        disabled={upload.isPending}
        onChange={(event) => handleChange(event.target.files?.[0])}
      />
    </span>
  );
}

/**
 * A delivery's bills as SAP has them: each A/R invoice is marked received
 * (received date, received qty per line, the proof attached) once the update
 * has its proof. Shows each bill's state and offers what can move it on.
 */
export function DeliverySapReceipts({
  arrivalId,
  update,
  canUpdate,
}: {
  arrivalId: number;
  update: TruckDispatchUpdate;
  canUpdate: boolean;
}) {
  const send = useSendDeliveryToSap();
  const receipts = (update.sap_receipts ?? []).filter((r) => r.status !== 'SUPERSEDED');
  if (!receipts.length) return null;

  const needsProof = !update.proof && receipts.some((r) => r.status === 'NEEDS_PROOF');
  const canResend =
    !!update.proof && receipts.some((r) => r.status === 'REFUSED' || r.status === 'WAITING');

  const handleSend = async () => {
    try {
      const result = await send.mutateAsync({ arrivalId, updateId: update.id });
      toast.success('Sent to SAP', {
        description: sapReceiptSummary(result.sap_receipts) || undefined,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send to SAP'));
    }
  };

  return (
    <div className="mt-2 rounded border">
      <div className="flex flex-wrap items-center gap-2 border-b px-2 py-1">
        <span className="text-xs font-medium">SAP</span>
        <span className="text-xs text-muted-foreground">
          Bills marked received on their A/R invoice
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          {needsProof && canUpdate ? (
            <ProofUpload arrivalId={arrivalId} updateId={update.id} />
          ) : null}
          {canResend && canUpdate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={handleSend}
              disabled={send.isPending}
            >
              {send.isPending ? 'Sending…' : 'Send to SAP again'}
            </Button>
          ) : null}
        </span>
      </div>
      <ul className="divide-y">
        {receipts.map((receipt) => (
          <li key={receipt.id} className="px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium">{receipt.sap_doc_num || '—'}</span>
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {receipt.customer_name || '—'}
                {receipt.company ? ` · ${receipt.company}` : ''}
              </span>
              <span
                className={cn(
                  'ml-auto inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
                  RECEIPT_CLASS[receipt.status] ?? RECEIPT_CLASS.WAITING,
                )}
              >
                {receipt.status_display}
              </span>
            </div>
            {receipt.message && receipt.status !== 'POSTED' ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{receipt.message}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
