/**
 * The verifier's corrections to an open registration — everything the form
 * collected except the documents. Saving sends the whole record; the server
 * holds it to the form's rules and records who changed which fields.
 *
 * The form lives in its own component inside `DialogContent`, which unmounts
 * while the dialog is closed, so each opening starts from the saved record.
 */
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { type RegistrationDetail, useCompanyStates, useUpdateRegistration } from '../api';
import {
  ALL_CUSTOMER_TYPES,
  CURRENCIES,
  CUSTOMER_BUSINESS_TYPES,
  CUSTOMER_MSME_BUSINESS_TYPES,
  MSME_TYPES,
  VENDOR_BUSINESS_TYPES,
  VENDOR_MSME_BUSINESS_TYPES,
  VENDOR_TYPES,
} from '../constants';
import {
  type AddressDraft,
  blankAddress,
  blankBank,
  draftFromDetail,
  editPayload,
  type FormErrors,
  type RegistrationDraft,
  serverErrors,
  validateEdit,
} from '../utils/registrationForm';
import { AddressFields } from './AddressFields';
import { BankAccountFields } from './BankAccountFields';
import { Field, FormSection } from './Field';

/** The server numbers the addresses as one list (billing, then shipping); the form keeps two. */
function addressKeys(errors: FormErrors, draft: RegistrationDraft): FormErrors {
  const bills = draft.bill_addresses.length;
  return Object.fromEntries(
    Object.entries(errors).map(([key, message]) => {
      const match = /^addresses\.(\d+)\.(.+)$/.exec(key);
      if (!match) return [key, message];
      const index = Number(match[1]);
      const list = index < bills ? 'bill_addresses' : 'ship_addresses';
      return [`${list}.${index < bills ? index : index - bills}.${match[2]}`, message];
    }),
  );
}

export function EditRegistrationDialog({
  open,
  registration,
  onOpenChange,
}: {
  open: boolean;
  registration: RegistrationDetail;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <EditForm registration={registration} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  registration,
  onDone,
}: {
  registration: RegistrationDetail;
  onDone: () => void;
}) {
  const family = registration.family;
  const isVendor = family === 'vendor';
  const [draft, setDraft] = useState<RegistrationDraft>(() => draftFromDetail(registration));
  const [errors, setErrors] = useState<FormErrors>({});
  const states = useCompanyStates(registration.company_code, true);
  const update = useUpdateRegistration(family, registration.id);

  const set = <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setAddress = (
    key: 'bill_addresses' | 'ship_addresses',
    index: number,
    value: AddressDraft,
  ) =>
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((item, i) => (i === index ? value : item)),
    }));

  const save = async () => {
    const found = validateEdit(family, draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await update.mutateAsync(editPayload(family, draft));
      toast.success('Registration updated');
      onDone();
    } catch (error) {
      const data = (error as { response?: { data?: unknown } }).response?.data;
      setErrors(
        data ? addressKeys(serverErrors(data), draft) : { form: 'The changes could not be saved.' },
      );
    }
  };

  const businessTypes = isVendor ? VENDOR_BUSINESS_TYPES : CUSTOMER_BUSINESS_TYPES;
  const msmeBusinessTypes = isVendor ? VENDOR_MSME_BUSINESS_TYPES : CUSTOMER_MSME_BUSINESS_TYPES;
  const stateOptions = states.data ?? [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit {registration.reference}</DialogTitle>
        <DialogDescription>
          Corrections are recorded in the history. Address names are rebuilt from the name and
          state.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-6 overflow-y-auto">
        {Object.keys(errors).length > 0 && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
            {errors.form ?? 'Please correct the highlighted fields.'}
          </p>
        )}
        <FormSection title="Business and contact">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Name"
              htmlFor="edit-card-name"
              required
              error={errors.card_name}
              className="sm:col-span-2"
            >
              <Input
                id="edit-card-name"
                value={draft.card_name}
                maxLength={100}
                onChange={(e) => set('card_name', e.target.value)}
              />
            </Field>
            {isVendor ? (
              <Field label="Vendor type" htmlFor="edit-vendor-type">
                <NativeSelect
                  id="edit-vendor-type"
                  value={draft.vendor_type}
                  onChange={(e) => set('vendor_type', e.target.value)}
                >
                  {VENDOR_TYPES.map((type) => (
                    <SelectOption key={type.value} value={type.value}>
                      {type.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : (
              <Field label="Customer type" htmlFor="edit-customer-type">
                <NativeSelect
                  id="edit-customer-type"
                  value={draft.customer_type}
                  onChange={(e) => set('customer_type', e.target.value)}
                >
                  {ALL_CUSTOMER_TYPES.map((type) => (
                    <SelectOption key={type.value} value={type.value}>
                      {type.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field label="Foreign / trade name" htmlFor="edit-foreign" error={errors.foreign_name}>
              <Input
                id="edit-foreign"
                value={draft.foreign_name}
                maxLength={100}
                onChange={(e) => set('foreign_name', e.target.value)}
              />
            </Field>
            <Field label="Type of business" htmlFor="edit-business" error={errors.type_of_business}>
              <NativeSelect
                id="edit-business"
                value={draft.type_of_business}
                onChange={(e) => set('type_of_business', e.target.value)}
              >
                {businessTypes.map((type) => (
                  <SelectOption key={type} value={type}>
                    {type}
                  </SelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Industry" htmlFor="edit-industry" required error={errors.industry}>
              <Input
                id="edit-industry"
                value={draft.industry}
                maxLength={100}
                onChange={(e) => set('industry', e.target.value)}
              />
            </Field>
            <Field
              label="Contact first name"
              htmlFor="edit-first"
              required
              error={errors.contact_first_name}
            >
              <Input
                id="edit-first"
                value={draft.contact_first_name}
                maxLength={50}
                onChange={(e) => set('contact_first_name', e.target.value)}
              />
            </Field>
            <Field
              label="Contact last name"
              htmlFor="edit-last"
              required
              error={errors.contact_last_name}
            >
              <Input
                id="edit-last"
                value={draft.contact_last_name}
                maxLength={50}
                onChange={(e) => set('contact_last_name', e.target.value)}
              />
            </Field>
            <Field label="Designation" htmlFor="edit-title" error={errors.contact_title}>
              <Input
                id="edit-title"
                value={draft.contact_title}
                maxLength={90}
                onChange={(e) => set('contact_title', e.target.value)}
              />
            </Field>
            <Field label="Mobile" htmlFor="edit-mobile" required error={errors.mobile}>
              <Input
                id="edit-mobile"
                value={draft.mobile}
                maxLength={15}
                onChange={(e) => set('mobile', e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="edit-email" required error={errors.email}>
              <Input
                id="edit-email"
                type="email"
                value={draft.email}
                maxLength={100}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="Currency" htmlFor="edit-currency">
              <NativeSelect
                id="edit-currency"
                value={draft.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {CURRENCIES.map((currency) => (
                  <SelectOption key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Tax and compliance">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="GSTIN" htmlFor="edit-gstin" error={errors.gstin}>
              <Input
                id="edit-gstin"
                value={draft.gstin}
                maxLength={15}
                onChange={(e) => set('gstin', e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="PAN" htmlFor="edit-pan" required error={errors.pan}>
              <Input
                id="edit-pan"
                value={draft.pan}
                maxLength={10}
                onChange={(e) => set('pan', e.target.value.toUpperCase())}
              />
            </Field>
            {isVendor && (
              <>
                <Field label="TAN" htmlFor="edit-tan" error={errors.tan}>
                  <Input
                    id="edit-tan"
                    value={draft.tan}
                    maxLength={10}
                    onChange={(e) => set('tan', e.target.value.toUpperCase())}
                  />
                </Field>
                <Field
                  label="FSSAI licence number"
                  htmlFor="edit-fssai"
                  error={errors.fssai_number}
                >
                  <Input
                    id="edit-fssai"
                    value={draft.fssai_number}
                    maxLength={14}
                    onChange={(e) => set('fssai_number', e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-msme"
              checked={draft.has_msme}
              onCheckedChange={(checked) => set('has_msme', checked)}
            />
            <Label htmlFor="edit-msme">Registered under MSME / Udyam</Label>
          </div>
          {draft.has_msme && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Udyam number"
                htmlFor="edit-msme-number"
                required
                error={errors.msme_number}
              >
                <Input
                  id="edit-msme-number"
                  value={draft.msme_number}
                  maxLength={19}
                  onChange={(e) => set('msme_number', e.target.value.toUpperCase())}
                />
              </Field>
              <Field
                label="MSME type"
                htmlFor="edit-msme-type"
                required={isVendor}
                error={errors.msme_type}
              >
                <NativeSelect
                  id="edit-msme-type"
                  value={draft.msme_type}
                  onChange={(e) => set('msme_type', e.target.value)}
                >
                  <SelectOption value="">— Select —</SelectOption>
                  {MSME_TYPES.map((type) => (
                    <SelectOption key={type} value={type}>
                      {type}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field
                label="MSME business type"
                htmlFor="edit-msme-btype"
                required={isVendor}
                error={errors.msme_business_type}
              >
                <NativeSelect
                  id="edit-msme-btype"
                  value={draft.msme_business_type}
                  onChange={(e) => set('msme_business_type', e.target.value)}
                >
                  <SelectOption value="">— Select —</SelectOption>
                  {msmeBusinessTypes.map((type) => (
                    <SelectOption key={type} value={type}>
                      {type}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          )}
        </FormSection>

        <FormSection
          title="Billing addresses"
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set('bill_addresses', [...draft.bill_addresses, blankAddress()])}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          }
        >
          {errors.addresses && <p className="text-sm text-destructive">{errors.addresses}</p>}
          {draft.bill_addresses.map((address, index) => (
            <AddressFields
              key={`edit-bill-${index}`}
              idPrefix={`edit-bill-${index}`}
              title={`Billing address ${index + 1}`}
              address={address}
              cardName={draft.card_name}
              states={stateOptions}
              statesUnavailable={states.isError}
              errors={errors}
              errorPrefix={`bill_addresses.${index}`}
              onChange={(value) => setAddress('bill_addresses', index, value)}
              onRemove={
                index > 0
                  ? () =>
                      set(
                        'bill_addresses',
                        draft.bill_addresses.filter((_, i) => i !== index),
                      )
                  : undefined
              }
            />
          ))}
        </FormSection>

        <FormSection
          title="Shipping addresses"
          actions={
            !draft.ship_same_as_bill && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('ship_addresses', [...draft.ship_addresses, blankAddress()])}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            )
          }
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-same-as-bill"
              checked={draft.ship_same_as_bill}
              onCheckedChange={(checked) => set('ship_same_as_bill', checked)}
            />
            <Label htmlFor="edit-same-as-bill">Same as billing</Label>
          </div>
          {!draft.ship_same_as_bill &&
            draft.ship_addresses.map((address, index) => (
              <AddressFields
                key={`edit-ship-${index}`}
                idPrefix={`edit-ship-${index}`}
                title={`Shipping address ${index + 1}`}
                address={address}
                cardName={draft.card_name}
                states={stateOptions}
                statesUnavailable={states.isError}
                errors={errors}
                errorPrefix={`ship_addresses.${index}`}
                onChange={(value) => setAddress('ship_addresses', index, value)}
                onRemove={
                  index > 0
                    ? () =>
                        set(
                          'ship_addresses',
                          draft.ship_addresses.filter((_, i) => i !== index),
                        )
                    : undefined
                }
              />
            ))}
        </FormSection>

        {isVendor && (
          <FormSection
            title="Bank accounts"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('bank_accounts', [...draft.bank_accounts, blankBank()])}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            }
          >
            {draft.bank_accounts.map((bank, index) => (
              <BankAccountFields
                key={`edit-bank-${index}`}
                index={index}
                bank={bank}
                errors={errors}
                onChange={(value) =>
                  set(
                    'bank_accounts',
                    draft.bank_accounts.map((item, i) => (i === index ? value : item)),
                  )
                }
                onRemove={
                  index > 0
                    ? () =>
                        set(
                          'bank_accounts',
                          draft.bank_accounts.filter((_, i) => i !== index),
                        )
                    : undefined
                }
              />
            ))}
          </FormSection>
        )}

        <FormSection title="Remarks">
          <Field label="Remarks" htmlFor="edit-remarks" required error={errors.remarks}>
            <Textarea
              id="edit-remarks"
              value={draft.remarks}
              maxLength={1000}
              onChange={(e) => set('remarks', e.target.value)}
            />
          </Field>
        </FormSection>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={save} disabled={update.isPending}>
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}
