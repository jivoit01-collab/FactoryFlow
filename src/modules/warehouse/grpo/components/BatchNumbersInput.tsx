import { Plus, X } from 'lucide-react';

import { Button, Input, Label } from '@/shared/components/ui';

import type { GRPOBatchInput } from '../types';
import { batchesCoverQty } from '../utils';

interface BatchNumbersInputProps {
  batches: GRPOBatchInput[];
  /** The line quantity the batches have to add up to. */
  acceptedQty: number;
  uom?: string;
  error?: string;
  disabled?: boolean;
  onChange: (batches: GRPOBatchInput[]) => void;
}

/**
 * Batch (lot) capture for one GRPO line.
 *
 * SAP refuses a receipt line for a batch-managed item unless the document names
 * the batch — it rejects the WHOLE receipt with -4014 ("cannot add row without
 * complete selection of batch/serial numbers"), which tells the operator
 * nothing. So the number is collected here, defaulted to the supplier lot QC
 * already recorded, and checked against the accepted quantity before posting.
 *
 * One row is the normal case. A tanker or truck carrying two supplier lots
 * splits into as many rows as it needs; the quantities must still add up.
 */
export function BatchNumbersInput({
  batches,
  acceptedQty,
  uom,
  error,
  disabled = false,
  onChange,
}: BatchNumbersInputProps) {
  const allocated = batches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);
  const remaining = acceptedQty - allocated;
  const isBalanced = batchesCoverQty(batches, acceptedQty);

  const updateBatch = (index: number, patch: Partial<GRPOBatchInput>) => {
    onChange(batches.map((batch, i) => (i === index ? { ...batch, ...patch } : batch)));
  };

  const addBatch = () => {
    // A split starts with whatever quantity is still unaccounted for.
    onChange([
      ...batches,
      { batch_number: '', quantity: remaining > 0 ? Number(remaining.toFixed(3)) : 0 },
    ]);
  };

  const removeBatch = (index: number) => {
    onChange(batches.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 rounded-md border border-amber-300/70 bg-amber-50/50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">
            Batch / Lot <span className="text-destructive">*</span>
          </Label>
          <p className="text-[11px] text-muted-foreground">
            SAP manages this item by batch and rejects the receipt without one.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs"
          onClick={addBatch}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3 w-3" />
          Split
        </Button>
      </div>

      {batches.map((batch, index) => (
        <div
          key={index}
          className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Batch No.</Label>
            <Input
              value={batch.batch_number}
              onChange={(e) => updateBatch(index, { batch_number: e.target.value })}
              placeholder="Supplier lot / invoice no."
              maxLength={36}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              Qty{uom ? ` (${uom})` : ''}
            </Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={batch.quantity}
              onChange={(e) =>
                updateBatch(index, {
                  quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Mfg Date</Label>
            <Input
              type="date"
              value={batch.manufacturing_date ?? ''}
              onChange={(e) =>
                updateBatch(index, { manufacturing_date: e.target.value || undefined })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Expiry</Label>
            <Input
              type="date"
              value={batch.expiry_date ?? ''}
              onChange={(e) => updateBatch(index, { expiry_date: e.target.value || undefined })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          {batches.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => removeBatch(index)}
              disabled={disabled}
              aria-label="Remove batch"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {batches.length > 1 && (
        <p className={`text-xs ${isBalanced ? 'text-muted-foreground' : 'text-destructive'}`}>
          Allocated {allocated} of {acceptedQty}
          {uom ? ` ${uom}` : ''}
          {isBalanced ? '' : ` — ${remaining > 0 ? `${remaining} left` : `${-remaining} over`}`}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
