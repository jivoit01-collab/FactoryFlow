/**
 * The SAP master data the approver sets before the partner is created —
 * approvals.html's "SAP Configuration" tab. The pickers read the
 * registration's own company (SAP Portal read Oil's whatever the company was);
 * when a list cannot be read the field takes the code typed in, as the portal's
 * vendor screen did.
 */
import type { UseQueryResult } from '@tanstack/react-query';

import { Input, NativeSelect, SelectOption, Textarea } from '@/shared/components/ui';

import type { SapOption } from '../api';
import { CURRENCIES, type Family } from '../constants';
import type { ManagerDraft } from '../utils/managerFields';
import { Field } from './Field';

/** A picker over one SAP list, or a code box when the list is unavailable. */
export function LookupSelect({
  id,
  value,
  lookup,
  disabled,
  placeholder = '— Select —',
  onChange,
}: {
  id: string;
  value: string;
  lookup: Pick<UseQueryResult<SapOption[]>, 'data' | 'isError' | 'isLoading'>;
  disabled?: boolean;
  placeholder?: string;
  onChange: (code: string, name: string) => void;
}) {
  if (lookup.isError || (!lookup.isLoading && !lookup.data)) {
    return (
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder="Code (list unavailable)"
        onChange={(e) => onChange(e.target.value, '')}
      />
    );
  }
  const options = lookup.data ?? [];
  const known = options.some((option) => String(option.code) === value);
  return (
    <NativeSelect
      id={id}
      value={value}
      disabled={disabled || lookup.isLoading}
      onChange={(e) => {
        const chosen = options.find((option) => String(option.code) === e.target.value);
        onChange(e.target.value, chosen?.name ?? '');
      }}
    >
      <SelectOption value="">{lookup.isLoading ? 'Loading…' : placeholder}</SelectOption>
      {!known && value && <SelectOption value={value}>{value}</SelectOption>}
      {options.map((option) => (
        <SelectOption key={String(option.code)} value={String(option.code)}>
          {option.name} ({option.code})
        </SelectOption>
      ))}
    </NativeSelect>
  );
}

type Lookup = Pick<UseQueryResult<SapOption[]>, 'data' | 'isError' | 'isLoading'>;

export function SapFieldsForm({
  family,
  draft,
  defaultPrefix,
  lookups,
  disabled,
  onChange,
}: {
  family: Family;
  draft: ManagerDraft;
  defaultPrefix: string;
  lookups: {
    bpGroups: Lookup;
    paymentTerms: Lookup;
    salesEmployees: Lookup;
    controlAccounts: Lookup;
    mainGroups: Lookup;
    chains: Lookup;
  };
  disabled?: boolean;
  onChange: (next: ManagerDraft) => void;
}) {
  const set = (patch: Partial<ManagerDraft>) => onChange({ ...draft, ...patch });
  const accountLabel = family === 'customer' ? 'AR control account' : 'AP control account';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="Card code prefix"
        htmlFor="sap-prefix"
        hint={`The next free code under it, e.g. ${defaultPrefix}000124`}
      >
        <Input
          id="sap-prefix"
          value={draft.card_code_prefix}
          maxLength={10}
          disabled={disabled}
          placeholder={defaultPrefix}
          onChange={(e) => set({ card_code_prefix: e.target.value.toUpperCase() })}
        />
      </Field>
      <Field label="BP group" htmlFor="sap-group">
        <LookupSelect
          id="sap-group"
          value={draft.bp_group_code}
          lookup={lookups.bpGroups}
          disabled={disabled}
          onChange={(value, name) => set({ bp_group_code: value, bp_group_name: name })}
        />
      </Field>
      <Field label="Payment terms" htmlFor="sap-terms">
        <LookupSelect
          id="sap-terms"
          value={draft.payment_terms_code}
          lookup={lookups.paymentTerms}
          disabled={disabled}
          onChange={(value, name) => set({ payment_terms_code: value, payment_terms_name: name })}
        />
      </Field>
      <Field label="Sales employee" htmlFor="sap-sales">
        <LookupSelect
          id="sap-sales"
          value={draft.sales_employee_code}
          lookup={lookups.salesEmployees}
          disabled={disabled}
          onChange={(value, name) => set({ sales_employee_code: value, sales_employee_name: name })}
        />
      </Field>
      <Field label={accountLabel} htmlFor="sap-account">
        <LookupSelect
          id="sap-account"
          value={draft.control_account}
          lookup={lookups.controlAccounts}
          disabled={disabled}
          onChange={(value, name) => set({ control_account: value, control_account_name: name })}
        />
      </Field>
      <Field label="Credit limit (₹)" htmlFor="sap-credit">
        <Input
          id="sap-credit"
          type="number"
          min={0}
          step="0.01"
          value={draft.credit_limit}
          disabled={disabled}
          onChange={(e) => set({ credit_limit: e.target.value })}
        />
      </Field>
      <Field label="Main group (U_Main_Group)" htmlFor="sap-main-group">
        <LookupSelect
          id="sap-main-group"
          value={draft.main_group}
          lookup={lookups.mainGroups}
          disabled={disabled}
          onChange={(value) => set({ main_group: value })}
        />
      </Field>
      <Field label="Chain (U_Chain)" htmlFor="sap-chain">
        <LookupSelect
          id="sap-chain"
          value={draft.chain}
          lookup={lookups.chains}
          disabled={disabled}
          onChange={(value) => set({ chain: value })}
        />
      </Field>
      <Field label="Currency in SAP" htmlFor="sap-currency">
        <NativeSelect
          id="sap-currency"
          value={draft.sap_currency}
          disabled={disabled}
          onChange={(e) => set({ sap_currency: e.target.value })}
        >
          <SelectOption value="">As on the form</SelectOption>
          {CURRENCIES.map((currency) => (
            <SelectOption key={currency.value} value={currency.value}>
              {currency.label}
            </SelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Territory" htmlFor="sap-territory">
        <Input
          id="sap-territory"
          value={draft.territory}
          maxLength={100}
          disabled={disabled}
          onChange={(e) => set({ territory: e.target.value })}
        />
      </Field>
      <Field label="Internal notes" htmlFor="sap-notes" className="sm:col-span-2">
        <Textarea
          id="sap-notes"
          value={draft.manager_notes}
          maxLength={2000}
          disabled={disabled}
          onChange={(e) => set({ manager_notes: e.target.value })}
        />
      </Field>
    </div>
  );
}
