/**
 * SAP Finance Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * The split follows SAP Portal's two modules: journal entries, the general
 * ledger and the chart of accounts were one (`journal-entries`), the budget
 * screen another (`budget`).
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
} as const;

export const SAP_FINANCE_MODULE_PREFIX = 'sap_finance';

/** The three ledger pages. */
export const SAP_FINANCE_LEDGERS_ACCESS: readonly string[] = [SAP_FINANCE_PERMISSIONS.VIEW_LEDGERS];

/** The budget page (managing implies viewing). */
export const SAP_FINANCE_BUDGETS_ACCESS: readonly string[] = [
  SAP_FINANCE_PERMISSIONS.VIEW_BUDGETS,
  SAP_FINANCE_PERMISSIONS.MANAGE_BUDGETS,
];

/** Anything that should reveal the module in the sidebar. */
export const SAP_FINANCE_ACCESS: readonly string[] = [
  ...SAP_FINANCE_LEDGERS_ACCESS,
  ...SAP_FINANCE_BUDGETS_ACCESS,
];

export type SapFinancePermission =
  (typeof SAP_FINANCE_PERMISSIONS)[keyof typeof SAP_FINANCE_PERMISSIONS];
