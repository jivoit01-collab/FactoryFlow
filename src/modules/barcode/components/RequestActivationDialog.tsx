import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@/shared/components/ui';

import { useCreateActivationRequest } from '../api';
import { toastBarcodeError } from '../utils/errors';

interface RequestActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Scope: a whole pallet's pending labels… */
  palletId?: number | null;
  /** …or an explicit set of boxes. */
  boxIds?: number[];
  palletCode?: string;
  boxCount?: number;
}

/**
 * Ask a supervisor to activate printed labels without a receive scan.
 *
 * Lives as its own component because the request has to be raisable from more
 * than the moment of printing — that state is gone the second the page reloads,
 * and the labels are still sitting there PENDING. The pallet is the durable
 * place to find them again.
 *
 * The reason box is mandatory and not a formality: this is the one route that
 * turns labels into stock with nothing physical behind it, so the reason is the
 * only record of why anyone believed the boxes existed.
 */
export default function RequestActivationDialog({
  open,
  onOpenChange,
  palletId,
  boxIds,
  palletCode,
  boxCount,
}: RequestActivationDialogProps) {
  const [reason, setReason] = useState('');
  const createRequest = useCreateActivationRequest();

  const submit = async () => {
    if (!reason.trim()) {
      toast.error('Say why these labels cannot be received at the gate.');
      return;
    }
    try {
      await createRequest.mutateAsync({
        pallet_id: palletId ?? null,
        box_ids: boxIds ?? [],
        reason: reason.trim(),
      });
      toast.success('Sent for approval. The labels stay inactive until it is approved.');
      setReason('');
      onOpenChange(false);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to request activation.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request activation</DialogTitle>
          <DialogDescription>
            {boxCount ? `${boxCount} label(s)` : 'These labels'}
            {palletCode ? ` on ${palletCode}` : ''} will be activated without anyone
            scanning the boxes in. Prefer the warehouse Receive page whenever the boxes
            can actually be scanned at the godown — this route is recorded against your
            name and shows up in the audit as activated-without-a-scan.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          placeholder="Why can these not be received at the gate? (e.g. scanner down, pallet loaded straight onto a truck)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={createRequest.isPending}>
            Send for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
