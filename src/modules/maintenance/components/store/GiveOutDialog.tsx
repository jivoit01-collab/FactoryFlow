import { HandHelping } from 'lucide-react';
import type { FormEvent } from 'react';
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

import { useGiveOutSpare, useIssueSpareRequest } from '../../api';
import type { MaintenanceSpare, SpareRequest } from '../../types';
import { formatQty, parseCount, toNumber } from './storeFormat';

/**
 * Hand stock out of the store. With a work order's request it fills that
 * request; without one it asks who took it, so the history says where the
 * stock went. Nothing is refused for want of stock: until the store's real
 * stock is entered the count may go below zero, and the dialog only says so.
 */
export function GiveOutDialog({
  spare,
  request,
  onOpenChange,
}: {
  spare: MaintenanceSpare;
  request?: SpareRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const giveOut = useGiveOutSpare();
  const issue = useIssueSpareRequest();
  const inStore = toNumber(spare.current_stock);
  const asked = request ? toNumber(request.pending_issue_qty) : 0;
  const [quantity, setQuantity] = useState(() => (request ? String(asked) : ''));
  const [givenTo, setGivenTo] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = parseCount(quantity);
    if (value === null || value <= 0) {
      setError('Write how many.');
      return;
    }
    if (!request && !givenTo.trim()) {
      setError('Write who took it.');
      return;
    }
    try {
      if (request) {
        await issue.mutateAsync({
          requestId: request.id,
          payload: { quantity: String(value), remarks: '' },
        });
      } else {
        await giveOut.mutateAsync({
          spareId: spare.id,
          payload: { quantity: String(value), given_to: givenTo.trim() },
        });
      }
      toast.success(`Gave ${formatQty(value)} ${spare.uom}`);
      onOpenChange(false);
    } catch {
      // The API client has already shown the error.
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give out</DialogTitle>
          <DialogDescription>
            {request
              ? `For work order ${request.work_order_no}`
              : 'Write how many and who took it.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-border dark:bg-muted/25">
            <div className="text-lg font-semibold">{spare.name}</div>
            <div className="text-sm text-muted-foreground">
              In store: {formatQty(inStore)} {spare.uom}
              {request && ` · Asked: ${formatQty(asked)} ${spare.uom}`}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="give-quantity" className="text-base">
              How many?
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="give-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                autoFocus
                className="h-12 text-lg tabular-nums"
                value={quantity}
                onChange={(event) => {
                  setError('');
                  setQuantity(event.target.value);
                }}
              />
              <span className="text-muted-foreground">{spare.uom}</span>
            </div>
            {(parseCount(quantity) ?? 0) > inStore && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                The store will show {formatQty(inStore - (parseCount(quantity) ?? 0))} {spare.uom}{' '}
                after this.
              </p>
            )}
          </div>
          {!request && (
            <div className="space-y-2">
              <Label htmlFor="give-to" className="text-base">
                Who took it?
              </Label>
              <Input
                id="give-to"
                className="h-12 text-lg"
                placeholder="Name"
                value={givenTo}
                onChange={(event) => {
                  setError('');
                  setGivenTo(event.target.value);
                }}
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={giveOut.isPending || issue.isPending}>
              <HandHelping />
              Give
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
