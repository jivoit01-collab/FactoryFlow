import { Navigate } from 'react-router-dom';

import {
  CASH_BOOK_ACCESS,
  EXPENSE_APPROVAL_ACCESS,
  EXPENSE_ENTRY_ACCESS,
  SALARY_ADVANCE_ACCESS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { PageLoading } from '@/shared/components/PageLoading';

/** First match wins: the page each kind of reader is most likely there for. */
const DESTINATIONS: { path: string; access: readonly string[] }[] = [
  { path: '/accounts/cash-book', access: CASH_BOOK_ACCESS },
  { path: '/accounts/expense-entry', access: EXPENSE_ENTRY_ACCESS },
  { path: '/accounts/expense-approval', access: EXPENSE_APPROVAL_ACCESS },
  { path: '/accounts/advance-salary', access: SALARY_ADVANCE_ACCESS },
];

/**
 * Where the sidebar's "Accounts" link goes.
 *
 * The menu is shown to people with very different rights — a cash custodian,
 * an HOD, and somebody on the floor who can only put in an expense — so no
 * single page is right for the group link. This sends each to the first page
 * they can actually open, rather than the cash book's "unauthorized".
 */
export default function AccountsLandingPage() {
  const { hasAnyPermission, permissionsLoaded } = usePermission();
  if (!permissionsLoaded) return <PageLoading />;

  const target = DESTINATIONS.find((row) => hasAnyPermission([...row.access]));
  return <Navigate to={target?.path ?? '/unauthorized'} replace />;
}
