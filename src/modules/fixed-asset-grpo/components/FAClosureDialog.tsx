import { CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useCloseFAEntry, useFAEntry, useReopenFAEntry } from '../api/faGrpo.queries';

/**
 * "Done in SAP by hand", and its undo.
 *
 * For an entry the app will never post: the backlog keyed before the cut-over,
 * a PO in a warehouse the picker does not list, a capital purchase booked as a
 * service invoice. It needs the SAP document number or a note, so the next
 * reader knows where the receipt went. The backend refuses it once the app has
 * posted the entry for real, or while a GRPO of it is on its way to SAP.
 *
 * Opened on a closed entry, the dialog shows the closure and offers Reopen,
 * which puts the entry back in the lists.
 */
interface FAClosureDialogProps {
  vehicleEntryId: number;
  entryNo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FAClosureDialog(props: FAClosureDialogProps) {
  // Mounted fresh (keyed by entry) each time it opens, so the form starts
  // empty without resetting state from an effect.
  if (!props.open) return null;
  return <ClosureForm key={props.vehicleEntryId} {...props} />;
}

function ClosureForm({ vehicleEntryId, entryNo, open, onOpenChange }: FAClosureDialogProps) {
  const { data: entry, isLoading } = useFAEntry(vehicleEntryId, open);
  const closeEntry = useCloseFAEntry(vehicleEntryId);
  const reopenEntry = useReopenFAEntry(vehicleEntryId);

  const [sapDocNum, setSapDocNum] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const closure = entry?.closure ?? null;
  const isSaving = closeEntry.isPending || reopenEntry.isPending;
  const label = entry?.entry_no || entryNo || `#${vehicleEntryId}`;

  const handleClose = async () => {
    setError(null);
    if (!sapDocNum.trim() && !note.trim()) {
      setError('Give the SAP document number or a note saying where this went.');
      return;
    }
    try {
      await closeEntry.mutateAsync({ sap_doc_num: sapDocNum.trim(), note: note.trim() });
      toast.success(`Entry ${label} marked as done in SAP by hand.`);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not close the entry.'));
    }
  };

  const handleReopen = async () => {
    setError(null);
    try {
      await reopenEntry.mutateAsync();
      toast.success(`Entry ${label} reopened.`);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reopen the entry.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {closure ? 'Done in SAP by hand' : 'Mark as done in SAP by hand'} — {label}
          </DialogTitle>
          <DialogDescription>
            {closure
              ? 'This entry was keyed in SAP by hand and is out of the Fixed Asset GRPO lists.'
              : 'Use this when the receipt was (or will be) keyed in SAP by hand. The entry leaves the lists and the app will not post it.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {closure ? (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {closure.sap_doc_num ? `SAP document ${closure.sap_doc_num}` : 'Closed with a note'}
              </div>
              {closure.note && <p className="whitespace-pre-wrap">{closure.note}</p>}
              <p className="text-xs text-muted-foreground">
                {closure.closed_by ? `${closure.closed_by}, ` : ''}
                {formatDateTimeShort(closure.closed_at)}
              </p>
            </div>
          ) : (
            !isLoading && (
              <>
                <div>
                  <Label htmlFor="fa-close-docnum" className="mb-1 block">
                    SAP GRPO DocNum
                  </Label>
                  <Input
                    id="fa-close-docnum"
                    maxLength={30}
                    value={sapDocNum}
                    disabled={isSaving}
                    onChange={(e) => setSapDocNum(e.target.value)}
                    placeholder="e.g. 2026012345"
                  />
                </div>
                <div>
                  <Label htmlFor="fa-close-note" className="mb-1 block">
                    Note
                  </Label>
                  <Textarea
                    id="fa-close-note"
                    rows={3}
                    value={note}
                    disabled={isSaving}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Where this went, e.g. booked as an A/P service invoice"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">One of the two is needed.</p>
                </div>
              </>
            )
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          {closure ? (
            <Button onClick={() => void handleReopen()} disabled={isSaving}>
              <Undo2 className="mr-1 h-4 w-4" />
              {reopenEntry.isPending ? 'Reopening…' : 'Reopen'}
            </Button>
          ) : (
            <Button onClick={() => void handleClose()} disabled={isSaving || isLoading}>
              {closeEntry.isPending ? 'Saving…' : 'Mark done in SAP'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
