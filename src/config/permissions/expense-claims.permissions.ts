/**
 * Expense Claim Permissions
 *
 * Two strings, mapping 1:1 to the custom Django permissions in the
 * `expense_claims` app and the groups `setup_expense_claim_groups` creates:
 *
 *   Expense Submitter -> can_submit_expense_claim     (everybody)
 *   Expense Approver  -> + can_approve_expense_claims (filled from Admin)
 *
 * The pages live under Accounts, whose menu is revealed by either this prefix
 * or the cash book's — a submitter holds no cash book right at all.
 */

export const EXPENSE_CLAIM_PERMISSIONS = {
  /** Put in an expense. */
  SUBMIT: 'expense_claims.can_submit_expense_claim',
  /** Approve or reject any expense but your own. */
  APPROVE: 'expense_claims.can_approve_expense_claims',
} as const;

export const EXPENSE_CLAIM_MODULE_PREFIX = 'expense_claims';

/** The Expense Entry page. */
export const EXPENSE_ENTRY_ACCESS: readonly string[] = [EXPENSE_CLAIM_PERMISSIONS.SUBMIT];

/** The Expense Approval page. */
export const EXPENSE_APPROVAL_ACCESS: readonly string[] = [EXPENSE_CLAIM_PERMISSIONS.APPROVE];

export type ExpenseClaimPermission =
  (typeof EXPENSE_CLAIM_PERMISSIONS)[keyof typeof EXPENSE_CLAIM_PERMISSIONS];
