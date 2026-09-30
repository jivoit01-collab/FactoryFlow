/**
 * SAP Finance module — SAP Portal's finance screens, merged into JI.
 *
 * Journal entries, the general ledger of one account and the chart of accounts
 * (read live from SAP), plus the budget screen, which writes SAP's BUDGET
 * user-defined object. Its own sidebar group, registered beside Accounts: that
 * group is the factory's cash box (`cash_book`), this one is SAP's books, and a
 * person often holds one without the other.
 *
 * Gated on explicit rights, not a module prefix: in the sidebar a prefix
 * short-circuits `permissions` and would show the whole group to anyone holding
 * any sap_finance.* right. The ledger pages and the budget page have their own
 * audiences (SAP Portal's `journal-entries` and `budget` modules).
 */
import { BookOpen, FileSpreadsheet, ListTree, PiggyBank } from 'lucide-react';

import { SAP_FINANCE_BUDGETS_ACCESS, SAP_FINANCE_LEDGERS_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleNavItem } from '@/core/types';

const JournalEntriesPage = lazy(() => import('./pages/JournalEntriesPage'));
const GeneralLedgerPage = lazy(() => import('./pages/GeneralLedgerPage'));
const ChartOfAccountsPage = lazy(() => import('./pages/ChartOfAccountsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));

export const sapFinanceModuleConfig: ModuleConfig = {
  name: 'sap-finance',
  routes: [
    {
      path: '/sap-finance/journal-entries',
      element: <JournalEntriesPage />,
      layout: 'main',
      permissions: SAP_FINANCE_LEDGERS_ACCESS,
      breadcrumb: { label: 'Journal Entries' },
    },
    {
      path: '/sap-finance/general-ledger',
      element: <GeneralLedgerPage />,
      layout: 'main',
      permissions: SAP_FINANCE_LEDGERS_ACCESS,
      breadcrumb: { label: 'General Ledger' },
    },
    {
      path: '/sap-finance/chart-of-accounts',
      element: <ChartOfAccountsPage />,
      layout: 'main',
      permissions: SAP_FINANCE_LEDGERS_ACCESS,
      breadcrumb: { label: 'Chart of Accounts' },
    },
    {
      path: '/sap-finance/budgets',
      element: <BudgetsPage />,
      layout: 'main',
      permissions: SAP_FINANCE_BUDGETS_ACCESS,
      breadcrumb: { label: 'Budgets' },
    },
  ],
};

/** The books' pages, shown under SAP Portal in the sidebar (see modules/sap-portal). */
export const SAP_FINANCE_NAV_ITEMS: ModuleNavItem[] = [
  {
    path: '/sap-finance/journal-entries',
    title: 'Journal Entries',
    icon: BookOpen,
    permissions: SAP_FINANCE_LEDGERS_ACCESS,
  },
  {
    path: '/sap-finance/general-ledger',
    title: 'General Ledger',
    icon: FileSpreadsheet,
    permissions: SAP_FINANCE_LEDGERS_ACCESS,
  },
  {
    path: '/sap-finance/chart-of-accounts',
    title: 'Chart of Accounts',
    icon: ListTree,
    permissions: SAP_FINANCE_LEDGERS_ACCESS,
  },
  {
    path: '/sap-finance/budgets',
    title: 'Budgets',
    icon: PiggyBank,
    permissions: SAP_FINANCE_BUDGETS_ACCESS,
  },
];
