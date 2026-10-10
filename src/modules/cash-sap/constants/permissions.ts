/**
 * Cash book -> SAP permissions, kept inside this module.
 *
 * Two strings, mapping 1:1 to the custom Django permissions of the
 * `cash_sap` app (`cash_sap/permissions.py`), and the two groups its
 * migration `0002_seed_and_groups` creates:
 *
 *   Cash Book SAP Poster   -> cash_book.can_view_cash_book + can_post_cash_to_sap
 *   Cash Book SAP Settings -> cash_book.can_view_cash_book + can_manage_cash_sap_settings
 *
 * Separate mode: `src/config/permissions/*` is not edited on this branch, so
 * these live here rather than in a `cash-sap.permissions.ts` beside the
 * others. Only the cash book's existing, exported lists are imported.
 */
import { CASH_BOOK_ACCESS, CASH_BOOK_PERMISSIONS } from '@/config/permissions';

export const CASH_SAP_PERMISSIONS = {
  /**
   * Freeze a bunch and send it to SAP; change how a voucher posts; add posting
   * bills; the escape hatches (stop, re-check, accept changes, leave out,
   * re-date, close the PO, reset).
   */
  POST: 'cash_sap.can_post_cash_to_sap',
  /** Edit the branch routing and the G/L -> SAP item map. */
  SETTINGS: 'cash_sap.can_manage_cash_sap_settings',
} as const;

export type CashSapPermission = (typeof CASH_SAP_PERMISSIONS)[keyof typeof CASH_SAP_PERMISSIONS];

/** Reveals the "Cash → SAP" sidebar group: any `cash_sap.*` right. */
export const CASH_SAP_MODULE_PREFIX = 'cash_sap';

export const CASH_SAP_POST_ACCESS: readonly string[] = [CASH_SAP_PERMISSIONS.POST];
export const CASH_SAP_SETTINGS_ACCESS: readonly string[] = [CASH_SAP_PERMISSIONS.SETTINGS];

/**
 * Reading the plan, the statuses, the routing and the map: the backend's
 * `CASH_READ` -- any cash book right, or either cash_sap right. Routes check
 * ANY of a list, so this is the read gate of every page here.
 */
export const CASH_SAP_READ_ACCESS: readonly string[] = [
  ...CASH_BOOK_ACCESS,
  CASH_SAP_PERMISSIONS.POST,
  CASH_SAP_PERMISSIONS.SETTINGS,
];

/** Writing a voucher's bill facts: the custodian or the poster (`VoucherInfoPermission`). */
export const CASH_SAP_VOUCHER_INFO_WRITE_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.MANAGE,
  CASH_SAP_PERMISSIONS.POST,
];

/** The SAP item picker (`CanSearchSapItems`): the poster or the settings holder. */
export const CASH_SAP_ITEM_SEARCH_ACCESS: readonly string[] = [
  CASH_SAP_PERMISSIONS.POST,
  CASH_SAP_PERMISSIONS.SETTINGS,
];
