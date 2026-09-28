/**
 * Put a licence on the register, or correct one.
 *
 * What is typed is what is on the licence document: its number, dates, CIF and
 * FOB in rupees with the rate each was converted at, and the quantity it
 * authorises. The dollar values are worked out (shown as a preview here, and
 * again by the server); the totals come from the lines. The number cannot be
 * changed once saved — it is how customs knows the licence.
 */
import { type ReactNode, useState } from 'react';
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

import { useCreateLicence, useUpdateLicence } from '../api';
import type { LicenceDetail, LicenceKind, LicencePayload } from '../types';
import { usdPreview } from '../utils';
import { KIND_COPY } from './copy';

type Form = LicencePayload & { number: string };

function emptyForm(): Form {
  return {
    number: '',
    status: 'OPEN',
    issue_date: '',
    import_validity: '',
    export_validity: '',
    cif_value_inr: '',
    cif_exchange_rate: '',
    fob_value_inr: '',
    fob_exchange_rate: '',
    authorised_qty_mts: '',
  };
}

function fromLicence(licence: LicenceDetail): Form {
  return {
    number: licence.number,
    status: licence.status,
    issue_date: licence.issue_date,
    import_validity: licence.import_validity,
    export_validity: licence.export_validity,
    cif_value_inr: licence.cif_value_inr,
    cif_exchange_rate: licence.cif_exchange_rate,
    fob_value_inr: licence.fob_value_inr,
    fob_exchange_rate: licence.fob_exchange_rate,
    authorised_qty_mts: licence.authorised_qty_mts,
  };
}

const REQUIRED: [keyof Form, string][] = [
  ['issue_date', 'When was it issued?'],
  ['import_validity', 'Until when may it be imported against?'],
  ['export_validity', 'Until when may it be exported against?'],
  ['authorised_qty_mts', 'How much does it authorise?'],
  ['cif_value_inr', 'What is its CIF value?'],
  ['cif_exchange_rate', 'At what rate?'],
  ['fob_value_inr', 'What is its FOB value?'],
  ['fob_exchange_rate', 'At what rate?'],
];

export function LicenceFormDialog({
  open,
  onOpenChange,
  kind,
  licence,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LicenceKind;
  /** The licence to correct. Left out, the dialog raises a new one. */
  licence?: LicenceDetail | null;
  onCreated?: (licence: LicenceDetail) => void;
}) {
  const isEdit = !!licence;
  const copy = KIND_COPY[kind];
  const create = useCreateLicence();
  const update = useUpdateLicence(licence?.id ?? 0);

  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState('');

  // A dialog is not unmounted between openings, so reset on the way in, during
  // render rather than in an effect, so the fields never flash the last one.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(licence ? fromLicence(licence) : emptyForm());
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
    if (!isEdit && !form.number.trim())
      found.number = `What is its ${copy.numberLabel.toLowerCase()}?`;
    for (const [key, message] of REQUIRED) {
      if (!String(form[key]).trim()) found[key] = message;
    }
    for (const key of ['cif_exchange_rate', 'fob_exchange_rate'] as const) {
      if (form[key] && !(Number(form[key]) > 0)) found[key] = 'A rate is more than nothing.';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setServerError('');
    const { number, ...payload } = form;
    try {
      if (licence) {
        await update.mutateAsync(payload);
        toast.success(`${licence.number} saved`);
      } else {
        const created = await create.mutateAsync({ ...payload, kind, number: number.trim() });
        toast.success(`${created.number} is on the register`);
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not save the licence.'));
    }
  }

  const saving = create.isPending || update.isPending;
  const cifUsd = usdPreview(form.cif_value_inr, form.cif_exchange_rate);
  const fobUsd = usdPreview(form.fob_value_inr, form.fob_exchange_rate);

  function field(key: keyof Form, label: string, input: ReactNode, hint?: ReactNode) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`licence-${key}`}>{label}</Label>
        {input}
        {errors[key] ? (
          <p className="text-xs text-rose-600">{errors[key]}</p>
        ) : (
          hint && <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }

  function numberInput(key: keyof Form, placeholder: string) {
    return (
      <Input
        id={`licence-${key}`}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.001"
        value={form[key]}
        onChange={(event) => set(key, event.target.value as Form[typeof key])}
        placeholder={placeholder}
      />
    );
  }

  function dateInput(key: keyof Form) {
    return (
      <Input
        id={`licence-${key}`}
        type="date"
        value={form[key]}
        onChange={(event) => set(key, event.target.value as Form[typeof key])}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{licence ? `Edit ${licence.number}` : `New ${copy.title}`}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `The ${copy.numberLabel.toLowerCase()} stays as it is. The totals come from its lines.`
              : copy.blurb}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            'number',
            copy.numberLabel,
            <Input
              id="licence-number"
              value={form.number}
              disabled={isEdit}
              onChange={(event) => set('number', event.target.value)}
              placeholder="511035345"
              autoFocus={!isEdit}
            />,
          )}
          {field(
            'status',
            'Status',
            <NativeSelect
              id="licence-status"
              value={form.status}
              onChange={(event) => set('status', event.target.value as Form['status'])}
            >
              <SelectOption value="OPEN">Open</SelectOption>
              <SelectOption value="CLOSED">Closed</SelectOption>
            </NativeSelect>,
          )}
          {field('issue_date', 'Issue date', dateInput('issue_date'))}
          {field(
            'authorised_qty_mts',
            copy.authorisedLabel,
            numberInput('authorised_qty_mts', '500.000'),
          )}
          {field('import_validity', 'Import validity', dateInput('import_validity'))}
          {field('export_validity', 'Export validity', dateInput('export_validity'))}
          {field(
            'cif_value_inr',
            'CIF value (INR)',
            numberInput('cif_value_inr', '8300000.000'),
            cifUsd && `$ ${cifUsd}`,
          )}
          {field(
            'cif_exchange_rate',
            'CIF exchange rate',
            numberInput('cif_exchange_rate', '83.000'),
          )}
          {field(
            'fob_value_inr',
            'FOB value (INR)',
            numberInput('fob_value_inr', '9130000.000'),
            fobUsd && `$ ${fobUsd}`,
          )}
          {field(
            'fob_exchange_rate',
            'FOB exchange rate',
            numberInput('fob_exchange_rate', '83.000'),
          )}
        </div>

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
