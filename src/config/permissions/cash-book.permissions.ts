/**
 * Cash Book Permissions
 *
 * Five strings, mapping 1:1 to the custom Django permissions in the
 * `cash_book` app, and the five groups `setup_cash_book_groups` creates:
 *
 *   Cash Book Viewer        -> can_view_cash_book
 *   Cash Book Custodian     -> + can_manage_cash_book
 *   Cash Book Approver      -> + can_approve_cash_entries
 *   Cash Book Administrator -> + can_manage_cash_book, can_manage_cash_branches
 *   Salary Advance HR       -> can_approve_salary_advances, and nothing else
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
  /**
   * HR's own: agree that an advance comes back off somebody's wage.
   *
   * Deliberately not implied by APPROVE. Agreeing to a payment and agreeing to
   * dock a person's pay are different decisions taken by different people, and
   * the cash approver is not the payroll.
   */
  SALARY_ADVANCE: 'cash_book.can_approve_salary_advances',
} as const;

export const CASH_BOOK_MODULE_PREFIX = 'cash_book';

/** Anything that should reveal the cash book. */
export const CASH_BOOK_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.VIEW,
  CASH_BOOK_PERMISSIONS.MANAGE,
  CASH_BOOK_PERMISSIONS.APPROVE,
  CASH_BOOK_PERMISSIONS.BRANCHES,
];

/**
 * The advance salary screen: accounts record on it, HR decide on it.
 *
 * The one list here that admits somebody without a cash book right. HR are not
 * book-keepers and have nothing to do with the register — but the advance they
 * are deciding on is recorded against it, so this screen has to let them in by
 * name. Every other page in the module stays hidden from them.
 */
export const SALARY_ADVANCE_ACCESS: readonly string[] = [
  CASH_BOOK_PERMISSIONS.SALARY_ADVANCE,
  CASH_BOOK_PERMISSIONS.VIEW,
  CASH_BOOK_PERMISSIONS.MANAGE,
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
