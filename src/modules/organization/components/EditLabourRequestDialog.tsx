import { Save } from 'lucide-react';
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

import type { LabourRequest } from '../types';

/**
 * Revise one department's ask — the count and the reason for it.
 *
 * A dialog rather than an inline row editor so that editing looks like every
 * other per-row action on this screen (History, Decide), and so a long reason
 * has somewhere to live without pushing the accordion around.
 *
 * Changing the NUMBER on an already-decided request sends it back for approval;
 * the dialog says so before the click rather than explaining it in a toast
 * afterwards. Editing only the reason leaves the decision standing.
 *
 * The reason is required, so a request raised before it was asks for one here.
 */
export function EditLabourRequestDialog({
  request,
  open,
  onOpenChange,
  onSave,
}: {
  request: LabourRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (count: number, note: string) => Promise<void>;
}) {
  const [count, setCount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Re-seed each time a different request opens the dialog.
  useEffect(() => {
    if (request) {
      setCount(String(request.requested_count));
      setNote(request.note);
    }
  }, [request]);

  const parsed = parseInt(count, 10);
  const valid = !Number.isNaN(parsed) && parsed > 0;
  const reason = note.trim();
  const reopensApproval =
    request != null && request.status !== 'PENDING' && valid && parsed !== request.requested_count;

  const submit = async () => {
    if (!valid) {
      toast.error('Enter how many labourers are needed');
      return;
    }
    if (!reason) {
      toast.error('Give a reason for this request');
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed, reason);
      toast.success(reopensApproval ? 'Updated — sent back for approval' : 'Updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the request'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit labour request</DialogTitle>
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
            <div className="space-y-2">
              <Label htmlFor="edit-request-count">Labourers needed</Label>
              <Input
                id="edit-request-count"
                type="number"
                min="1"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))}
                className="border-2 text-right font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-request-note">Reason</Label>
              <Input
                id="edit-request-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why is it needed? e.g. Loading 3 trucks"
                maxLength={255}
                className="border-2 font-medium"
              />
            </div>

            {reopensApproval && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                This request was already {request.status_display.toLowerCase()}. Changing the number
                sends it back for approval.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !valid || !reason}>
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
