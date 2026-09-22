/**
 * Accounts module — the factory's cash box.
 *
 * Seven pages, following the money. **ATM** is the imprest card the cash is
 * drawn off. **Cash Book** is the register: every receipt and payment in the
 * order it was written down, with the running balance beside it, and the
 * tick-and-bundle that batches approved vouchers for head office. **Advances**
 * is cash out with somebody who has not yet said what it went on. **Advance
 * Salary** is the opposite arrangement -- cash given against a wage, which
 * comes back off it once HR agree. **Cash Approvals** is where each payment is
 * agreed to, one by one. **Bunches** records the batches that were downloaded
 * and mailed, and **Branches** configures the short list every payment is
 * filed under -- Oil, Beverage, Water, Common.
 *
 * The sidebar hides the whole module from anyone without a `cash_book.*`
 * permission (`modulePrefix`), so the groups the backend ships with are the
 * only way in. Two pages are narrowed further. Approvals is the approver's,
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
  Wallet,
} from 'lucide-react';

import {
  CASH_BOOK_ACCESS,
  CASH_BOOK_APPROVALS_ACCESS,
  CASH_BOOK_MODULE_PREFIX,
  CASH_BOOK_SETTINGS_ACCESS,
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

export const accountsModuleConfig: ModuleConfig = {
  name: 'accounts',
  routes: [
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
  ],
  navigation: [
    {
      path: '/accounts/cash-book',
      title: 'Accounts',
      icon: IndianRupee,
      showInSidebar: true,
      hasSubmenu: true,
      modulePrefix: CASH_BOOK_MODULE_PREFIX,
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
      ],
    },
  ],
};
