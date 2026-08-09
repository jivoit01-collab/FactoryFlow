import { type ReactNode, useState } from 'react';

import { Button } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the destructive (red) style. */
  destructive?: boolean;
  /** When true, a reason field is shown and Confirm stays disabled until it is non-empty. */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** While true, the dialog can't be dismissed and the confirm button shows a working state. */
  pending?: boolean;
  /** Called with the trimmed reason (empty string when `requireReason` is false). */
  onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * A shared confirm dialog for irreversible barcode actions (void, dismantle, dispatch,
 * reverse-transfer). Replaces native `window.confirm`/`prompt`, which are clumsy and
 * easy to misfire on factory-floor tablets, and optionally collects a required reason.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter a reason...',
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the reason when the dialog transitions to open — done during render,
  // React's recommended alternative to a state-resetting effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason('');
  }

  const reasonMissing = requireReason && !reason.trim();

  const handleConfirm = async () => {
    if (reasonMissing || pending) return;
    await onConfirm(reason.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Block dismissal while the action is in flight.
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {requireReason && (
          <div className="space-y-1">
            <label
              htmlFor="confirm-dialog-reason"
              className="text-xs font-medium text-muted-foreground"
            >
              {reasonLabel} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="confirm-dialog-reason"
              className="w-full border rounded px-3 py-2 text-sm"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={reasonMissing || pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
