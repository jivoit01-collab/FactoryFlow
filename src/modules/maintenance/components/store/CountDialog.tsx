import { Scale } from 'lucide-react';
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
import { cn } from '@/shared/utils';

import { useAdjustSpareStock } from '../../api';
import type { MaintenanceSpare } from '../../types';
import { formatQty, parseCount, toNumber } from './storeFormat';

const REASONS = ['Counted on shelf', 'Damaged', 'Lost', 'Found extra'];

/** Set the stock to what is really on the shelf. A reason is kept with it. */
export function CountDialog({
  spare,
  onOpenChange,
}: {
  spare: MaintenanceSpare;
  onOpenChange: (open: boolean) => void;
}) {
  const adjust = useAdjustSpareStock();
  const current = toNumber(spare.current_stock);
  const [counted, setCounted] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = parseCount(counted);
    if (value === null || value < 0) {
      setError('Write how many are on the shelf.');
      return;
    }
    if (value === current) {
      setError('Same as before. Nothing to change.');
      return;
    }
    if (!reason.trim()) {
      setError('Pick a reason.');
      return;
    }
    try {
      await adjust.mutateAsync({
        spareId: spare.id,
        payload: { new_stock: String(value), reason: reason.trim() },
      });
      toast.success('Stock updated');
      onOpenChange(false);
    } catch {
      // The API client has already shown the error.
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Count again</DialogTitle>
          <DialogDescription>
            {spare.name} · now {formatQty(current)} {spare.uom}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="count-value" className="text-base">
              How many are on the shelf?
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="count-value"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                autoFocus
                className="h-12 text-lg tabular-nums"
                value={counted}
                onChange={(event) => {
                  setError('');
                  setCounted(event.target.value);
                }}
              />
              <span className="text-muted-foreground">{spare.uom}</span>
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-base font-medium">Why?</legend>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={reason === option}
                  onClick={() => setReason(option)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    reason === option
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-slate-300 hover:bg-muted dark:border-border',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <Input
              aria-label="Other reason"
              placeholder="Or write a reason"
              value={REASONS.includes(reason) ? '' : reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </fieldset>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={adjust.isPending}>
              <Scale />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
