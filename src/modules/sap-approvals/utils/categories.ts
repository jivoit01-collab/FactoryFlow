import type { SapRejectionCategory } from '../types';

/**
 * What kind of entry was rejected — the accounts desk's own heads, picked when
 * rejecting. Mirrors `RejectionCategory` in sap_approvals/constants.py, which
 * refuses anything else.
 */
export const REJECTION_CATEGORIES: { value: SapRejectionCategory; label: string }[] = [
  { value: 'CASH_VOUCHER', label: 'Cash Voucher' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'IMPREST', label: 'Imprest' },
  { value: 'RENT', label: 'Rent' },
  { value: 'REPAIRS', label: 'R&M' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'OTHER', label: 'Other' },
];
