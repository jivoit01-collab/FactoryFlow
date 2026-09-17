/**
 * Cash Book Permissions
 *
 * Four strings, mapping 1:1 to the custom Django permissions in the
 * `cash_book` app, and the four groups `setup_cash_book_groups` creates:
 *
 *   Cash Book Viewer        -> can_view_cash_book
 *   Cash Book Custodian     -> + can_manage_cash_book
 *   Cash Book Approver      -> + can_approve_cash_entries
 *   Cash Book Administrator -> + can_manage_cash_book, can_manage_cash_branches
 *
 * Custodian and approver are deliberately separate: one person recording the
 * cash and agreeing to their own spending is the thing this module exists to
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
  /** Approve or reject a payment somebody else recorded. */
  APPROVE: 'cash_book.can_approve_cash_entries',
  /** Configure the branch list every entry is filed under. */
  BRANCHES: 'cash_book.can_manage_cash_branches',
} as const;

export const CASH_BOOK_MODULE_PREFIX = 'cash_book';

/** Anything that should reveal the cash book. */
export const CASH_BOOK_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.VIEW,
  CASH_BOOK_PERMISSIONS.MANAGE,
  CASH_BOOK_PERMISSIONS.APPROVE,
  CASH_BOOK_PERMISSIONS.BRANCHES,
];

/** The approvals screen is for approvers, and for the custodian chasing them. */
export const CASH_BOOK_APPROVALS_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.APPROVE,
  CASH_BOOK_PERMISSIONS.MANAGE,
];

/** The settings screen: renaming a branch reaches through the whole register. */
export const CASH_BOOK_SETTINGS_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.BRANCHES,
];

export type CashBookPermission =
  (typeof CASH_BOOK_PERMISSIONS)[keyof typeof CASH_BOOK_PERMISSIONS];
