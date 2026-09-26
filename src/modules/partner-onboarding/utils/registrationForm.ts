/**
 * The public registration form's state, rules and submission — pure functions,
 * so the rules are tested without a browser.
 *
 * The rules are SAP Portal's own (register.html / vendor-register.html, the
 * "Review details" handler), and the server checks the same ones
 * (factory_app/partner_onboarding/serializers.py). Checking here too means a
 * visitor sees every problem at once instead of spending a throttled attempt.
 */
import type { EditPayload, RegistrationDetail } from '../api/partner-onboarding.api';
import {
  ALLOWED_EXTENSIONS,
  CUSTOMER_MSME_BUSINESS_TYPES,
  type DocumentSlot,
  EMAIL_RE,
  type Family,
  FSSAI_RE,
  GSTIN_RE,
  IFSC_RE,
  MAX_FILE_BYTES,
  MOBILE_RE,
  MSME_TYPES,
  PAN_RE,
  REMARKS_MAX,
  REQUIRED_DOCUMENTS,
  SAP_ADDRESS_LINE_MAX,
  SAP_CARD_NAME_MAX,
  SAP_CONTACT_NAME_MAX,
  SWIFT_RE,
  TAN_RE,
  UDYAM_RE,
  VENDOR_MSME_BUSINESS_TYPES,
} from '../constants';

export interface AddressDraft {
  street: string;
  block: string;
  city: string;
  zip_code: string;
  state: string;
  country: string;
  gstin: string;
}

export interface BankDraft {
  bank_name: string;
  branch: string;
  account_number: string;
  ifsc: string;
  account_type: string;
  swift_code: string;
  /** The approver's SAP bank code; kept through a verifier's edit. */
  sap_bank_code?: string;
}

export interface RegistrationDraft {
  company: string;
  customer_type: string;
  vendor_type: string;
  card_name: string;
  foreign_name: string;
  type_of_business: string;
  industry: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_title: string;
  mobile: string;
  email: string;
  contact_email: string;
  alt_contact: string;
  currency: string;
  gstin: string;
  pan: string;
  tan: string;
  fssai_number: string;
  has_msme: boolean;
  msme_number: string;
  msme_type: string;
  msme_business_type: string;
  remarks: string;
  bill_addresses: AddressDraft[];
  ship_same_as_bill: boolean;
  ship_addresses: AddressDraft[];
  bank_accounts: BankDraft[];
}

export type DocumentFiles = Partial<Record<DocumentSlot, File[]>>;
export type FormErrors = Record<string, string>;

export function blankAddress(): AddressDraft {
  return { street: '', block: '', city: '', zip_code: '', state: '', country: 'IN', gstin: '' };
}

export function blankBank(): BankDraft {
  return {
    bank_name: '',
    branch: '',
    account_number: '',
    ifsc: '',
    account_type: 'Current',
    swift_code: '',
  };
}

export function blankDraft(family: Family, company = ''): RegistrationDraft {
  return {
    company,
    customer_type: 'B2B',
    vendor_type: 'SUPPLIER',
    card_name: '',
    foreign_name: '',
    type_of_business: 'Company',
    industry: '',
    contact_first_name: '',
    contact_last_name: '',
    contact_title: '',
    mobile: '',
    email: '',
    contact_email: '',
    alt_contact: '',
    currency: 'INR',
    gstin: '',
    pan: '',
    tan: '',
    fssai_number: '',
    has_msme: false,
    msme_number: '',
    msme_type: '',
    msme_business_type: '',
    remarks: '',
    bill_addresses: [blankAddress()],
    ship_same_as_bill: true,
    ship_addresses: [blankAddress()],
    bank_accounts: family === 'vendor' ? [blankBank()] : [],
  };
}

const upper = (value: string) => value.trim().toUpperCase();

/** A GSTIN holds the PAN in characters 3–12 (the portal's "Fetch PAN" button). */
export function panFromGstin(gstin: string): string | null {
  const value = upper(gstin);
  return value.length === 15 ? value.slice(2, 12) : null;
}

/** What the server will call the address: `<NAME> - <STATE>` (numbered when two clash). */
export function addressNamePreview(cardName: string, state: string): string {
  const name = upper(cardName);
  const label = state ? `${name} - ${state}` : name;
  return label.slice(0, 50).trim();
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Why a file cannot be sent, or null. The server also checks its bytes. */
export function fileProblem(file: Pick<File, 'name' | 'size'>): string | null {
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))) {
    return `${file.name}: only PDF, JPG and PNG files are accepted.`;
  }
  if (file.size <= 0) return `${file.name}: the file is empty.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: files may be at most 15 MB.`;
  return null;
}

function checkAddress(address: AddressDraft, key: string, errors: FormErrors) {
  if (!address.street.trim()) errors[`${key}.street`] = 'Street is required.';
  else if (address.street.trim().length > SAP_ADDRESS_LINE_MAX)
    errors[`${key}.street`] = 'At most 100 characters.';
  if (address.block.trim().length > SAP_ADDRESS_LINE_MAX)
    errors[`${key}.block`] = 'At most 100 characters.';
  if (!address.city.trim()) errors[`${key}.city`] = 'City is required.';
  if (address.country === 'IN' && !address.state) errors[`${key}.state`] = 'Choose the state.';
  if (address.gstin.trim() && !GSTIN_RE.test(upper(address.gstin))) {
    errors[`${key}.gstin`] = 'Enter a valid GSTIN (e.g. 06ABCDE1234F1Z5).';
  }
}

/** Every problem with the form at once, keyed by field (`bill_addresses.0.city`, `documents.pan`). */
export function validateRegistration(
  family: Family,
  draft: RegistrationDraft,
  files: DocumentFiles,
): FormErrors {
  const errors: FormErrors = {};
  const isVendor = family === 'vendor';

  if (!draft.company) errors.company = 'Choose the company.';
  if (!draft.card_name.trim()) errors.card_name = 'The business name is required.';
  else if (draft.card_name.trim().length > SAP_CARD_NAME_MAX)
    errors.card_name = 'At most 100 characters.';
  if (!draft.industry) errors.industry = 'Industry is required.';
  if (!draft.contact_first_name.trim()) errors.contact_first_name = 'First name is required.';
  if (!draft.contact_last_name.trim()) errors.contact_last_name = 'Last name is required.';
  else if (
    `${draft.contact_first_name.trim()} ${draft.contact_last_name.trim()}`.length >
    SAP_CONTACT_NAME_MAX
  ) {
    errors.contact_last_name = 'First and last name together may be at most 50 characters.';
  }
  if (!draft.mobile.trim()) errors.mobile = 'Mobile number is required.';
  else if (!MOBILE_RE.test(draft.mobile.trim())) errors.mobile = 'Enter a valid mobile number.';
  if (!draft.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(draft.email.trim())) errors.email = 'Enter a valid email address.';
  if (!isVendor && draft.contact_email.trim() && !EMAIL_RE.test(draft.contact_email.trim())) {
    errors.contact_email = 'Enter a valid email address.';
  }
  if (isVendor && draft.alt_contact.trim() && !MOBILE_RE.test(draft.alt_contact.trim())) {
    errors.alt_contact = 'Enter a valid mobile number.';
  }

  const pan = upper(draft.pan);
  if (!pan) errors.pan = 'PAN is required.';
  else if (!PAN_RE.test(pan)) errors.pan = 'Invalid PAN format (e.g. ABCDE1234F).';
  const gstin = upper(draft.gstin);
  const gstinRequired = isVendor || draft.customer_type === 'B2B';
  if (!gstin && gstinRequired)
    errors.gstin = isVendor ? 'GSTIN is required.' : 'GSTIN is required for B2B customers.';
  else if (gstin && !GSTIN_RE.test(gstin))
    errors.gstin = 'Enter a valid GSTIN (e.g. 06ABCDE1234F1Z5).';

  if (isVendor) {
    if (draft.tan.trim() && !TAN_RE.test(upper(draft.tan)))
      errors.tan = 'Enter a valid TAN (e.g. BLRA12345B).';
    if (draft.fssai_number.trim() && !FSSAI_RE.test(draft.fssai_number.trim())) {
      errors.fssai_number = 'An FSSAI licence number is 14 digits.';
    }
  }

  if (draft.has_msme) {
    const number = upper(draft.msme_number);
    if (!number) errors.msme_number = 'Udyam registration number is required.';
    else if (!UDYAM_RE.test(number)) errors.msme_number = 'Format: UDYAM-HR-18-0040140.';
    const businessTypes: readonly string[] = isVendor
      ? VENDOR_MSME_BUSINESS_TYPES
      : CUSTOMER_MSME_BUSINESS_TYPES;
    if (draft.msme_type && !(MSME_TYPES as readonly string[]).includes(draft.msme_type)) {
      errors.msme_type = 'Choose the MSME type from the list.';
    } else if (isVendor && !draft.msme_type) errors.msme_type = 'MSME type is required.';
    if (draft.msme_business_type && !businessTypes.includes(draft.msme_business_type)) {
      errors.msme_business_type = 'Choose the MSME business type from the list.';
    } else if (isVendor && !draft.msme_business_type)
      errors.msme_business_type = 'MSME business type is required.';
  }

  if (!draft.remarks.trim()) errors.remarks = 'Remarks are required.';
  else if (draft.remarks.trim().length > REMARKS_MAX)
    errors.remarks = `At most ${REMARKS_MAX} characters.`;

  if (draft.bill_addresses.length === 0)
    errors.bill_addresses = 'Give at least one billing address.';
  draft.bill_addresses.forEach((address, index) =>
    checkAddress(address, `bill_addresses.${index}`, errors),
  );
  if (!draft.ship_same_as_bill) {
    if (draft.ship_addresses.length === 0) errors.ship_addresses = 'Give a shipping address.';
    draft.ship_addresses.forEach((address, index) =>
      checkAddress(address, `ship_addresses.${index}`, errors),
    );
  }

  if (isVendor) {
    if (draft.bank_accounts.length === 0) errors.bank_accounts = 'Give at least one bank account.';
    draft.bank_accounts.forEach((bank, index) => {
      const key = `bank_accounts.${index}`;
      if (!bank.bank_name.trim()) errors[`${key}.bank_name`] = 'Bank name is required.';
      if (!bank.account_number.trim())
        errors[`${key}.account_number`] = 'Account number is required.';
      else if (!/^[A-Za-z0-9 ]+$/.test(bank.account_number.trim())) {
        errors[`${key}.account_number`] = 'Use letters and digits only.';
      }
      if (!IFSC_RE.test(upper(bank.ifsc)))
        errors[`${key}.ifsc`] = 'Enter a valid IFSC code (e.g. SBIN0001234).';
      if (bank.swift_code.trim() && !SWIFT_RE.test(upper(bank.swift_code))) {
        errors[`${key}.swift_code`] = 'Enter a valid SWIFT code.';
      }
    });
  }

  const required: DocumentSlot[] = [...REQUIRED_DOCUMENTS[family]];
  if (draft.has_msme) required.push('msme');
  for (const slot of required) {
    if (!files[slot]?.length) errors[`documents.${slot}`] = 'This document is required.';
  }
  for (const [slot, list] of Object.entries(files)) {
    const problem = (list ?? []).map(fileProblem).find(Boolean);
    if (problem) errors[`documents.${slot}`] = problem;
  }
  return errors;
}

function cleanAddress(address: AddressDraft) {
  return {
    street: upper(address.street),
    block: upper(address.block),
    city: upper(address.city),
    zip_code: upper(address.zip_code),
    state: address.state,
    country: address.country,
    gstin: upper(address.gstin),
  };
}

/** The JSON the server's submit serializer takes (``payload`` part). */
export function toPayload(family: Family, draft: RegistrationDraft) {
  const common = {
    company: draft.company,
    card_name: draft.card_name.trim(),
    foreign_name: draft.foreign_name.trim(),
    type_of_business: draft.type_of_business,
    industry: draft.industry,
    contact_first_name: draft.contact_first_name.trim(),
    contact_last_name: draft.contact_last_name.trim(),
    contact_title: draft.contact_title.trim(),
    mobile: draft.mobile.trim(),
    email: draft.email.trim(),
    currency: draft.currency,
    gstin: upper(draft.gstin),
    pan: upper(draft.pan),
    has_msme: draft.has_msme,
    msme_number: draft.has_msme ? upper(draft.msme_number) : '',
    msme_type: draft.has_msme ? draft.msme_type : '',
    msme_business_type: draft.has_msme ? draft.msme_business_type : '',
    remarks: draft.remarks.trim(),
    bill_addresses: draft.bill_addresses.map(cleanAddress),
    ship_same_as_bill: draft.ship_same_as_bill,
    ship_addresses: draft.ship_same_as_bill ? [] : draft.ship_addresses.map(cleanAddress),
  };
  if (family === 'customer') {
    return {
      ...common,
      customer_type: draft.customer_type,
      contact_email: draft.contact_email.trim(),
    };
  }
  return {
    ...common,
    vendor_type: draft.vendor_type,
    alt_contact: draft.alt_contact.trim(),
    tan: upper(draft.tan),
    fssai_number: draft.fssai_number.trim(),
    bank_accounts: draft.bank_accounts.map((bank) => ({
      bank_name: upper(bank.bank_name),
      branch: upper(bank.branch),
      account_number: upper(bank.account_number).replace(/\s+/g, ''),
      ifsc: upper(bank.ifsc),
      account_type: bank.account_type,
      swift_code: upper(bank.swift_code),
    })),
  };
}

/** One multipart body: the fields as JSON in ``payload``, each file under its slot. */
export function toSubmission(
  family: Family,
  draft: RegistrationDraft,
  files: DocumentFiles,
): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(toPayload(family, draft)));
  for (const [slot, list] of Object.entries(files)) {
    for (const file of list ?? []) form.append(slot, file, file.name);
  }
  return form;
}

/**
 * A DRF error answer as field keys the form understands:
 * ``{"bill_addresses": [{}, {"city": ["…"]}]}`` → ``bill_addresses.1.city``,
 * ``{"documents": {"pan": ["…"]}}`` → ``documents.pan``.
 */
export function serverErrors(data: unknown, prefix = ''): FormErrors {
  const errors: FormErrors = {};
  if (data == null) return errors;
  if (typeof data === 'string') {
    errors[prefix || 'form'] = data;
    return errors;
  }
  if (Array.isArray(data)) {
    if (data.every((item) => typeof item === 'string')) {
      if (data.length) errors[prefix || 'form'] = data.join(' ');
      return errors;
    }
    data.forEach((item, index) =>
      Object.assign(errors, serverErrors(item, prefix ? `${prefix}.${index}` : `${index}`)),
    );
    return errors;
  }
  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const name =
        key === 'detail' || key === 'non_field_errors'
          ? prefix || 'form'
          : prefix
            ? `${prefix}.${key}`
            : key;
      Object.assign(errors, serverErrors(value, name));
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// The verifier's edit: the same draft, filled from a registration.
// ---------------------------------------------------------------------------

/** A registration as a draft the edit dialog can hold. */
export function draftFromDetail(detail: RegistrationDetail): RegistrationDraft {
  const toAddress = (a: RegistrationDetail['addresses'][number]): AddressDraft => ({
    street: a.street,
    block: a.block,
    city: a.city,
    zip_code: a.zip_code,
    state: a.state,
    country: a.country || 'IN',
    gstin: a.gstin,
  });
  const bill = detail.addresses.filter((a) => a.address_type === 'BILL_TO').map(toAddress);
  const ship = detail.addresses.filter((a) => a.address_type === 'SHIP_TO').map(toAddress);
  return {
    ...blankDraft(detail.family, detail.company_code),
    customer_type: detail.customer_type ?? 'B2B',
    vendor_type: detail.vendor_type ?? 'SUPPLIER',
    card_name: detail.card_name,
    foreign_name: detail.foreign_name,
    type_of_business: detail.type_of_business || 'Company',
    industry: detail.industry,
    contact_first_name: detail.contact_first_name,
    contact_last_name: detail.contact_last_name,
    contact_title: detail.contact_title,
    mobile: detail.mobile,
    email: detail.email,
    contact_email: detail.contact_email ?? '',
    alt_contact: detail.alt_contact ?? '',
    currency: detail.currency || 'INR',
    gstin: detail.gstin,
    pan: detail.pan,
    tan: detail.tan ?? '',
    fssai_number: detail.fssai_number ?? '',
    has_msme: detail.has_msme,
    msme_number: detail.msme_number,
    msme_type: detail.msme_type,
    msme_business_type: detail.msme_business_type,
    remarks: detail.remarks,
    bill_addresses: bill.length ? bill : [blankAddress()],
    ship_same_as_bill: ship.length === 0,
    ship_addresses: ship.length ? ship : [blankAddress()],
    bank_accounts: (detail.bank_accounts ?? []).map((bank) => ({
      bank_name: bank.bank_name,
      branch: bank.branch,
      account_number: bank.account_number,
      ifsc: bank.ifsc,
      account_type: bank.account_type,
      swift_code: bank.swift_code,
      sap_bank_code: bank.sap_bank_code,
    })),
  };
}

/** The form's rules without the parts an edit does not touch (company, documents). */
export function validateEdit(family: Family, draft: RegistrationDraft): FormErrors {
  const errors = validateRegistration(family, draft, {});
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => key !== 'company' && !key.startsWith('documents.')),
  );
}

/** The PATCH body: every field, the addresses as one list (named by the server). */
export function editPayload(family: Family, draft: RegistrationDraft): EditPayload {
  const fields: Record<string, unknown> = { ...toPayload(family, draft) };
  for (const key of ['company', 'bill_addresses', 'ship_addresses', 'ship_same_as_bill'])
    delete fields[key];
  const bill = draft.bill_addresses.map(cleanAddress);
  const ship = draft.ship_same_as_bill ? bill : draft.ship_addresses.map(cleanAddress);
  const payload: EditPayload & Record<string, unknown> = {
    ...fields,
    addresses: [
      ...bill.map((a) => ({ ...a, address_type: 'BILL_TO' as const, address_name: '' })),
      ...ship.map((a) => ({ ...a, address_type: 'SHIP_TO' as const, address_name: '' })),
    ],
  };
  if (family === 'vendor') {
    payload.bank_accounts = draft.bank_accounts.map((bank) => ({
      bank_name: upper(bank.bank_name),
      branch: upper(bank.branch),
      account_number: upper(bank.account_number).replace(/\s+/g, ''),
      ifsc: upper(bank.ifsc),
      account_type: bank.account_type,
      swift_code: upper(bank.swift_code),
      sap_bank_code: bank.sap_bank_code ?? '',
    }));
  }
  return payload;
}
