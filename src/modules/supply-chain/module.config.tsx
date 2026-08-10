/**
 * Smart Supply Chain module.
 *
 * A module rather than a dashboard, because it is a routine with state rather
 * than a view: every morning a run is built, an analyst reviews it, it is
 * published to the buyer, the buyer acts on it and records what actually
 * happened, and on Monday the HOD reads the week and adjusts.
 *
 *   Daily run   the morning routine — what to order today, and the verdict log
 *   Weekly      were the alarms worth raising?
 *   Planning    the monthly view — lead-time alarms and line capacity
 *
 * Sidebar hides the module from users with no `supply_chain.*` permission
 * (`modulePrefix`). Reading and recording a verdict need VIEW; uploading
 * reference data, tuning parameters and publishing need MANAGE_REFERENCE.
 */
import { PackageSearch } from 'lucide-react';

import {
  SUPPLY_CHAIN_ACCESS,
  SUPPLY_CHAIN_MODULE_PREFIX,
  SUPPLY_CHAIN_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const SupplyChainDailyRunPage = lazy(() => import('./pages/SupplyChainDailyRunPage'));
const SupplyChainWeeklyPage = lazy(() => import('./pages/SupplyChainWeeklyPage'));
const SupplyChainDashboardPage = lazy(() => import('./pages/SupplyChainDashboardPage'));

export const supplyChainModuleConfig: ModuleConfig = {
  name: 'supply-chain',
  routes: [
    {
      // The landing page is the DAILY RUN, not the planning view: the daily loop
      // is what someone opens every morning, and the monthly picture is the
      // occasional read.
      path: '/supply-chain',
      element: <SupplyChainDailyRunPage />,
      layout: 'main',
      permissions: [SUPPLY_CHAIN_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Supply Chain' },
    },
    {
      path: '/supply-chain/daily',
      element: <SupplyChainDailyRunPage />,
      layout: 'main',
      permissions: [SUPPLY_CHAIN_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Daily Run' },
    },
    {
      path: '/supply-chain/weekly',
      element: <SupplyChainWeeklyPage />,
      layout: 'main',
      permissions: [SUPPLY_CHAIN_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Weekly Review' },
    },
    {
      path: '/supply-chain/planning',
      element: <SupplyChainDashboardPage />,
      layout: 'main',
      permissions: [SUPPLY_CHAIN_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Planning' },
    },
  ],
  navigation: [
    {
      path: '/supply-chain',
      title: 'Supply Chain',
      icon: PackageSearch,
      showInSidebar: true,
      modulePrefix: SUPPLY_CHAIN_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        {
          path: '/supply-chain/daily',
          title: 'Daily Run',
          permissions: SUPPLY_CHAIN_ACCESS,
        },
        {
          path: '/supply-chain/weekly',
          title: 'Weekly Review',
          permissions: SUPPLY_CHAIN_ACCESS,
        },
        {
          path: '/supply-chain/planning',
          title: 'Planning',
          permissions: SUPPLY_CHAIN_ACCESS,
        },
      ],
    },
  ],
};
