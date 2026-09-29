/**
 * Enter an oil's opening stock: what its tanks held before lots were tracked.
 *
 * It goes in as a lot already in the tanks, so the oil's average cost has
 * something to start from. EXIM offered it only for an oil whose litres no lot
 * accounts for, at the rate typed and for everything in its tanks; the list
 * here is the same, and the litres start as the tanks' but may be changed.
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
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useOpeningStock } from '../../api';
import { fmtLitres, fmtMoney, LITRES_PER_KG } from '../../utils';

export interface OpeningStockOil {
  item: number;
  code: string;
  name: string;
  /** Litres in its tanks, which the quantity starts as. */
  litres: number;
}

export function OpeningStockDialog({
  open,
  onOpenChange,
  oils,
  initialItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The oils an opening stock may be entered for. */
  oils: OpeningStockOil[];
  initialItem?: number | null;
}) {
  const save = useOpeningStock();
  const [item, setItem] = useState('');
  const [rate, setRate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState<{ item?: string; rate?: string; quantity?: string }>({});
  const [serverError, setServerError] = useState('');

  function pick(value: string) {
    setItem(value);
    const oil = oils.find((o) => String(o.item) === value);
    setQuantity(oil ? String(oil.litres) : '');
    setErrors({});
  }

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const first =
        oils.find((o) => o.item === initialItem) ?? (oils.length === 1 ? oils[0] : null);
      setItem(first ? String(first.item) : '');
      setQuantity(first ? String(first.litres) : '');
      setRate('');
      setErrors({});
      setServerError('');
    }
  }

  const chosen = oils.find((o) => String(o.item) === item);
  const value = Number(rate) > 0 && Number(quantity) > 0 ? Number(rate) * Number(quantity) : null;

  async function submit() {
    const found: typeof errors = {};
    if (!chosen) found.item = 'Which oil?';
    if (!(Number(rate) > 0)) found.rate = 'A rate is more than nothing.';
    if (!(Number(quantity) > 0)) found.quantity = 'How many litres?';
    setErrors(found);
    if (Object.keys(found).length || !chosen) return;
    setServerError('');
    try {
      await save.mutateAsync({
        item: chosen.item,
        rate_per_litre: Number(rate).toFixed(3),
        quantity_litres: Number(quantity).toFixed(2),
      });
      toast.success(`Opening stock entered for ${chosen.name}`);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not enter the opening stock.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter opening stock</DialogTitle>
          <DialogDescription>
            For oil already in the tanks with no lot to cost it. It is entered as a lot in the
            tanks, so the oil's average cost has something to start from.
          </DialogDescription>
        </DialogHeader>

        {oils.length === 0 ? (
          <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Every oil in the tanks already has a lot costing it.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="opening-oil">Oil</Label>
              <NativeSelect
                id="opening-oil"
                value={item}
                onChange={(event) => pick(event.target.value)}
              >
                <SelectOption value="">Choose the oil</SelectOption>
                {oils.map((oil) => (
                  <SelectOption key={oil.item} value={String(oil.item)}>
                    {oil.code} · {oil.name} — {fmtLitres(oil.litres)} L in the tanks
                  </SelectOption>
                ))}
              </NativeSelect>
              {errors.item && <p className="text-xs text-rose-600">{errors.item}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="opening-rate">Rate per litre (₹)</Label>
                <Input
                  id="opening-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  value={rate}
                  onChange={(event) => {
                    setRate(event.target.value);
                    setErrors((current) => ({ ...current, rate: undefined }));
                  }}
                  placeholder="125.50"
                  autoFocus
                />
                {errors.rate ? (
                  <p className="text-xs text-rose-600">{errors.rate}</p>
                ) : (
                  Number(rate) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ₹ {fmtMoney(Number(rate) * LITRES_PER_KG)} per kg
                    </p>
                  )
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opening-qty">Quantity (litres)</Label>
                <Input
                  id="opening-qty"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.target.value);
                    setErrors((current) => ({ ...current, quantity: undefined }));
                  }}
                />
                {errors.quantity && <p className="text-xs text-rose-600">{errors.quantity}</p>}
              </div>
            </div>

            {value !== null && (
              <p className="text-sm text-muted-foreground">
                Worth <span className="font-medium text-foreground">₹ {fmtMoney(value)}</span>
              </p>
            )}
          </div>
        )}

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          {oils.length > 0 && (
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? 'Entering…' : 'Enter opening stock'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
