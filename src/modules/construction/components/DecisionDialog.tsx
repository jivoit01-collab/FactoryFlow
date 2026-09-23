/**
 * Approve or reject, with a note.
 *
 * Approving may be silent; rejecting may not. Refusing somebody's budget with
 * no reason leaves them nothing to act on, so the note is required on a
 * rejection here and in the service behind it — the UI is the convenience, the
 * server is the floor.
 */
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
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export type Decision = 'approve' | 'reject';

export function DecisionDialog({
  open,
  onOpenChange,
  decision,
  what,
  summary,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: Decision;
  /** "this project" / "revision 2" — used in the sentence. */
  what: string;
  /** One line of what is being decided, so the figures are in front of them. */
  summary?: string;
  onConfirm: (note: string) => Promise<unknown>;
  pending?: boolean;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const rejecting = decision === 'reject';

  // Clear as the dialog opens, during render rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNote('');
      setError('');
    }
  }

  async function confirm() {
    if (rejecting && !note.trim()) {
      setError('Say why. The person who asked will only see this.');
      return;
    }
    try {
      await onConfirm(note.trim());
      toast.success(rejecting ? 'Rejected' : 'Approved');
      onOpenChange(false);
    } catch (caught) {
      toast.error(getErrorMessage(caught, 'Could not record the decision.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {rejecting ? 'Reject' : 'Approve'} {what}
          </DialogTitle>
          {summary && <DialogDescription>{summary}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="decision-note">
            {rejecting ? 'Why are you rejecting this?' : 'Note (optional)'}
          </Label>
          <Textarea
            id="decision-note"
            rows={3}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setError('');
            }}
            placeholder={
              rejecting
                ? 'Get two more quotes before this goes ahead.'
                : 'Anything the project manager should know.'
            }
            autoFocus
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={pending}
            variant={rejecting ? 'destructive' : 'default'}
          >
            {pending ? 'Saving…' : rejecting ? 'Reject' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
