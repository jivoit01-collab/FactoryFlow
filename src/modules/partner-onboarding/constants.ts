/**
 * The registration forms' options and rules, mirrored from the backend.
 *
 * @see factory_app/partner_onboarding/constants.py — the server checks the same
 * lists and formats, so a change there needs one here.
 */
import type { StatusTone } from '@/shared/components/page';

export type Family = 'customer' | 'vendor';
export type FamilyPath = 'customers' | 'vendors';

export const FAMILY_PATH: Record<Family, FamilyPath> = { customer: 'customers', vendor: 'vendors' };

export type RegistrationStatus = 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED';

export const STATUS_OPTIONS: readonly {
  value: RegistrationStatus;
  label: string;
  tone: StatusTone;
}[] = [
  { value: 'PENDING', label: 'Pending verification', tone: 'warn' },
  { value: 'VERIFIED', label: 'Verified, awaiting SAP', tone: 'info' },
  { value: 'APPROVED', label: 'Created in SAP', tone: 'done' },
  { value: 'REJECTED', label: 'Rejected', tone: 'blocked' },
];

export function statusTone(status: string): StatusTone {
  return STATUS_OPTIONS.find((option) => option.value === status)?.tone ?? 'neutral';
}

/** The three SAP companies a public form may be sent to. */
export const PUBLIC_COMPANY_CODES = ['JIVO_OIL', 'JIVO_MART', 'JIVO_BEVERAGES'] as const;

export const CUSTOMER_TYPES = [
  { value: 'B2B', label: 'B2B — a business' },
  { value: 'B2C', label: 'B2C — an individual' },
] as const;

/** What the approver may set (approvals.html offered the other three). */
export const ALL_CUSTOMER_TYPES = [
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'RETAILER', label: 'Retailer' },
] as const;

export const VENDOR_TYPES = [
  { value: 'SUPPLIER', label: 'Supplier — goods, raw materials, products' },
  { value: 'SERVICE', label: 'Service provider — labour, consulting, maintenance' },
  { value: 'BOTH', label: 'Both — goods and services' },
] as const;

export const CUSTOMER_BUSINESS_TYPES = [
  'Company',
  'Individual',
  'Partnership',
  'LLP',
  'Proprietorship',
] as const;
export const VENDOR_BUSINESS_TYPES = [...CUSTOMER_BUSINESS_TYPES, 'Trust', 'Society'] as const;

export const CUSTOMER_INDUSTRIES = [
  'Transport',
  'Manufacturing',
  'Trading',
  'Retail',
  'Distribution',
  'FMCG',
  'Healthcare',
  'Construction',
  'IT Services',
  'Others',
] as const;

export const VENDOR_INDUSTRIES = [
  'Manufacturing',
  'Trading',
  'Transport & Logistics',
  'Food & Beverage',
  'Chemicals',
  'Pharma',
  'Agriculture',
  'IT Services',
  'Printing & Packaging',
  'Engineering',
  'Textiles',
  'Construction',
  'Others',
] as const;

export const MSME_TYPES = ['MICRO', 'SMALL', 'MEDIUM', 'LARGE'] as const;
/** The two forms never agreed on these spellings; each posted its own to SAP. */
export const CUSTOMER_MSME_BUSINESS_TYPES = ['MANUFACTURING', 'SERVICES', 'TRADING'] as const;
export const VENDOR_MSME_BUSINESS_TYPES = [
  'Manufacturing',
  'Service',
  'Trading',
  'Others',
] as const;

export const CURRENCIES = [
  { value: 'INR', label: 'Indian Rupee' },
  { value: 'USD', label: 'US Dollar' },
  { value: 'EUR', label: 'Euro' },
  { value: 'GBP', label: 'British Pound' },
  { value: 'AED', label: 'UAE Dirham' },
] as const;

export const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AE', label: 'UAE' },
  { value: 'SG', label: 'Singapore' },
  { value: 'DE', label: 'Germany' },
  { value: 'JP', label: 'Japan' },
  { value: 'AU', label: 'Australia' },
] as const;

export const BANK_ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft'] as const;

export type DocumentSlot = 'pan' | 'aadhaar' | 'cheque' | 'gst' | 'msme' | 'fssai' | 'other';

export interface DocumentSlotInfo {
  slot: DocumentSlot;
  label: string;
  /** Several files allowed (Other documents, FSSAI licence pages). */
  multiple?: boolean;
}

/** The upload slots each form offers, in the order the portal showed them. */
export const DOCUMENT_SLOTS: Record<Family, readonly DocumentSlotInfo[]> = {
  customer: [
    { slot: 'pan', label: 'PAN card' },
    { slot: 'aadhaar', label: 'Aadhaar card' },
    { slot: 'cheque', label: 'Cancelled cheque' },
    { slot: 'msme', label: 'MSME / Udyam certificate' },
    { slot: 'other', label: 'Other documents', multiple: true },
  ],
  vendor: [
    { slot: 'pan', label: 'PAN card' },
    { slot: 'cheque', label: 'Cancelled cheque' },
    { slot: 'gst', label: 'GST certificate' },
    { slot: 'msme', label: 'MSME / Udyam certificate' },
    { slot: 'fssai', label: 'FSSAI licence', multiple: true },
    { slot: 'other', label: 'Other documents', multiple: true },
  ],
};

/** Slots the form insists on (the MSME certificate too, when registered under MSME). */
export const REQUIRED_DOCUMENTS: Record<Family, readonly DocumentSlot[]> = {
  customer: ['pan', 'aadhaar', 'cheque'],
  vendor: ['pan', 'cheque', 'gst'],
};

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png';

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const UDYAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
export const MOBILE_RE = /^[0-9+\s-]{8,15}$/;
export const EMAIL_RE = /^\S+@\S+\.\S+$/;
export const TAN_RE = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
export const FSSAI_RE = /^\d{14}$/;
export const CARD_CODE_PREFIX_RE = /^[A-Z0-9]{1,10}$/;

/** SAP's widths (OCRD.CardName, OCPR.Name, CRD1 lines). */
export const SAP_CARD_NAME_MAX = 100;
export const SAP_CONTACT_NAME_MAX = 50;
export const SAP_ADDRESS_LINE_MAX = 100;
export const REMARKS_MAX = 1000;
