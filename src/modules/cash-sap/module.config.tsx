/**
 * Cash → SAP module -- the cash book's approved bunches, posted to SAP.
 *
 * Three pages. **Bunches** lists the cash book's bunches with where each has
 * got to in SAP. A bunch's **SAP page** (`/accounts/bunches/:bunchId/sap`, the
 * address the posting log links to from `cash_sap/titles.py`) shows what
 * would post -- one imprest PO per SAP company, a GRPO per voucher (or voucher
 * group), A/P drafts when they are on -- and posts it, one SAP document per
 * request. **Settings** is the branch routing and the G/L -> SAP item map.
 *
 * A module of its own rather than pages inside Accounts (separate mode,
 * FA_GRPO_SEPARATE_MODE.md §3): the accounts module, its config and the shared
 * permission and endpoint constants are not edited on this branch. Its paths
 * still sit under `/accounts/` so the breadcrumbs read as part of Accounts.
 *
 * The menu items sit inside the Accounts group: `accounts/module.config.tsx`
 * imports `CASH_SAP_NAV_ITEMS` (as SAP Portal gathers its modules' items), so
 * this module has no sidebar entry of its own. Each item shows to a holder of
 * a `cash_sap.*` right, and Accounts' `modulePrefix` includes `cash_sap` so
 * the group opens for them. The routes are wider: every page reads for anyone
 * on the cash book, as the backend's read rule does, so a link from the
 * posting log opens for a cash book viewer too; the buttons that write check
 * the write right themselves.
 */
import { Package, Settings2 } from 'lucide-react';

import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleNavItem } from '@/core/types';

import { CASH_SAP_PERMISSIONS, CASH_SAP_READ_ACCESS } from './constants/permissions';

const CashSapBunchesPage = lazy(() => import('./pages/CashSapBunchesPage'));
const BunchSapPage = lazy(() => import('./pages/BunchSapPage'));
const CashSapSettingsPage = lazy(() => import('./pages/CashSapSettingsPage'));

/** Both cash_sap rights: the poster and the settings holder see both entries. */
const CASH_SAP_ANY: readonly string[] = [CASH_SAP_PERMISSIONS.POST, CASH_SAP_PERMISSIONS.SETTINGS];

export const CASH_SAP_NAV_ITEMS: ModuleNavItem[] = [
  {
    path: '/accounts/cash-sap',
    title: 'Bunches → SAP',
    icon: Package,
    permissions: CASH_SAP_ANY,
  },
  {
    // Readable by the poster too: a ROUTING_INCOMPLETE problem on a bunch
    // says "fill it in Cash → SAP settings", and the page is read-only
    // without the settings right.
    path: '/accounts/cash-sap-settings',
    title: 'Cash → SAP settings',
    icon: Settings2,
    permissions: CASH_SAP_ANY,
  },
];

export const cashSapModuleConfig: ModuleConfig = {
  name: 'cash-sap',
  routes: [
    {
      path: '/accounts/cash-sap',
      element: <CashSapBunchesPage />,
      layout: 'main',
      permissions: CASH_SAP_READ_ACCESS,
      breadcrumb: { label: 'Cash → SAP' },
    },
    {
      path: '/accounts/cash-sap-settings',
      element: <CashSapSettingsPage />,
      layout: 'main',
      // Read-only without the settings right; the page says so itself.
      permissions: CASH_SAP_READ_ACCESS,
      breadcrumb: { label: 'Cash → SAP settings' },
    },
    {
      path: '/accounts/bunches/:bunchId/sap',
      element: <BunchSapPage />,
      layout: 'main',
      permissions: CASH_SAP_READ_ACCESS,
      breadcrumb: { label: 'SAP' },
    },
  ],
  // No entry of its own: CASH_SAP_NAV_ITEMS hang under Accounts.
  navigation: [],
};
