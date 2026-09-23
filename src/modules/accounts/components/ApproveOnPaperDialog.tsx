import { Loader2, Paperclip, Stamp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useApproveOnPaper } from '@/modules/accounts/api';
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
  Textarea,
} from '@/shared/components/ui';
import { formatNumber, getErrorMessage } from '@/shared/utils';

export interface ApproveOnPaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The payments ticked on the queue. */
  entryIds: number[];
  /** What they come to, for the sentence the reader has to agree with. */
  total: number;
  /** Called once the server has taken them, so the page can clear its ticks. */
  onDone: () => void;
}

/**
 * Recording that a stack of vouchers was signed on paper.
 *
 * The screen is not where most of these are really decided. The custodian
 * walks the vouchers over, comes back with signatures, and until now had no
 * way to say so — the entries sat in the queue waiting on an approval that had
 * already happened, and the register went on calling agreed money "awaiting
 * approval".
 *
 * So this is the custodian's own button, and the photograph is what keeps it
 * honest: it is the one route to approved that cannot be taken without
 * producing the paper. One photograph covers the whole stack, because that is
 * how a signed sheet actually arrives.
 */
export function ApproveOnPaperDialog({
  open,
  onOpenChange,
  entryIds,
  total,
  onDone,
}: ApproveOnPaperDialogProps) {
  const [proof, setProof] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const approve = useApproveOnPaper();

  const count = entryIds.length;
  const one = count === 1;

  async function submit() {
    if (!proof) {
      toast.error('Attach a photograph of the signed voucher.');
      return;
    }
    try {
      await approve.mutateAsync({ ids: entryIds, proof, note: note.trim() });
      toast.success(`${count} marked approved on paper`);
      onDone();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Those could not be marked approved.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Approved on paper: {count} {one ? 'payment' : 'payments'}
          </DialogTitle>
          <DialogDescription>
            {formatNumber(total)} in total. For vouchers already signed by hand. They
            freeze and start counting as spent, exactly as if they had been approved
            here — so the signed voucher has to go on record with them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="paper-proof">Signed voucher</Label>
            <Input
              id="paper-proof"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
            />
            {proof ? (
              <p className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {proof.name}
                {count > 1 && ` — attached to all ${count}`}
              </p>
            ) : (
              <p className="pt-1 text-xs text-muted-foreground">
                A photograph or PDF. Required: without it this is just an approval by
                the person who asked for it.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="paper-note">Note</Label>
            <Textarea
              id="paper-note"
              rows={2}
              placeholder="Signed by Arvinder sir"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional — room to name whoever signed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!proof || approve.isPending}>
            {approve.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Stamp className="mr-2 h-4 w-4" />
            )}
            Record {count} as approved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
