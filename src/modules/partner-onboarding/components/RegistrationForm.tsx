/**
 * The public registration form — customers and vendors, no login.
 *
 * Rebuilt from SAP Portal's register.html and vendor-register.html: the same
 * sections, fields, choices and rules, with the documents sent as files rather
 * than read into base64 in the browser. Every rule is checked here before the
 * form is sent (the server checks them again), and the server's own answer is
 * mapped back onto the fields.
 */
import { CheckCircle2, ClipboardCheck, Plus, Printer } from 'lucide-react';
import { useState } from 'react';

import type { ApiError } from '@/core/api';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { usePublicCompanies, usePublicStates, useSubmitRegistration } from '../api';
import {
  CURRENCIES,
  CUSTOMER_BUSINESS_TYPES,
  CUSTOMER_INDUSTRIES,
  CUSTOMER_MSME_BUSINESS_TYPES,
  CUSTOMER_TYPES,
  type Family,
  MSME_TYPES,
  VENDOR_BUSINESS_TYPES,
  VENDOR_INDUSTRIES,
  VENDOR_MSME_BUSINESS_TYPES,
  VENDOR_TYPES,
} from '../constants';
import {
  type AddressDraft,
  blankAddress,
  blankBank,
  blankDraft,
  type DocumentFiles,
  type FormErrors,
  panFromGstin,
  type RegistrationDraft,
  serverErrors,
  toSubmission,
  validateRegistration,
} from '../utils/registrationForm';
import { AddressFields } from './AddressFields';
import { BankAccountFields } from './BankAccountFields';
import { DocumentSlots } from './DocumentSlots';
import { Field, FormSection } from './Field';
import { RegistrationReview } from './RegistrationReview';

const MAX_ADDRESSES = 10;
const MAX_BANKS = 5;

export function RegistrationForm({ family }: { family: Family }) {
  const isVendor = family === 'vendor';
  const companies = usePublicCompanies();
  const [draft, setDraft] = useState<RegistrationDraft>(() => blankDraft(family));
  const [files, setFiles] = useState<DocumentFiles>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);
  // Checked and shown back before sending (SAP Portal's review step).
  const [reviewing, setReviewing] = useState(false);
  const companyList = companies.data ?? [];
  // One company on offer: it is the visitor's choice already.
  const company = draft.company || (companyList.length === 1 ? companyList[0].code : '');
  const states = usePublicStates(company);
  const submit = useSubmitRegistration(family);

  const set = <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setList = (key: 'bill_addresses' | 'ship_addresses', index: number, value: AddressDraft) =>
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((item, i) => (i === index ? value : item)),
    }));

  const setGstin = (value: string) => {
    const gstin = value.toUpperCase();
    const pan = panFromGstin(gstin);
    setDraft((current) => ({ ...current, gstin, pan: pan ?? current.pan }));
  };

  const onReview = () => {
    const ready = { ...draft, company };
    const found = validateRegistration(family, ready, files);
    setErrors(found);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (Object.keys(found).length === 0) setReviewing(true);
  };

  const onSubmit = async () => {
    const ready = { ...draft, company };
    try {
      const answer = await submit.mutateAsync(toSubmission(family, ready, files));
      setDone(answer);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      // Back to the form, where the server's objections are shown by field.
      setReviewing(false);
      const apiError = error as ApiError;
      if (apiError.status === 429) {
        setErrors({
          form: 'Too many registrations from this connection. Please try again in an hour.',
        });
      } else if (apiError.status === 400 && apiError.response?.data) {
        setErrors(serverErrors(apiError.response.data));
      } else {
        setErrors({
          form: apiError.message || 'The registration could not be sent. Please try again.',
        });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (done) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="text-2xl font-semibold">Registration received</h2>
          <p className="text-muted-foreground">{done.message}</p>
          <p className="font-mono text-lg font-semibold">{done.reference}</p>
          <p className="text-sm text-muted-foreground">
            Keep this reference; quote it if you are asked about your registration.
          </p>
          <div className="flex flex-wrap justify-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(blankDraft(family, company));
                setFiles({});
                setErrors({});
                setReviewing(false);
                setDone(null);
              }}
            >
              Register another {isVendor ? 'vendor' : 'customer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviewing) {
    const companyName = companyList.find((c) => c.code === company)?.name ?? company;
    return (
      <Card className="w-full max-w-3xl">
        <CardContent className="p-8">
          <RegistrationReview
            family={family}
            draft={{ ...draft, company }}
            files={files}
            companyName={companyName}
            sending={submit.isPending}
            onEdit={() => setReviewing(false)}
            onSend={onSubmit}
          />
        </CardContent>
      </Card>
    );
  }

  const businessTypes = isVendor ? VENDOR_BUSINESS_TYPES : CUSTOMER_BUSINESS_TYPES;
  const industries = isVendor ? VENDOR_INDUSTRIES : CUSTOMER_INDUSTRIES;
  const msmeBusinessTypes = isVendor ? VENDOR_MSME_BUSINESS_TYPES : CUSTOMER_MSME_BUSINESS_TYPES;
  const stateOptions = states.data ?? [];
  const problemCount = Object.keys(errors).filter((key) => key !== 'form').length;

  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="space-y-8 p-6 sm:p-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isVendor ? 'Vendor registration' : 'Customer registration'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in your business details{isVendor ? ', bank account' : ''} and upload the
            documents. Fields marked <span className="text-destructive">*</span> are required. Your
            registration is reviewed before it is accepted.
          </p>
        </header>

        {(errors.form || problemCount > 0) && (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            {errors.form ??
              `Please correct the ${problemCount} highlighted ${problemCount === 1 ? 'field' : 'fields'}.`}
          </div>
        )}

        <FormSection title="Company">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Register with" htmlFor="company" required error={errors.company}>
              <NativeSelect
                id="company"
                value={company}
                onChange={(e) => set('company', e.target.value)}
              >
                <SelectOption value="">
                  {companies.isLoading ? 'Loading…' : '— Select company —'}
                </SelectOption>
                {companyList.map((company) => (
                  <SelectOption key={company.code} value={company.code}>
                    {company.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </Field>
            {isVendor ? (
              <Field label="Vendor type" htmlFor="vendor_type" required>
                <NativeSelect
                  id="vendor_type"
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
              <Field label="Customer type" htmlFor="customer_type" required>
                <NativeSelect
                  id="customer_type"
                  value={draft.customer_type}
                  onChange={(e) => set('customer_type', e.target.value)}
                >
                  {CUSTOMER_TYPES.map((type) => (
                    <SelectOption key={type.value} value={type.value}>
                      {type.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
        </FormSection>

        <FormSection title="Business">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={isVendor ? 'Company / vendor name' : 'Company / customer name'}
              htmlFor="card_name"
              required
              error={errors.card_name}
            >
              <Input
                id="card_name"
                value={draft.card_name}
                maxLength={100}
                onChange={(e) => set('card_name', e.target.value)}
              />
            </Field>
            <Field label="Foreign / trade name" htmlFor="foreign_name" error={errors.foreign_name}>
              <Input
                id="foreign_name"
                value={draft.foreign_name}
                maxLength={100}
                onChange={(e) => set('foreign_name', e.target.value)}
              />
            </Field>
            <Field
              label="Type of business"
              htmlFor="type_of_business"
              error={errors.type_of_business}
            >
              <NativeSelect
                id="type_of_business"
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
            <Field label="Industry" htmlFor="industry" required error={errors.industry}>
              <NativeSelect
                id="industry"
                value={draft.industry}
                onChange={(e) => set('industry', e.target.value)}
              >
                <SelectOption value="">— Select industry —</SelectOption>
                {industries.map((industry) => (
                  <SelectOption key={industry} value={industry}>
                    {industry}
                  </SelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Contact person">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="First name"
              htmlFor="contact_first_name"
              required
              error={errors.contact_first_name}
            >
              <Input
                id="contact_first_name"
                value={draft.contact_first_name}
                maxLength={50}
                onChange={(e) => set('contact_first_name', e.target.value)}
              />
            </Field>
            <Field
              label="Last name"
              htmlFor="contact_last_name"
              required
              error={errors.contact_last_name}
            >
              <Input
                id="contact_last_name"
                value={draft.contact_last_name}
                maxLength={50}
                onChange={(e) => set('contact_last_name', e.target.value)}
              />
            </Field>
            <Field label="Designation" htmlFor="contact_title" error={errors.contact_title}>
              <Input
                id="contact_title"
                value={draft.contact_title}
                maxLength={90}
                onChange={(e) => set('contact_title', e.target.value)}
              />
            </Field>
            <Field label="Mobile number" htmlFor="mobile" required error={errors.mobile}>
              <Input
                id="mobile"
                value={draft.mobile}
                maxLength={15}
                inputMode="tel"
                onChange={(e) => set('mobile', e.target.value)}
                placeholder="+91 99999 99999"
              />
            </Field>
            <Field label="Email" htmlFor="email" required error={errors.email}>
              <Input
                id="email"
                type="email"
                value={draft.email}
                maxLength={100}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            {isVendor ? (
              <Field label="Alternate contact" htmlFor="alt_contact" error={errors.alt_contact}>
                <Input
                  id="alt_contact"
                  value={draft.alt_contact}
                  maxLength={15}
                  inputMode="tel"
                  onChange={(e) => set('alt_contact', e.target.value)}
                />
              </Field>
            ) : (
              <Field label="Alternate email" htmlFor="contact_email" error={errors.contact_email}>
                <Input
                  id="contact_email"
                  type="email"
                  value={draft.contact_email}
                  maxLength={100}
                  onChange={(e) => set('contact_email', e.target.value)}
                />
              </Field>
            )}
          </div>
        </FormSection>

        <FormSection
          title="Billing address"
          description="The address name is made from your business name and the state."
          actions={
            draft.bill_addresses.length < MAX_ADDRESSES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('bill_addresses', [...draft.bill_addresses, blankAddress()])}
              >
                <Plus className="h-4 w-4" /> Add billing address
              </Button>
            )
          }
        >
          {errors.bill_addresses && (
            <p className="text-sm text-destructive">{errors.bill_addresses}</p>
          )}
          {draft.bill_addresses.map((address, index) => (
            <AddressFields
              key={`bill-${index}`}
              idPrefix={`bill-${index}`}
              title={index === 0 ? 'Billing address' : `Billing address ${index + 1}`}
              address={address}
              cardName={draft.card_name}
              states={stateOptions}
              statesUnavailable={states.isError}
              errors={errors}
              errorPrefix={`bill_addresses.${index}`}
              onChange={(value) => setList('bill_addresses', index, value)}
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
          title="Shipping address"
          actions={
            !draft.ship_same_as_bill &&
            draft.ship_addresses.length < MAX_ADDRESSES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('ship_addresses', [...draft.ship_addresses, blankAddress()])}
              >
                <Plus className="h-4 w-4" /> Add shipping address
              </Button>
            )
          }
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="ship_same_as_bill"
              checked={draft.ship_same_as_bill}
              onCheckedChange={(checked) => set('ship_same_as_bill', checked)}
            />
            <Label htmlFor="ship_same_as_bill">Same as billing</Label>
          </div>
          {errors.ship_addresses && (
            <p className="text-sm text-destructive">{errors.ship_addresses}</p>
          )}
          {!draft.ship_same_as_bill &&
            draft.ship_addresses.map((address, index) => (
              <AddressFields
                key={`ship-${index}`}
                idPrefix={`ship-${index}`}
                title={index === 0 ? 'Shipping address' : `Shipping address ${index + 1}`}
                address={address}
                cardName={draft.card_name}
                states={stateOptions}
                statesUnavailable={states.isError}
                errors={errors}
                errorPrefix={`ship_addresses.${index}`}
                onChange={(value) => setList('ship_addresses', index, value)}
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

        <FormSection title="Tax and compliance">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="GSTIN"
              htmlFor="gstin"
              required={isVendor || draft.customer_type === 'B2B'}
              error={errors.gstin}
              hint="The PAN is filled in from it"
            >
              <Input
                id="gstin"
                value={draft.gstin}
                maxLength={15}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="06ABCDE1234F1Z5"
              />
            </Field>
            <Field label="PAN" htmlFor="pan" required error={errors.pan}>
              <Input
                id="pan"
                value={draft.pan}
                maxLength={10}
                onChange={(e) => set('pan', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
              />
            </Field>
            {isVendor ? (
              <Field label="TAN" htmlFor="tan" error={errors.tan} hint="If applicable">
                <Input
                  id="tan"
                  value={draft.tan}
                  maxLength={10}
                  onChange={(e) => set('tan', e.target.value.toUpperCase())}
                />
              </Field>
            ) : (
              <Field label="Currency" htmlFor="currency">
                <NativeSelect
                  id="currency"
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
            )}
            {isVendor && (
              <>
                <Field label="Currency" htmlFor="currency">
                  <NativeSelect
                    id="currency"
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
                <Field
                  label="FSSAI licence number"
                  htmlFor="fssai_number"
                  error={errors.fssai_number}
                  hint="14 digits, for food and beverage vendors"
                >
                  <Input
                    id="fssai_number"
                    value={draft.fssai_number}
                    maxLength={14}
                    inputMode="numeric"
                    onChange={(e) => set('fssai_number', e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_msme"
                checked={draft.has_msme}
                onCheckedChange={(checked) => set('has_msme', checked)}
              />
              <Label htmlFor="has_msme">Registered under MSME / Udyam</Label>
            </div>
            {draft.has_msme && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Udyam registration number"
                  htmlFor="msme_number"
                  required
                  error={errors.msme_number}
                >
                  <Input
                    id="msme_number"
                    value={draft.msme_number}
                    maxLength={19}
                    onChange={(e) => set('msme_number', e.target.value.toUpperCase())}
                    placeholder="UDYAM-HR-18-0040140"
                  />
                </Field>
                <Field
                  label="MSME type"
                  htmlFor="msme_type"
                  required={isVendor}
                  error={errors.msme_type}
                >
                  <NativeSelect
                    id="msme_type"
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
                  htmlFor="msme_business_type"
                  required={isVendor}
                  error={errors.msme_business_type}
                >
                  <NativeSelect
                    id="msme_business_type"
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
          </div>
        </FormSection>

        {isVendor && (
          <FormSection
            title="Bank accounts"
            description="At least one. The IFSC code is recorded in SAP with the account."
            actions={
              draft.bank_accounts.length < MAX_BANKS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set('bank_accounts', [...draft.bank_accounts, blankBank()])}
                >
                  <Plus className="h-4 w-4" /> Add bank account
                </Button>
              )
            }
          >
            {errors.bank_accounts && (
              <p className="text-sm text-destructive">{errors.bank_accounts}</p>
            )}
            {draft.bank_accounts.map((bank, index) => (
              <BankAccountFields
                key={`bank-${index}`}
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

        <FormSection title="Documents">
          {errors['documents.files'] && (
            <p className="text-sm text-destructive">{errors['documents.files']}</p>
          )}
          <DocumentSlots
            family={family}
            hasMsme={draft.has_msme}
            files={files}
            errors={errors}
            onChange={setFiles}
          />
        </FormSection>

        <FormSection title="Remarks">
          <Field
            label="Anything we should know about your business"
            htmlFor="remarks"
            required
            error={errors.remarks}
          >
            <Textarea
              id="remarks"
              value={draft.remarks}
              maxLength={1000}
              onChange={(e) => set('remarks', e.target.value)}
            />
          </Field>
        </FormSection>

        <div className="flex justify-end border-t pt-6">
          <Button onClick={onReview} size="lg">
            <ClipboardCheck className="h-4 w-4" />
            Review registration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
