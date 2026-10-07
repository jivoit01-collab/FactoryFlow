/**
 * Accounts module — the factory's cash box.
 *
 * Seven pages, following the money. **ATM** is the imprest card the cash is
 * drawn off. **Cash Book** is the register: every receipt and payment in the
 * order it was written down, with the running balance beside it, and the
 * tick-and-bundle that batches approved vouchers for head office. **Advances**
 * is cash out with somebody who has not yet said what it went on. **Advance
 * Salary** is the opposite arrangement -- cash given against a wage, which
 * comes back off it. **Cash Approvals** is where each payment is agreed to,
 * one by one. **Bunches** records the batches that were downloaded and mailed,
 * and **Branches** configures the short list every payment is filed under --
 * Oil, Beverage, Water, Common.
 *
 * Two more pages carry **expense claims**, a separate app (`expense_claims`)
 * common to every company: **Expense Entry** is anybody's — branch, budget,
 * G/L account (or what it is for), comment and amount; **Expense Approval** is
 * where an expense approver approves or rejects it.
 *
 * The sidebar hides the whole module from anyone without a `cash_book.*` or
 * `expense_claims.*` permission (`modulePrefix`), so the groups the backend
 * ships with are the only way in. The group link itself goes to `/accounts`,
 * which sends each reader on to the first page they can open. Two pages are narrowed further. Approvals is the approver's,
 * because deciding is theirs. Advance Salary is the odd one out and reaches
 * *wider*: a Salary Advance HR user holds `can_approve_salary_advances` and no
 * other cash book right, which shares the module prefix and so reveals the
 * menu — and then every child but that one is hidden from them.
 */
import {
  BadgeIndianRupee,
  Building2,
  ClipboardCheck,
  CreditCard,
  HandCoins,
  IndianRupee,
  Package,
  ReceiptText,
  UserCheck,
  Wallet,
} from 'lucide-react';

import {
  CASH_BOOK_ACCESS,
  CASH_BOOK_APPROVALS_ACCESS,
  CASH_BOOK_MODULE_PREFIX,
  CASH_BOOK_SETTINGS_ACCESS,
  EXPENSE_APPROVAL_ACCESS,
  EXPENSE_CLAIM_MODULE_PREFIX,
  EXPENSE_ENTRY_ACCESS,
  SALARY_ADVANCE_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const CashBookPage = lazy(() => import('./pages/CashBookPage'));
const CashApprovalsPage = lazy(() => import('./pages/CashApprovalsPage'));
const CashBranchSettingsPage = lazy(() => import('./pages/CashBranchSettingsPage'));
const AtmPage = lazy(() => import('./pages/AtmPage'));
const AdvancesPage = lazy(() => import('./pages/AdvancesPage'));
const AdvanceSalaryPage = lazy(() => import('./pages/AdvanceSalaryPage'));
const BunchesPage = lazy(() => import('./pages/BunchesPage'));
const AccountsLandingPage = lazy(() => import('./pages/AccountsLandingPage'));
const ExpenseEntryPage = lazy(() => import('./pages/ExpenseEntryPage'));
const ExpenseApprovalPage = lazy(() => import('./pages/ExpenseApprovalPage'));

export const accountsModuleConfig: ModuleConfig = {
  name: 'accounts',
  routes: [
    {
      // The group link. No permission of its own: it only redirects, and the
      // page it lands on does the checking.
      path: '/accounts',
      element: <AccountsLandingPage />,
      layout: 'main',
    },
    {
      path: '/accounts/cash-book',
      element: <CashBookPage />,
      layout: 'main',
      permissions: CASH_BOOK_ACCESS,
      breadcrumb: { label: 'Cash Book' },
    },
    {
      path: '/accounts/atm',
      element: <AtmPage />,
      layout: 'main',
      permissions: CASH_BOOK_ACCESS,
      breadcrumb: { label: 'ATM' },
    },
    {
      path: '/accounts/advances',
      element: <AdvancesPage />,
      layout: 'main',
      permissions: CASH_BOOK_ACCESS,
      breadcrumb: { label: 'Advances' },
    },
    {
      path: '/accounts/advance-salary',
      element: <AdvanceSalaryPage />,
      layout: 'main',
      // The one route in the module an HR user reaches. They hold no cash
      // book right at all, and every other page here stays shut to them.
      permissions: SALARY_ADVANCE_ACCESS,
      breadcrumb: { label: 'Advance Salary' },
    },
    {
      path: '/accounts/bunches',
      element: <BunchesPage />,
      layout: 'main',
      permissions: CASH_BOOK_ACCESS,
      breadcrumb: { label: 'Bunches' },
    },
    {
      path: '/accounts/cash-approvals',
      element: <CashApprovalsPage />,
      layout: 'main',
      permissions: CASH_BOOK_APPROVALS_ACCESS,
      breadcrumb: { label: 'Cash Approvals' },
    },
    {
      path: '/accounts/branches',
      element: <CashBranchSettingsPage />,
      layout: 'main',
      // Readable by anyone who can read the book -- the page says so itself
      // when the visitor cannot change anything -- but only an administrator
      // is offered it in the sidebar.
      permissions: CASH_BOOK_ACCESS,
      breadcrumb: { label: 'Cash Book Branches' },
    },
    {
      path: '/accounts/expense-entry',
      element: <ExpenseEntryPage />,
      layout: 'main',
      permissions: EXPENSE_ENTRY_ACCESS,
      breadcrumb: { label: 'Expense Entry' },
    },
    {
      path: '/accounts/expense-approval',
      element: <ExpenseApprovalPage />,
      layout: 'main',
      permissions: EXPENSE_APPROVAL_ACCESS,
      breadcrumb: { label: 'Expense Approval' },
    },
  ],
  navigation: [
    {
      path: '/accounts',
      title: 'Accounts',
      icon: IndianRupee,
      showInSidebar: true,
      hasSubmenu: true,
      modulePrefix: [CASH_BOOK_MODULE_PREFIX, EXPENSE_CLAIM_MODULE_PREFIX],
      children: [
        {
          path: '/accounts/cash-book',
          title: 'Cash Book',
          icon: Wallet,
          permissions: CASH_BOOK_ACCESS,
        },
        {
          path: '/accounts/atm',
          title: 'ATM',
          icon: CreditCard,
          permissions: CASH_BOOK_ACCESS,
        },
        {
          path: '/accounts/advances',
          title: 'Advances',
          icon: HandCoins,
          permissions: CASH_BOOK_ACCESS,
        },
        {
          path: '/accounts/advance-salary',
          title: 'Advance Salary',
          icon: BadgeIndianRupee,
          permissions: SALARY_ADVANCE_ACCESS,
        },
        {
          path: '/accounts/bunches',
          title: 'Bunches',
          icon: Package,
          permissions: CASH_BOOK_ACCESS,
        },
        {
          path: '/accounts/cash-approvals',
          title: 'Cash Approvals',
          icon: ClipboardCheck,
          permissions: CASH_BOOK_APPROVALS_ACCESS,
        },
        {
          path: '/accounts/branches',
          title: 'Branches',
          icon: Building2,
          permissions: CASH_BOOK_SETTINGS_ACCESS,
        },
        {
          path: '/accounts/expense-entry',
          title: 'Expense Entry',
          icon: ReceiptText,
          permissions: EXPENSE_ENTRY_ACCESS,
        },
        {
          path: '/accounts/expense-approval',
          title: 'Expense Approval',
          icon: UserCheck,
          permissions: EXPENSE_APPROVAL_ACCESS,
        },
      ],
    },
  ],
};
