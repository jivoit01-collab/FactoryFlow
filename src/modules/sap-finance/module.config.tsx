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
 *
 * The outstanding reports came from EXIM: party balances, open A/P and A/R,
 * open GRPOs and customer aging. Each opens to the right to them all or to the
 * EXIM rights that showed that report there.
 */
import {
  BookOpen,
  FileSpreadsheet,
  HandCoins,
  ListTree,
  PackageOpen,
  PiggyBank,
  ReceiptText,
  Scale,
  Timer,
} from 'lucide-react';

import { SAP_FINANCE_BUDGETS_ACCESS, SAP_FINANCE_LEDGERS_ACCESS } from '@/config/permissions';
import {
  SAP_FINANCE_CUSTOMER_AGING_ACCESS,
  SAP_FINANCE_OPEN_AP_ACCESS,
  SAP_FINANCE_OPEN_AR_ACCESS,
  SAP_FINANCE_OPEN_GRPOS_ACCESS,
  SAP_FINANCE_PARTY_OUTSTANDING_ACCESS,
} from '@/config/permissions/sap-finance.permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleNavItem } from '@/core/types';

const JournalEntriesPage = lazy(() => import('./pages/JournalEntriesPage'));
const GeneralLedgerPage = lazy(() => import('./pages/GeneralLedgerPage'));
const ChartOfAccountsPage = lazy(() => import('./pages/ChartOfAccountsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const PartyOutstandingPage = lazy(() => import('./pages/outstanding/PartyOutstandingPage'));
const OpenBillsPage = lazy(() => import('./pages/outstanding/OpenBillsPage'));
const OpenGrposPage = lazy(() => import('./pages/outstanding/OpenGrposPage'));
const CustomerAgingPage = lazy(() => import('./pages/outstanding/CustomerAgingPage'));

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
    {
      path: '/sap-finance/outstanding',
      element: <PartyOutstandingPage />,
      layout: 'main',
      permissions: SAP_FINANCE_PARTY_OUTSTANDING_ACCESS,
      breadcrumb: { label: 'Party Outstanding' },
    },
    {
      path: '/sap-finance/open-ap',
      // Keyed by side: the two routes share a page, and its sort and page
      // must not carry from one to the other.
      element: <OpenBillsPage key="vendor" side="vendor" />,
      layout: 'main',
      permissions: SAP_FINANCE_OPEN_AP_ACCESS,
      breadcrumb: { label: 'Open A/P' },
    },
    {
      path: '/sap-finance/open-ar',
      element: <OpenBillsPage key="customer" side="customer" />,
      layout: 'main',
      permissions: SAP_FINANCE_OPEN_AR_ACCESS,
      breadcrumb: { label: 'Open A/R' },
    },
    {
      path: '/sap-finance/open-grpos',
      element: <OpenGrposPage />,
      layout: 'main',
      permissions: SAP_FINANCE_OPEN_GRPOS_ACCESS,
      breadcrumb: { label: 'Open GRPOs' },
    },
    {
      path: '/sap-finance/customer-aging',
      element: <CustomerAgingPage />,
      layout: 'main',
      permissions: SAP_FINANCE_CUSTOMER_AGING_ACCESS,
      breadcrumb: { label: 'Customer Aging' },
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
  {
    path: '/sap-finance/outstanding',
    title: 'Party Outstanding',
    icon: Scale,
    permissions: SAP_FINANCE_PARTY_OUTSTANDING_ACCESS,
  },
  {
    path: '/sap-finance/open-ap',
    title: 'Open A/P',
    icon: HandCoins,
    permissions: SAP_FINANCE_OPEN_AP_ACCESS,
  },
  {
    path: '/sap-finance/open-ar',
    title: 'Open A/R',
    icon: ReceiptText,
    permissions: SAP_FINANCE_OPEN_AR_ACCESS,
  },
  {
    path: '/sap-finance/open-grpos',
    title: 'Open GRPOs',
    icon: PackageOpen,
    permissions: SAP_FINANCE_OPEN_GRPOS_ACCESS,
  },
  {
    path: '/sap-finance/customer-aging',
    title: 'Customer Aging',
    icon: Timer,
    permissions: SAP_FINANCE_CUSTOMER_AGING_ACCESS,
  },
];
