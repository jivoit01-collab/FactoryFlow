import type { ExpenseClaimStatus } from '@/modules/accounts/api';
import { formatNumber } from '@/shared/utils';

export const expenseMoney = (value: string | number) => `₹${formatNumber(Number(value ?? 0))}`;

export const EXPENSE_STATUS_LABEL: Record<ExpenseClaimStatus, string> = {
  PENDING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const EXPENSE_STATUS_TONE: Record<ExpenseClaimStatus, string> = {
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400',
};
