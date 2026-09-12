import { Clock, Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { getErrorMessage } from '@/shared/utils';

import { useSetBSTLoadedAt } from '../../api';
import type { BSTTransferDetail } from '../../types';
import { formatBstDateTime, toBstDateTimeInput } from './bstFormat';

/** The permission that lets a supervisor move the handoff stamp. */
const EDIT_PERMISSION = 'warehouse.can_edit_bst_loaded_at';

/**
 * Loaded at — the handover line between the two teams.
 *
 * Everything above this time is the dispatch team's work (scanning and loading
 * the vehicle); everything after it is the gate's. It is stamped when the
 * transfer is sealed, because approving is the sender's last act on the load —
 * but a truck is often loaded well before anyone reaches a screen, so a
 * supervisor can correct the time afterwards. Corrections are shown, never
 * silent.
 *
 * **Only for a transfer that leaves on a vehicle.** An internal move is one
 * warehouse team putting pallets on a lift and the receiving warehouse's team
 * taking them off — no dispatch team and no gate, so there is no handover for
 * this card to mark and it renders nothing.
 */
export function BSTLoadedAtCard({ transfer }: { transfer: BSTTransferDetail }) {
  const [open, setOpen] = useState(false);
  const canEdit = useHasPermission(EDIT_PERMISSION);
  // Nothing to correct until the load is sealed, and a cancelled transfer's
  // history is closed — the same two refusals the backend makes.
  const editable = canEdit && !!transfer.loaded_at && transfer.status !== 'CANCELLED';

  if (!transfer.requires_gate) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" /> Loaded at
          </p>
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Correct time
            </Button>
          )}
        </div>

        {transfer.loaded_at ? (
          <>
            <p className="text-lg font-semibold">{formatBstDateTime(transfer.loaded_at)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {transfer.loaded_by_name
                ? `Loading closed by ${transfer.loaded_by_name}. `
                : 'Loading closed. '}
              The gate&rsquo;s work on this transfer starts here.
            </p>
            {transfer.loaded_at_edited_at && (
              <p className="mt-2 text-xs text-amber-700">
                Time corrected
                {transfer.loaded_at_edited_by_name ? ` by ${transfer.loaded_at_edited_by_name}` : ''}{' '}
                on {formatBstDateTime(transfer.loaded_at_edited_at)}.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Still with the dispatch team — the time is stamped when the transfer is approved and
            handed to the gate.
          </p>
        )}
      </CardContent>

      {/* Mounted only while open so the field always starts from the saved time. */}
      {open && <LoadedAtDialog transfer={transfer} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function LoadedAtDialog({
  transfer,
  onClose,
}: {
  transfer: BSTTransferDetail;
  onClose: () => void;
}) {
  const [value, setValue] = useState(() => toBstDateTimeInput(transfer.loaded_at));
  const saveMut = useSetBSTLoadedAt();

  const original = toBstDateTimeInput(transfer.loaded_at);
  const changed = value !== '' && value !== original;

  const handleSave = async () => {
    if (!changed) {
      onClose();
      return;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      toast.error('Enter a valid date and time');
      return;
    }
    try {
      await saveMut.mutateAsync({ transferId: transfer.id, loadedAt: parsed.toISOString() });
      toast.success('Loaded time updated');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the loaded time'));
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct loaded time — {transfer.entry_no}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set when loading actually finished. It has to sit between the time this BST was
            created and whatever happened next — the gate-out or the destination&rsquo;s receipt.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="bst-loaded-at">Loading finished</Label>
            <Input
              id="bst-loaded-at"
              type="datetime-local"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!changed || saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save time
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
