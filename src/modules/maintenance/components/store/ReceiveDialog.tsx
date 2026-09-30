import { PackageCheck } from 'lucide-react';
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
} from '@/shared/components/ui';

import { useReceiveMaterialIndent } from '../../api';
import type { MaterialIndent } from '../../types';
import { formatQty, linesToReceive, parseCount, toNumber } from './storeFormat';

/**
 * Count in a delivery that the gate let in. Each box starts at what was
 * bought, so a full delivery is one tap; the store only changes a box when
 * less (or more) came.
 */
export function ReceiveDialog({
  indent,
  onOpenChange,
}: {
  indent: MaterialIndent;
  onOpenChange: (open: boolean) => void;
}) {
  const receive = useReceiveMaterialIndent();
  const lines = linesToReceive(indent);
  const [counts, setCounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, String(toNumber(line.shortfall_quantity))])),
  );
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = lines.map((line) => ({ line, value: parseCount(counts[line.id] ?? '') }));
    if (parsed.some(({ value }) => value === null || value < 0)) {
      setError('Write a number in every box. Write 0 if it did not come.');
      return;
    }
    if (!parsed.some(({ value }) => (value ?? 0) > 0)) {
      setError('Nothing counted. Write how many came.');
      return;
    }
    try {
      await receive.mutateAsync({
        indentId: indent.id,
        payload: {
          items: parsed.map(({ line, value }) => ({
            id: line.id,
            received_quantity: String(value),
          })),
        },
      });
      toast.success('Put in store');
      onOpenChange(false);
    } catch {
      // The API client has already shown the error.
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive goods</DialogTitle>
          <DialogDescription>
            {indent.indent_no}
            {indent.requested_by_name && ` · for ${indent.requested_by_name}`}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="text-base font-medium">Count each item. Change the number if less came.</p>
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200/80 p-3 dark:border-border"
              >
                <label htmlFor={`receive-${line.id}`} className="min-w-0 flex-1">
                  <span className="block font-semibold">{line.particulars}</span>
                  {line.specification && (
                    <span className="block text-sm text-muted-foreground">
                      {line.specification}
                    </span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    Bought {formatQty(line.shortfall_quantity)} {line.unit}
                  </span>
                </label>
                <Input
                  id={`receive-${line.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  className="h-12 w-28 text-right text-lg tabular-nums"
                  value={counts[line.id] ?? ''}
                  onChange={(event) => {
                    setError('');
                    setCounts((current) => ({ ...current, [line.id]: event.target.value }));
                  }}
                />
                <span className="w-12 text-sm text-muted-foreground">{line.unit}</span>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={receive.isPending}>
              <PackageCheck />
              Put in store
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
