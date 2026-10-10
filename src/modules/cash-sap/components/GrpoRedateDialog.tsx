import { CalendarClock, Loader2 } from 'lucide-react';
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
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useRedateGrpo } from '../api';
import type { GrpoRedatePayload, GrpoSapPlan } from '../types';
import { money } from '../utils/status';
import { fmt, humanDate, isFutureDate, parseDay, today } from '../utils/voucherDates';

interface GrpoRedateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bunchId: number;
  grpo: GrpoSapPlan | null;
  /** The PO's own date: a GRPO cannot be dated before it. */
  poDocDate: string | null;
}

/**
 * Move a GRPO's posting date, or fix its G.no., once the PO is in SAP and the
 * GRPO is not (`PATCH bunches/<id>/grpos/<g>/`).
 *
 * For a GRPO SAP refused because its month is closed: the posting date moves
 * after the PO, while the bill's own date stays on the tax date, the vendor
 * reference and Dim2 (spec D5). The rules are the server's -- not in the
 * future, not before the PO, not before the bill -- and are checked here first
 * so the button says why before it is pressed.
 */
export function GrpoRedateDialog(props: GrpoRedateDialogProps) {
  if (!props.open || !props.grpo || props.grpo.id == null) return null;
  return <RedateForm {...props} grpo={props.grpo} grpoId={props.grpo.id} />;
}

function RedateForm({
  onOpenChange,
  bunchId,
  grpo,
  grpoId,
  poDocDate,
}: GrpoRedateDialogProps & { grpo: GrpoSapPlan; grpoId: number }) {
  const initialDate = grpo.posting_date ?? grpo.bill_date ?? '';
  const [postingDate, setPostingDate] = useState(initialDate);
  const [gateNo, setGateNo] = useState(grpo.gate_entry_no ?? '');
  const redate = useRedateGrpo(bunchId);

  const now = today();
  const floor = [poDocDate, grpo.bill_date]
    .filter((d): d is string => !!parseDay(d))
    .sort()
    .pop();

  let problem = '';
  if (postingDate && isFutureDate(postingDate, now)) {
    problem = 'A GRPO cannot be dated in the future.';
  } else if (postingDate && poDocDate && postingDate < poDocDate) {
    problem = `A GRPO cannot be dated before its PO (${fmt(poDocDate)}).`;
  } else if (postingDate && grpo.bill_date && postingDate < grpo.bill_date) {
    problem = 'A GRPO cannot be dated before its bill.';
  }

  async function submit() {
    const payload: GrpoRedatePayload = {};
    if (postingDate && postingDate !== initialDate) payload.posting_date = postingDate;
    if (gateNo.trim() !== (grpo.gate_entry_no ?? '')) payload.gate_entry_no = gateNo.trim();
    if (Object.keys(payload).length === 0) {
      toast.info('Nothing was changed.');
      return;
    }
    try {
      await redate.mutateAsync({ grpoId, payload });
      toast.success('GRPO changed. Press Retry (or Post) to send it.');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The GRPO could not be changed.'));
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Change the GRPO&apos;s date or G.no.</DialogTitle>
          <DialogDescription>
            {grpo.num_at_card || grpo.group_key} · {money(grpo.amount)} · bill of{' '}
            {grpo.bill_date ? fmt(grpo.bill_date) : '—'}. The bill&apos;s own date stays on the tax
            date, the vendor reference and Dim2.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="grd-posting-date">Posting date</Label>
            <Input
              id="grd-posting-date"
              type="date"
              min={floor}
              max={now}
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{humanDate(postingDate)}</p>
            {problem && <p className="text-xs text-destructive">{problem}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="grd-gate-no">G.no.</Label>
            <Input
              id="grd-gate-no"
              maxLength={60}
              value={gateNo}
              onChange={(e) => setGateNo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={redate.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={redate.isPending || !!problem}>
            {redate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarClock className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
