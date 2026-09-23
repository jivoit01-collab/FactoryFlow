/**
 * Confirm something that is hard to take back.
 *
 * Two tones, because two different things need it:
 *
 * - `destructive` — a delete. One mis-tap loses a payment somebody recorded
 *   from a site, and there is no undo behind it.
 * - `default` — a one-way door that is not a loss. Sending a batch for approval
 *   locks it: the site cannot touch it again until the approver decides.
 *
 * The confirm button repeats the verb ("Remove", "Send for approval") rather
 * than saying "OK", so the thing about to happen is readable without the title.
 */
import { AlertTriangle, Send } from 'lucide-react';
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
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Remove',
  successMessage,
  errorMessage = 'Could not do that.',
  tone = 'destructive',
  cancelLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What exactly happens, in the user's words. */
  description?: string;
  confirmLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  tone?: 'destructive' | 'default';
  cancelLabel?: string;
  onConfirm: () => Promise<unknown>;
}) {
  const destructive = tone === 'destructive';
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      if (successMessage) toast.success(successMessage);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, errorMessage));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive ? (
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            ) : (
              <Send className="h-5 w-5 text-muted-foreground" />
            )}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel ?? (destructive ? 'Keep it' : 'Not yet')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
