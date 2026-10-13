/**
 * Fixed Asset GRPO -- a vendor's fixed-asset delivery, from the gate to SAP.
 *
 * A module of its own (FA_GRPO_SEPARATE_MODE.md §3) rather than a page inside
 * Warehouse's GRPO submodule, so the feature ships without editing the
 * warehouse, gate or grpo screens. Its backend is the new `fixed_asset_grpo`
 * app (`api/v1/fixed-asset-grpo/`).
 *
 * The routes sit under `/warehouse/grpo/fixed-asset`, the prefix the backend
 * builds its queue and notification links from (`FRONTEND_BASE`). No warehouse
 * or grpo route captures them: grpo's parameter routes all carry a fixed
 * segment first (`/warehouse/grpo/preview/:id`, `/warehouse/grpo/history/:id`),
 * and the router ranks static segments above parameters anyway. Static routes
 * are still listed before parameter routes, as everywhere else.
 *
 * Any of the three rights opens every page (`FA_GRPO_ACCESS`), because the
 * backend's view right is implied by the link and post rights. What each page
 * offers is narrowed inside it: Link PO for the link or post right, Post /
 * close / reopen / discard for the post right.
 *
 * The menu item sits inside the Accounts group: `accounts/module.config.tsx`
 * imports `FA_GRPO_NAV_ITEMS` (as SAP Portal gathers its modules' items), and
 * Accounts' `modulePrefix` includes `fixed_asset_grpo`, so a holder of any
 * `fixed_asset_grpo.*` right sees the group with this item in it. The pages
 * keep their `/warehouse/grpo/fixed-asset` address, which the backend's links
 * use (`FRONTEND_BASE`).
 */
import { Landmark } from 'lucide-react';

import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleNavItem } from '@/core/types';

import { FA_GRPO_ACCESS } from './constants/permissions';
import { FA_GRPO_ROUTES } from './constants/routes';

const FAGRPOPage = lazy(() => import('./pages/FAGRPOPage'));
const FAGRPOPreviewPage = lazy(() => import('./pages/FAGRPOPreviewPage'));
const FAGRPOHistoryDetailPage = lazy(() => import('./pages/FAGRPOHistoryDetailPage'));

/** The menu item Accounts hangs in its group. */
export const FA_GRPO_NAV_ITEMS: ModuleNavItem[] = [
  {
    path: FA_GRPO_ROUTES.LIST,
    title: 'Fixed Asset GRPO',
    icon: Landmark,
    permissions: FA_GRPO_ACCESS,
  },
];

export const fixedAssetGrpoModuleConfig: ModuleConfig = {
  name: 'fixed-asset-grpo',
  routes: [
    // Static list route first, then the parameter routes.
    {
      path: FA_GRPO_ROUTES.LIST, // '/warehouse/grpo/fixed-asset'
      element: <FAGRPOPage />,
      layout: 'main',
      permissions: FA_GRPO_ACCESS,
      breadcrumb: { label: 'Fixed Asset GRPO' },
    },
    {
      path: FA_GRPO_ROUTES.PREVIEW, // '/warehouse/grpo/fixed-asset/preview/:vehicleEntryId'
      element: <FAGRPOPreviewPage />,
      layout: 'main',
      permissions: FA_GRPO_ACCESS,
    },
    {
      path: FA_GRPO_ROUTES.HISTORY_DETAIL, // '/warehouse/grpo/fixed-asset/history/:postingId'
      element: <FAGRPOHistoryDetailPage />,
      layout: 'main',
      permissions: FA_GRPO_ACCESS,
    },
  ],
  // No entry of its own: FA_GRPO_NAV_ITEMS hang under Accounts.
  navigation: [],
};
