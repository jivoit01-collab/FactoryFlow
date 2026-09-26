import { Trash2 } from 'lucide-react';

import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import { BANK_ACCOUNT_TYPES } from '../constants';
import type { BankDraft, FormErrors } from '../utils/registrationForm';
import { Field } from './Field';

/** One of a vendor's bank accounts. The IFSC goes to SAP as the BIC/SWIFT code. */
export function BankAccountFields({
  index,
  bank,
  errors,
  onChange,
  onRemove,
}: {
  index: number;
  bank: BankDraft;
  errors: FormErrors;
  onChange: (next: BankDraft) => void;
  onRemove?: () => void;
}) {
  const set = (patch: Partial<BankDraft>) => onChange({ ...bank, ...patch });
  const key = `bank_accounts.${index}`;
  const id = `bank-${index}`;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Bank account {index + 1}
          {index === 0 && <span className="ml-1 font-normal text-muted-foreground">(primary)</span>}
        </p>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label={`Remove bank account ${index + 1}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bank name" htmlFor={`${id}-name`} required error={errors[`${key}.bank_name`]}>
          <Input
            id={`${id}-name`}
            value={bank.bank_name}
            maxLength={100}
            onChange={(e) => set({ bank_name: e.target.value })}
          />
        </Field>
        <Field label="Branch" htmlFor={`${id}-branch`} error={errors[`${key}.branch`]}>
          <Input
            id={`${id}-branch`}
            value={bank.branch}
            maxLength={50}
            onChange={(e) => set({ branch: e.target.value })}
          />
        </Field>
        <Field
          label="Account number"
          htmlFor={`${id}-account`}
          required
          error={errors[`${key}.account_number`]}
        >
          <Input
            id={`${id}-account`}
            value={bank.account_number}
            maxLength={50}
            inputMode="numeric"
            onChange={(e) => set({ account_number: e.target.value })}
          />
        </Field>
        <Field label="IFSC code" htmlFor={`${id}-ifsc`} required error={errors[`${key}.ifsc`]}>
          <Input
            id={`${id}-ifsc`}
            value={bank.ifsc}
            maxLength={11}
            onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })}
            placeholder="SBIN0001234"
          />
        </Field>
        <Field label="Account type" htmlFor={`${id}-type`}>
          <NativeSelect
            id={`${id}-type`}
            value={bank.account_type}
            onChange={(e) => set({ account_type: e.target.value })}
          >
            {BANK_ACCOUNT_TYPES.map((type) => (
              <SelectOption key={type} value={type}>
                {type}
              </SelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="SWIFT code"
          htmlFor={`${id}-swift`}
          error={errors[`${key}.swift_code`]}
          hint="For foreign payments"
        >
          <Input
            id={`${id}-swift`}
            value={bank.swift_code}
            maxLength={11}
            onChange={(e) => set({ swift_code: e.target.value.toUpperCase() })}
          />
        </Field>
      </div>
    </div>
  );
}
