/**
 * SAP Finance Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * The split follows SAP Portal's two modules: journal entries, the general
 * ledger and the chart of accounts were one (`journal-entries`), the budget
 * screen another (`budget`). The outstanding reports came from EXIM and have a
 * right of their own, beside which each also opens to the EXIM rights that
 * showed that report there.
 *
 * @see factory_app/sap_finance/permissions.py — these strings must match exactly
 */

export const SAP_FINANCE_PERMISSIONS = {
  /** Journal entries, general ledger, chart of accounts. */
  VIEW_LEDGERS: 'sap_finance.can_view_sap_ledgers',
  /** Read budgets and who changed them. */
  VIEW_BUDGETS: 'sap_finance.can_view_sap_budgets',
  /** Create, edit and delete budgets in SAP. The server treats it as implying VIEW_BUDGETS. */
  MANAGE_BUDGETS: 'sap_finance.can_manage_sap_budgets',
  /** Every outstanding report: party balances, open A/P and A/R, open GRPOs, aging. */
  VIEW_OUTSTANDING: 'sap_finance.can_view_sap_outstanding',
} as const;

/** The right to every outstanding report. */
export const SAP_FINANCE_OUTSTANDING_PERMISSION = SAP_FINANCE_PERMISSIONS.VIEW_OUTSTANDING;

export const SAP_FINANCE_MODULE_PREFIX = 'sap_finance';

/** The three ledger pages. */
export const SAP_FINANCE_LEDGERS_ACCESS: readonly string[] = [SAP_FINANCE_PERMISSIONS.VIEW_LEDGERS];

/** The budget page (managing implies viewing). */
export const SAP_FINANCE_BUDGETS_ACCESS: readonly string[] = [
  SAP_FINANCE_PERMISSIONS.VIEW_BUDGETS,
  SAP_FINANCE_PERMISSIONS.MANAGE_BUDGETS,
];

// Each outstanding report opens to the right to them all, or to the EXIM rights
// that showed it there (`EXIM_OUTSTANDING_RIGHTS` in sap_finance/permissions.py),
// so nobody who could see a report in EXIM loses it here.

/** Party Outstanding, vendors' side. */
export const SAP_FINANCE_VENDOR_OUTSTANDING_ACCESS: readonly string[] = [
  SAP_FINANCE_OUTSTANDING_PERMISSION,
  'exim.view_vendor_outstanding',
  'exim.sync_balance_sheet',
];

/** Party Outstanding, customers' side. */
export const SAP_FINANCE_CUSTOMER_OUTSTANDING_ACCESS: readonly string[] = [
  SAP_FINANCE_OUTSTANDING_PERMISSION,
  'exim.view_customer_outstanding',
  'exim.view_customer_balance_sheet',
];

/** The Party Outstanding page: either side. */
export const SAP_FINANCE_PARTY_OUTSTANDING_ACCESS: readonly string[] = [
  ...new Set([
    ...SAP_FINANCE_VENDOR_OUTSTANDING_ACCESS,
    ...SAP_FINANCE_CUSTOMER_OUTSTANDING_ACCESS,
  ]),
];

/** Open A/P: open vendor invoices. */
export const SAP_FINANCE_OPEN_AP_ACCESS: readonly string[] = [
  SAP_FINANCE_OUTSTANDING_PERMISSION,
  'exim.view_open_aps',
];

/** Open A/R: open customer invoices. */
export const SAP_FINANCE_OPEN_AR_ACCESS: readonly string[] = [
  SAP_FINANCE_OUTSTANDING_PERMISSION,
  'exim.view_open_ars',
];

/** Open GRPOs: goods received and not yet billed. */
export const SAP_FINANCE_OPEN_GRPOS_ACCESS: readonly string[] = [
  SAP_FINANCE_OUTSTANDING_PERMISSION,
  'exim.sync_open_grpos',
];

/** Customer Aging. */
export const SAP_FINANCE_CUSTOMER_AGING_ACCESS: readonly string[] = [
  SAP_FINANCE_OUTSTANDING_PERMISSION,
  'exim.view_customer_aging',
];

/** Any outstanding report. */
export const SAP_FINANCE_OUTSTANDING_ACCESS: readonly string[] = [
  ...new Set([
    ...SAP_FINANCE_PARTY_OUTSTANDING_ACCESS,
    ...SAP_FINANCE_OPEN_AP_ACCESS,
    ...SAP_FINANCE_OPEN_AR_ACCESS,
    ...SAP_FINANCE_OPEN_GRPOS_ACCESS,
    ...SAP_FINANCE_CUSTOMER_AGING_ACCESS,
  ]),
];

/** Anything that should reveal the module in the sidebar. */
export const SAP_FINANCE_ACCESS: readonly string[] = [
  ...SAP_FINANCE_LEDGERS_ACCESS,
  ...SAP_FINANCE_BUDGETS_ACCESS,
  ...SAP_FINANCE_OUTSTANDING_ACCESS,
];

export type SapFinancePermission =
  (typeof SAP_FINANCE_PERMISSIONS)[keyof typeof SAP_FINANCE_PERMISSIONS];
