import type {
  ItemConditionOut,
  ItemReturnCondition,
  ReturnablePurpose,
  ReturnableStatus,
} from '../types';

export const RETURNABLE_PURPOSE_OPTIONS: { value: ReturnablePurpose; label: string }[] = [
  { value: 'REPAIR', label: 'Repair' },
  { value: 'EXCHANGE', label: 'Exchange / Replacement' },
  { value: 'CALIBRATION', label: 'Calibration' },
  { value: 'JOB_WORK', label: 'Job Work' },
  { value: 'WARRANTY_CLAIM', label: 'Warranty Claim' },
  { value: 'TESTING', label: 'Testing / Inspection' },
  { value: 'DEMO_TRIAL', label: 'Demo / Trial' },
  { value: 'OTHER', label: 'Other' },
];

export const CONDITION_OUT_OPTIONS: { value: ItemConditionOut; label: string }[] = [
  { value: 'FAULTY', label: 'Faulty' },
  { value: 'WORKING', label: 'Working' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'NEW', label: 'New / Unused' },
  { value: 'OTHER', label: 'Other' },
];

export const RETURN_CONDITION_OPTIONS: { value: ItemReturnCondition; label: string }[] = [
  { value: 'OK', label: 'OK' },
  { value: 'REPAIRED', label: 'Repaired' },
  { value: 'REPLACED', label: 'Replaced' },
  { value: 'NOT_REPAIRED', label: 'Not Repaired' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'SCRAP', label: 'Scrap' },
];

export const RETURNABLE_STATUS_OPTIONS: { value: ReturnableStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'PENDING_GATE_OUT', label: 'Pending Gate Out' },
  { value: 'OUT', label: 'Out' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially Returned' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const RETURNABLE_STATUS_LABELS: Record<ReturnableStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  PENDING_GATE_OUT: 'Pending Gate Out',
  OUT: 'Out',
  PARTIALLY_RETURNED: 'Partially Returned',
  RETURNED: 'Returned',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

/** Tailwind classes for the status badge, one per status. */
export const RETURNABLE_STATUS_STYLES: Record<ReturnableStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  PENDING_APPROVAL: 'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
  PENDING_GATE_OUT: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  OUT: 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  PARTIALLY_RETURNED: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30',
  RETURNED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  CLOSED: 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground border-slate-200 dark:border-border',
  CANCELLED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
};

export const RETURN_CONDITION_STYLES: Record<ItemReturnCondition, string> = {
  OK: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
  REPAIRED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
  REPLACED: 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400',
  NOT_REPAIRED: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400',
  DAMAGED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400',
  SCRAP: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400',
};

export const ATTACHMENT_DOC_TYPE_OPTIONS = [
  { value: 'CHALLAN', label: 'Delivery Challan' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'OTHER', label: 'Other' },
];

/** Statuses where material is physically outside the gate. Mirrors the backend. */
export const OUTSTANDING_STATUSES: ReturnableStatus[] = ['OUT', 'PARTIALLY_RETURNED'];
