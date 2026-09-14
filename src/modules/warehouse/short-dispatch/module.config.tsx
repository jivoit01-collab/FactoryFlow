import { SHORT_DISPATCH_ACCESS, SHORT_DISPATCH_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleNavItem, ModuleRoute } from '@/core/types';

const ShortDispatchListPage = lazy(() => import('./pages/ShortDispatchListPage'));
const ShortDispatchNewPage = lazy(() => import('./pages/ShortDispatchNewPage'));
const ShortDispatchDetailPage = lazy(() => import('./pages/ShortDispatchDetailPage'));

/**
 * Short Dispatch routes — contributed to the Warehouse module
 * (`warehouseModuleConfig`). Backed by the backend `short_dispatch` app.
 *
 * Warehouse rather than Returns on purpose. Returns is about goods travelling
 * back to the plant — a truck, a gate arrival, a customer. A short dispatch is
 * the warehouse correcting its own paperwork about stock that never moved, so it
 * belongs beside the bill summary that claimed it went.
 */
export const shortDispatchRoutes: ModuleRoute[] = [
  {
    path: '/warehouse/short-dispatch',
    element: <ShortDispatchListPage />,
    layout: 'main',
    permissions: SHORT_DISPATCH_ACCESS,
    breadcrumb: { label: 'Short Dispatch' },
  },
  {
    // Static path registered before `:entryId` so it is not captured as an id.
    path: '/warehouse/short-dispatch/new',
    element: <ShortDispatchNewPage />,
    layout: 'main',
    permissions: [SHORT_DISPATCH_PERMISSIONS.CREATE],
    breadcrumb: { label: 'New' },
  },
  {
    path: '/warehouse/short-dispatch/:entryId',
    element: <ShortDispatchDetailPage />,
    layout: 'main',
    permissions: SHORT_DISPATCH_ACCESS,
    breadcrumb: { label: 'Short Dispatch' },
  },
];

export const shortDispatchNavChildren: ModuleNavItem[] = [
  {
    path: '/warehouse/short-dispatch',
    title: 'Short Dispatch',
    permissions: SHORT_DISPATCH_ACCESS,
  },
];
