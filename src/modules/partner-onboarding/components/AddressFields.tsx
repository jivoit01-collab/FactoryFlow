import { Trash2 } from 'lucide-react';

import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { SapOption } from '../api';
import { COUNTRIES } from '../constants';
import { type AddressDraft, addressNamePreview, type FormErrors } from '../utils/registrationForm';
import { Field } from './Field';

/**
 * One address block. The name is not typed: the server builds it as
 * `<NAME> - <STATE>` (SAP Portal froze it the same way), so it is only shown.
 */
export function AddressFields({
  idPrefix,
  title,
  address,
  cardName,
  states,
  statesUnavailable,
  errors,
  errorPrefix,
  onChange,
  onRemove,
}: {
  idPrefix: string;
  title: string;
  address: AddressDraft;
  cardName: string;
  states: SapOption[];
  statesUnavailable?: boolean;
  errors: FormErrors;
  errorPrefix: string;
  onChange: (next: AddressDraft) => void;
  onRemove?: () => void;
}) {
  const set = (patch: Partial<AddressDraft>) => onChange({ ...address, ...patch });
  const error = (field: string) => errors[`${errorPrefix}.${field}`];
  const preview = addressNamePreview(cardName, address.state);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {preview && <p className="text-xs text-muted-foreground">Name in SAP: {preview}</p>}
        </div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Street"
          htmlFor={`${idPrefix}-street`}
          required
          error={error('street')}
          className="sm:col-span-2"
        >
          <Input
            id={`${idPrefix}-street`}
            value={address.street}
            maxLength={100}
            onChange={(e) => set({ street: e.target.value })}
            placeholder="House / plot no., street"
          />
        </Field>
        <Field label="Block / area" htmlFor={`${idPrefix}-block`} error={error('block')}>
          <Input
            id={`${idPrefix}-block`}
            value={address.block}
            maxLength={100}
            onChange={(e) => set({ block: e.target.value })}
          />
        </Field>
        <Field label="City" htmlFor={`${idPrefix}-city`} required error={error('city')}>
          <Input
            id={`${idPrefix}-city`}
            value={address.city}
            maxLength={100}
            onChange={(e) => set({ city: e.target.value })}
          />
        </Field>
        <Field label="PIN code" htmlFor={`${idPrefix}-zip`} error={error('zip_code')}>
          <Input
            id={`${idPrefix}-zip`}
            value={address.zip_code}
            maxLength={20}
            onChange={(e) => set({ zip_code: e.target.value })}
          />
        </Field>
        <Field label="Country" htmlFor={`${idPrefix}-country`} error={error('country')}>
          <NativeSelect
            id={`${idPrefix}-country`}
            value={address.country}
            onChange={(e) =>
              set({ country: e.target.value, state: e.target.value === 'IN' ? address.state : '' })
            }
          >
            {COUNTRIES.map((country) => (
              <SelectOption key={country.value} value={country.value}>
                {country.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="State"
          htmlFor={`${idPrefix}-state`}
          required={address.country === 'IN'}
          error={
            error('state') ??
            (statesUnavailable ? 'The state list could not be loaded; try again.' : undefined)
          }
        >
          <NativeSelect
            id={`${idPrefix}-state`}
            value={address.state}
            disabled={address.country !== 'IN'}
            onChange={(e) => set({ state: e.target.value })}
          >
            <SelectOption value="">— Select state —</SelectOption>
            {states.map((state) => (
              <SelectOption key={String(state.code)} value={String(state.code)}>
                {state.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="GSTIN for this address"
          htmlFor={`${idPrefix}-gstin`}
          error={error('gstin')}
          hint="Optional — the state-wise GSTIN, if different"
        >
          <Input
            id={`${idPrefix}-gstin`}
            value={address.gstin}
            maxLength={15}
            onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
            placeholder="06ABCDE1234F1Z5"
          />
        </Field>
      </div>
    </div>
  );
}
