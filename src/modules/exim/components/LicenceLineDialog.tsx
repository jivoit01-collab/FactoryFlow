/**
 * Add a bill of entry or shipping bill to a licence, or correct one.
 *
 * A line of the licence's second leg (an Advance export, a DFIA import) may
 * name the first-leg line it answers; the choice is from this licence's own
 * lines, which the page already holds, so nothing extra is fetched.
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

import { useAddLine, useUpdateLine } from '../api';
import type { LicenceDetail, LicenceLine, LineDirection, LinePayload } from '../types';
import { fmtQty } from '../utils';
import { DIRECTION_COPY, firstLeg, secondLeg } from './copy';

type Form = Omit<LinePayload, 'linked_line'> & { linked_line: string };

function emptyForm(): Form {
  return { document_no: '', document_date: '', value_usd: '', quantity_mts: '', linked_line: '' };
}

function fromLine(line: LicenceLine): Form {
  return {
    document_no: line.document_no,
    document_date: line.document_date ?? '',
    value_usd: line.value_usd,
    quantity_mts: line.quantity_mts,
    linked_line: line.linked_line ? String(line.linked_line) : '',
  };
}

export function LicenceLineDialog({
  open,
  onOpenChange,
  licence,
  direction,
  line,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licence: LicenceDetail;
  direction: LineDirection;
  /** The line to correct. Left out, the dialog adds one. */
  line?: LicenceLine | null;
}) {
  const copy = DIRECTION_COPY[direction];
  const add = useAddLine(licence.id);
  const update = useUpdateLine();
  const linkable = direction === secondLeg(licence.kind);
  const firstLegLines = licence.lines.filter((l) => l.direction === firstLeg(licence.kind));
  const firstLegCopy = DIRECTION_COPY[firstLeg(licence.kind)];

  // Seeded from the line as well as reset on opening: the detail page mounts
  // this dialog already open, so the reset below never sees a transition then.
  const [form, setForm] = useState<Form>(() => (line ? fromLine(line) : emptyForm()));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState('');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(line ? fromLine(line) : emptyForm());
      setErrors({});
      setServerError('');
    }
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate(): boolean {
    const found: Partial<Record<keyof Form, string>> = {};
    if (!form.document_no.trim()) found.document_no = `What is the ${copy.docLabel}?`;
    // A bill of entry is always dated; a shipping bill may not be yet.
    if (direction === 'IMPORT' && !form.document_date) found.document_date = 'When was it filed?';
    if (!form.value_usd) found.value_usd = 'What is it worth?';
    if (!(Number(form.quantity_mts) > 0)) found.quantity_mts = 'How many tonnes?';
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setServerError('');
    const payload: LinePayload = {
      document_no: form.document_no.trim(),
      document_date: form.document_date || null,
      value_usd: form.value_usd,
      quantity_mts: form.quantity_mts,
      linked_line: linkable && form.linked_line ? Number(form.linked_line) : null,
    };
    try {
      if (line) {
        await update.mutateAsync({ lineId: line.id, payload });
        toast.success(`${payload.document_no} saved`);
      } else {
        await add.mutateAsync({ ...payload, direction });
        toast.success(`${payload.document_no} added to ${licence.number}`);
      }
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, `Could not save the ${copy.one}.`));
    }
  }

  const saving = add.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="first-letter:uppercase">
            {line ? `Edit ${copy.one} ${line.document_no}` : `Add a ${copy.one}`}
          </DialogTitle>
          <DialogDescription>
            {licence.kind_label} {licence.number}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {linkable && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="line-linked">Against {firstLegCopy.one}</Label>
              <NativeSelect
                id="line-linked"
                value={form.linked_line}
                onChange={(event) => set('linked_line', event.target.value)}
              >
                <SelectOption value="">Not named</SelectOption>
                {firstLegLines.map((l) => (
                  <SelectOption key={l.id} value={String(l.id)}>
                    {l.document_no} · {fmtQty(l.quantity_mts)} MT
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="line-doc">{copy.docLabel}</Label>
            <Input
              id="line-doc"
              value={form.document_no}
              onChange={(event) => set('document_no', event.target.value)}
              autoFocus
            />
            {errors.document_no && <p className="text-xs text-rose-600">{errors.document_no}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="line-date">{copy.dateLabel}</Label>
            <Input
              id="line-date"
              type="date"
              value={form.document_date ?? ''}
              onChange={(event) => set('document_date', event.target.value)}
            />
            {errors.document_date && (
              <p className="text-xs text-rose-600">{errors.document_date}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="line-value">{copy.valueLabel}</Label>
            <Input
              id="line-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              value={form.value_usd}
              onChange={(event) => set('value_usd', event.target.value)}
            />
            {errors.value_usd && <p className="text-xs text-rose-600">{errors.value_usd}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="line-qty">{copy.qtyLabel}</Label>
            <Input
              id="line-qty"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              value={form.quantity_mts}
              onChange={(event) => set('quantity_mts', event.target.value)}
            />
            {errors.quantity_mts && <p className="text-xs text-rose-600">{errors.quantity_mts}</p>}
          </div>
        </div>

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : line ? 'Save changes' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
