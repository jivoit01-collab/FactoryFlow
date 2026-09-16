import { AlertCircle, ArrowRightLeft } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { useOpenPOs } from '@/modules/gate/api/po/po.queries';
import { useRepointPOReceipt } from '@/modules/gate/api/po/poReceipt.queries';
import { SearchableSelect } from '@/shared/components';
import { Button, Label, Textarea } from '@/shared/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

import type { PreviewPOReceipt } from '../types';

/**
 * Move this receipt onto another of the vendor's open POs.
 *
 * The PO a truck is gated in against is correct when it is read and can be
 * wrong by the time the GRPO posts: open quantity is never reserved, so a
 * second truck's GRPO can finish the line off in between and this one is
 * refused with nowhere to go. Purchase has almost always raised the replacement
 * PO by then — this points the receipt at it without disturbing the material,
 * the quantities or the QC, none of which were ever wrong.
 *
 * Only POs that carry every item on the receipt with open quantity are offered,
 * so a move cannot simply relocate the same failure.
 */
export function RepointPODialog({
  po,
  open,
  onOpenChange,
}: {
  po: PreviewPOReceipt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [targetPO, setTargetPO] = useState<string>('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const repoint = useRepointPOReceipt(po.vehicle_entry_id);
  const { data: openPOs = [], isLoading } = useOpenPOs(po.supplier_code, open);

  const itemCodes = useMemo(
    () => new Set(po.items.map((item) => item.po_item_code)),
    [po.items],
  );

  // Every item has to land somewhere, so a PO missing one of them is not a
  // candidate — the server refuses it anyway, and offering it just wastes a trip.
  const candidates = useMemo(
    () =>
      openPOs.filter(
        (candidate) =>
          candidate.po_number !== po.po_number &&
          [...itemCodes].every((code) =>
            candidate.items.some(
              (line) => line.po_item_code === code && Number(line.remaining_qty) > 0,
            ),
          ),
      ),
    [openPOs, po.po_number, itemCodes],
  );

  const close = (next: boolean) => {
    if (!next) {
      setTargetPO('');
      setReason('');
      setFormError(null);
      repoint.reset();
    }
    onOpenChange(next);
  };

  const submit = () => {
    if (!targetPO) {
      setFormError('Choose the PO to move this receipt to.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Say why the receipt is moving — it is kept on the audit log.');
      return;
    }
    setFormError(null);
    repoint.mutate(
      { poReceiptId: po.po_receipt_id, data: { po_number: targetPO, reason: reason.trim() } },
      { onSuccess: () => close(false) },
    );
  };

  const serverError = repoint.error as ApiError | null;
  const errorMessage =
    formError ??
    (serverError
      ? ((serverError.data as { detail?: string })?.detail ?? serverError.message)
      : null);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Move PO {po.po_number} to another purchase order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-1">
          <p className="text-sm text-muted-foreground">
            The received quantities and their QC stay exactly as they are — only the purchase
            order this receipt draws on changes. Use this when {po.po_number} has no open
            quantity left and purchase has raised a replacement.
          </p>

          <SearchableSelect
            value={targetPO}
            items={candidates}
            isLoading={isLoading}
            label="Replacement PO"
            required
            placeholder={
              candidates.length === 0 && !isLoading
                ? 'No open PO covers every item on this receipt'
                : 'Select a PO'
            }
            disabled={repoint.isPending}
            inputId="repoint-target-po"
            getItemKey={(candidate) => candidate.po_number}
            getItemLabel={(candidate) => candidate.po_number}
            filterFn={(candidate, search) =>
              candidate.po_number.toLowerCase().includes(search.toLowerCase())
            }
            renderItem={(candidate) => (
              <div>
                <div className="font-medium">{candidate.po_number}</div>
                <div className="text-xs text-muted-foreground">
                  {candidate.items
                    .filter((line) => itemCodes.has(line.po_item_code))
                    .map((line) => `${line.po_item_code}: ${line.remaining_qty} open`)
                    .join(' · ')}
                </div>
              </div>
            )}
            loadingText="Loading open POs…"
            emptyText="No open PO covers every item on this receipt"
            notFoundText="No matching PO"
            onItemSelect={(candidate) => setTargetPO(candidate.po_number)}
            onClear={() => setTargetPO('')}
          />

          <div className="space-y-1.5">
            <Label htmlFor="repoint-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="repoint-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={repoint.isPending}
              rows={3}
              placeholder="e.g. 220826133 fully consumed by another truck's GRPO"
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-1">
          <Button variant="outline" onClick={() => close(false)} disabled={repoint.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={repoint.isPending}>
            {repoint.isPending ? 'Moving…' : 'Move receipt'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
