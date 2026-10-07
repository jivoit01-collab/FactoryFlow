/**
 * Expense Claim Permissions
 *
 * One string of its own, `expense_claims.can_submit_expense_claim`, held by
 * the Expense Submitter group `setup_expense_claim_groups` creates (everybody).
 *
 * There is no approve right: an expense can be sent to any active user, and
 * whoever it was sent to decides it. The cash book's approvers may also see
 * every expense on the approval page.
 *
 * The pages live under Accounts, whose menu is revealed by either this prefix
 * or the cash book's — a submitter holds no cash book right at all.
 */

import { CASH_BOOK_PERMISSIONS } from './cash-book.permissions';

export const EXPENSE_CLAIM_PERMISSIONS = {
  /** Put in an expense. */
  SUBMIT: 'expense_claims.can_submit_expense_claim',
} as const;

export const EXPENSE_CLAIM_MODULE_PREFIX = 'expense_claims';

/** The Expense Entry page. */
export const EXPENSE_ENTRY_ACCESS: readonly string[] = [EXPENSE_CLAIM_PERMISSIONS.SUBMIT];

/** The Expense Approval page: anybody can be sent an expense to decide. */
export const EXPENSE_APPROVAL_ACCESS: readonly string[] = [
  EXPENSE_CLAIM_PERMISSIONS.SUBMIT,
  CASH_BOOK_PERMISSIONS.APPROVE,
];

export type ExpenseClaimPermission =
  (typeof EXPENSE_CLAIM_PERMISSIONS)[keyof typeof EXPENSE_CLAIM_PERMISSIONS];
