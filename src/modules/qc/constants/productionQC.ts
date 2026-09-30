import type { ProductionQCStatus } from '../types/productionQC.types';

interface ProductionQCStatusConfig {
  label: string;
  /** Pill classes for the status badge. */
  className: string;
}

export const PRODUCTION_QC_STATUS_CONFIG: Record<ProductionQCStatus, ProductionQCStatusConfig> = {
  PENDING: {
    label: 'Pending Approval',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  },
  SENT_BACK: {
    label: 'Sent Back',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  },
};

/** The dashboard's status chips, in order. */
export const PRODUCTION_QC_STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: PRODUCTION_QC_STATUS_CONFIG.PENDING.label },
  { key: 'SENT_BACK', label: PRODUCTION_QC_STATUS_CONFIG.SENT_BACK.label },
  { key: 'APPROVED', label: PRODUCTION_QC_STATUS_CONFIG.APPROVED.label },
] as const;

export type ProductionQCStatusFilter = (typeof PRODUCTION_QC_STATUS_FILTERS)[number]['key'];

/**
 * Entries still waiting on someone. The server lists these on every date, so an
 * unfinished check never drops off the list with age.
 */
export const PRODUCTION_QC_UNFINISHED: readonly ProductionQCStatus[] = ['PENDING', 'SENT_BACK'];
