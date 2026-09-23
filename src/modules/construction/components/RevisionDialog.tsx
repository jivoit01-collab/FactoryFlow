/**
 * Ask for more budget, more time, or both.
 *
 * One dialog for both, because that is how it happens on site — "we need two
 * more months and three lakh more" is one conversation. Either field may be
 * left empty; at least one must be filled, which the backend enforces too.
 *
 * Opened pre-filled with the shortfall when a project has gone over budget,
 * which is what turns the overrun banner into an action rather than a scolding.
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
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useRequestRevision } from '../api';
import { formatDate, formatMoney } from '../utils';

export function RevisionDialog({
  projectId,
  open,
  onOpenChange,
  currentBudget,
  currentEndDate,
  prefillAmount,
}: {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: string;
  /**
   * Null only in theory: a revision is raised against a sanctioned project,
   * and nothing reaches APPROVED without an end date. Typed honestly anyway,
   * because "cannot happen" is how a screen ends up blank instead of wrong.
   */
  currentEndDate: string | null;
  /** The overrun, when the banner opened this. */
  prefillAmount?: string;
}) {
  const request = useRequestRevision(projectId);
  const [amount, setAmount] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Clear the form as the dialog opens. Derived during render rather than in an
  // effect, which would flash the previous ask for one frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmount(prefillAmount ?? '');
      setNewEnd('');
      setReason('');
      setError('');
    }
  }

  const asksForMoney = Number(amount) > 0;
  /** The server wants strictly later, so the picker must not offer the current
   *  date as though it were a valid choice. */
  const earliestNewEnd = new Date(new Date(currentEndDate ?? '').getTime() + 86_400_000)
    .toISOString()
    .slice(0, 10);
  const asksForTime = Boolean(newEnd);

  async function submit() {
    if (!asksForMoney && !asksForTime) {
      setError('Ask for more budget, more time, or both.');
      return;
    }
    if (!reason.trim()) {
      setError('Say why. This is what the approver reads.');
      return;
    }
    if (asksForTime && currentEndDate && newEnd <= currentEndDate) {
      setError('The new date must be later than the current one.');
      return;
    }
    try {
      await request.mutateAsync({
        additional_amount: asksForMoney ? amount : undefined,
        new_end_date: asksForTime ? newEnd : undefined,
        reason: reason.trim(),
      });
      toast.success('Revision sent for approval');
      onOpenChange(false);
    } catch (caught) {
      toast.error(getErrorMessage(caught, 'Could not raise the revision.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask for more</DialogTitle>
          <DialogDescription>
            Budget now {formatMoney(currentBudget)}
            {currentEndDate ? `, ends ${formatDate(currentEndDate)}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rev-amount">Extra budget (₹)</Label>
            <Input
              id="rev-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError('');
              }}
              placeholder="Leave empty if only the date is moving"
            />
            {asksForMoney && (
              <p className="text-xs text-muted-foreground">
                {formatMoney(currentBudget)} →{' '}
                <span className="font-medium text-foreground">
                  {formatMoney(String(Number(currentBudget) + Number(amount)))}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rev-date">New expected ending</Label>
            <Input
              id="rev-date"
              type="date"
              min={earliestNewEnd}
              value={newEnd}
              onChange={(event) => {
                setNewEnd(event.target.value);
                setError('');
              }}
            />
            {asksForTime && (
              <p className="text-xs text-muted-foreground">
                {currentEndDate ? formatDate(currentEndDate) : '—'} →{' '}
                <span className="font-medium text-foreground">{formatDate(newEnd)}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rev-reason">Why</Label>
            <Textarea
              id="rev-reason"
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError('');
              }}
              placeholder="Foundation depth revised after the soil test."
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={request.isPending}>
            {request.isPending ? 'Sending…' : 'Send for approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
