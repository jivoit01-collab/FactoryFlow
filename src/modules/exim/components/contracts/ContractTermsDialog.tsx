/**
 * Set how a PO is delivered, and the freight and brokerage its landed cost adds.
 *
 * The one part of a contract SAP does not hold. FOR: the supplier delivers and
 * the price includes the truck, so there is no freight to add (the server
 * refuses one). EXW: we collect the oil and pay the truck, per tonne unloaded.
 * Brokerage is per tonne loaded, on either. Every landed cost on the PO is
 * worked out again once they are saved.
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

import { useSetContractTerms } from '../../api';
import type { ContractTerms, DeliveryTerms } from '../../types';
import { type Choice, ChoiceGroup } from '../lots/LotBits';
import { withinDecimals } from '../lots/lotFormat';

interface Form {
  delivery_terms: DeliveryTerms;
  freight: string;
  brokerage: string;
  note: string;
}

const CHOICES: Choice<DeliveryTerms>[] = [
  { value: 'FOR', label: 'FOR', hint: 'The supplier delivers. Their price includes the freight.' },
  { value: 'EXW', label: 'EXW', hint: 'We collect the oil and pay the truck.' },
  { value: '', label: 'Not set yet', hint: 'The landed cost leaves out freight until it is.' },
];

/** The server keeps twelve digits, two of them after the point. */
const MAX_RATE = 1e10;

function amount(value: number | null): string {
  return value !== null && value > 0 ? String(value) : '';
}

function fromTerms(terms: ContractTerms): Form {
  return {
    delivery_terms: terms.delivery_terms,
    freight: terms.delivery_terms === 'FOR' ? '' : amount(terms.freight_per_mt),
    brokerage: amount(terms.brokerage_per_mt),
    note: terms.note ?? '',
  };
}

function rateProblem(value: string): string | undefined {
  const text = value.trim();
  if (!text) return undefined;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return 'A rate is a number, nothing below zero.';
  if (!withinDecimals(text, 2)) return 'Two decimal places at most.';
  if (n >= MAX_RATE) return 'That is more than a rate can be.';
  return undefined;
}

export function ContractTermsDialog({
  open,
  onOpenChange,
  poNumber,
  terms,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poNumber: string;
  terms: ContractTerms;
}) {
  const save = useSetContractTerms(poNumber);
  const [form, setForm] = useState<Form>(() => fromTerms(terms));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState('');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(fromTerms(terms));
      setErrors({});
      setServerError('');
    }
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  }

  function pickTerms(value: DeliveryTerms) {
    // FOR carries no freight: the supplier's price already includes it.
    setForm((current) => ({
      ...current,
      delivery_terms: value,
      freight: value === 'FOR' ? '' : current.freight,
    }));
    setErrors((current) => ({ ...current, freight: undefined }));
    setServerError('');
  }

  async function submit() {
    const found: Partial<Record<keyof Form, string>> = {};
    const freightProblem = form.delivery_terms === 'FOR' ? undefined : rateProblem(form.freight);
    const brokerageProblem = rateProblem(form.brokerage);
    if (freightProblem) found.freight = freightProblem;
    if (brokerageProblem) found.brokerage = brokerageProblem;
    setErrors(found);
    if (Object.keys(found).length) return;
    setServerError('');
    try {
      await save.mutateAsync({
        delivery_terms: form.delivery_terms,
        freight_per_mt: form.delivery_terms === 'FOR' ? '0' : form.freight.trim() || '0',
        brokerage_per_mt: form.brokerage.trim() || '0',
        note: form.note.trim(),
      });
      toast.success(`PO ${poNumber}: terms saved, and its landed cost worked out again`);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'The terms could not be saved.'));
    }
  }

  const isFor = form.delivery_terms === 'FOR';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Terms of PO {poNumber}</DialogTitle>
          <DialogDescription>
            How the oil is delivered, and what bringing it in costs on top of the supplier&apos;s
            bill. Every landed cost on this PO is worked out again from these.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <ChoiceGroup<DeliveryTerms>
            label="Delivery terms"
            value={form.delivery_terms}
            onChange={pickTerms}
            options={CHOICES}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="terms-freight">Freight (₹ per MT)</Label>
              <Input
                id="terms-freight"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={isFor ? '' : form.freight}
                disabled={isFor}
                onChange={(event) => set('freight', event.target.value)}
                placeholder={isFor ? 'None on FOR' : '0.00'}
              />
              {errors.freight ? (
                <p className="text-xs text-rose-600">{errors.freight}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isFor
                    ? 'The supplier pays the truck on FOR.'
                    : 'Charged on the tonnes weighed in.'}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="terms-brokerage">Brokerage (₹ per MT)</Label>
              <Input
                id="terms-brokerage"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.brokerage}
                onChange={(event) => set('brokerage', event.target.value)}
                placeholder="0.00"
              />
              {errors.brokerage ? (
                <p className="text-xs text-rose-600">{errors.brokerage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Charged on the tonnes the supplier billed.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="terms-note">Note</Label>
            <Textarea
              id="terms-note"
              rows={2}
              maxLength={255}
              value={form.note}
              onChange={(event) => set('note', event.target.value)}
              placeholder="Anything the next reader should know: the broker, the transporter agreed…"
            />
          </div>
        </div>

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save terms'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
