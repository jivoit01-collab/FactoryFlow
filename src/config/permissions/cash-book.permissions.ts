/**
 * Cash Book Permissions
 *
 * Three strings, mapping 1:1 to the custom Django permissions in the
 * `cash_book` app, and three groups behind them:
 *
 *   Cash Book Viewer     -> can_view_cash_book
 *   Cash Book Custodian  -> can_view_cash_book + can_manage_cash_book
 *   Cash Book Approver   -> can_view_cash_book + can_approve_cash_bunch
 *
 * Custodian and approver are deliberately separate: one person holding the
 * cash and approving their own vouchers is the thing the bunch flow exists to
 * prevent. Granting both to one person is possible, but it has to be a choice.
 *
 * Manage and approve each imply view at the API, so the access list below is
 * what reveals the module.
 */

export const CASH_BOOK_PERMISSIONS = {
  /** Read the register, the balance and the bunches. */
  VIEW: 'cash_book.can_view_cash_book',
  /** Record, correct and cancel entries; send a bunch for approval. */
  MANAGE: 'cash_book.can_manage_cash_book',
  /** Approve or reject a bunch somebody else sent. */
  APPROVE: 'cash_book.can_approve_cash_bunch',
} as const;

export const CASH_BOOK_MODULE_PREFIX = 'cash_book';

/** Anything that should reveal the cash book. */
export const CASH_BOOK_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.VIEW,
  CASH_BOOK_PERMISSIONS.MANAGE,
  CASH_BOOK_PERMISSIONS.APPROVE,
];

/** The approvals screen is for approvers, and for the custodian chasing one. */
export const CASH_BOOK_APPROVALS_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.APPROVE,
  CASH_BOOK_PERMISSIONS.MANAGE,
];

export type CashBookPermission =
  (typeof CASH_BOOK_PERMISSIONS)[keyof typeof CASH_BOOK_PERMISSIONS];
