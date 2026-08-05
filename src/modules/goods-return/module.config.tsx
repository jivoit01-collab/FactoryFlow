/**
 * Goods Return module — customer returns of finished goods.
 *
 * One list page + a server-backed wizard (Pattern B: Step 1 creates a DRAFT and
 * every later step is addressed by `:entryId` in the URL). The returns clerk
 * records basis + documents + items + vehicle + an expected gate arrival, then
 * submits; the vehicle then surfaces in the gate's "Goods Return In" queue.
 *
 * Sidebar hides the module from users with no `goods_return.*` permission
 * (`modulePrefix`).
 */
import { Undo2 } from 'lucide-react';

import {
  GOODS_RETURN_ACCESS,
  GOODS_RETURN_MODULE_PREFIX,
  GOODS_RETURN_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const GoodsReturnListPage = lazy(() => import('./pages/GoodsReturnListPage'));
const GoodsReturnStep1Page = lazy(() => import('./pages/GoodsReturnStep1Page'));
const GoodsReturnDetailsEditPage = lazy(() => import('./pages/GoodsReturnDetailsEditPage'));
const GoodsReturnItemsPage = lazy(() => import('./pages/GoodsReturnItemsPage'));
const GoodsReturnVehiclePage = lazy(() => import('./pages/GoodsReturnVehiclePage'));
const GoodsReturnReviewPage = lazy(() => import('./pages/GoodsReturnReviewPage'));
const GoodsReturnDetailPage = lazy(() => import('./pages/GoodsReturnDetailPage'));

export const goodsReturnModuleConfig: ModuleConfig = {
  name: 'goods-return',
  routes: [
    {
      path: '/goods-return',
      element: <GoodsReturnListPage />,
      layout: 'main',
      permissions: GOODS_RETURN_ACCESS,
      breadcrumb: { label: 'Goods Return' },
    },
    {
      path: '/goods-return/new',
      element: <GoodsReturnStep1Page />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.CREATE],
      breadcrumb: { label: 'New Goods Return' },
    },
    {
      path: '/goods-return/edit/:entryId/details',
      element: <GoodsReturnDetailsEditPage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.EDIT],
      breadcrumb: { label: 'Return Details' },
    },
    {
      path: '/goods-return/edit/:entryId/items',
      element: <GoodsReturnItemsPage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.EDIT],
      breadcrumb: { label: 'Returning Items' },
    },
    {
      path: '/goods-return/edit/:entryId/vehicle',
      element: <GoodsReturnVehiclePage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.EDIT],
      breadcrumb: { label: 'Vehicle & Arrival' },
    },
    {
      path: '/goods-return/edit/:entryId/review',
      element: <GoodsReturnReviewPage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.SUBMIT],
      breadcrumb: { label: 'Review & Submit' },
    },
    {
      path: '/goods-return/:entryId',
      element: <GoodsReturnDetailPage />,
      layout: 'main',
      permissions: GOODS_RETURN_ACCESS,
      breadcrumb: { label: 'Return' },
    },
  ],
  navigation: [
    {
      path: '/goods-return',
      title: 'Goods Return',
      icon: Undo2,
      showInSidebar: true,
      modulePrefix: GOODS_RETURN_MODULE_PREFIX,
    },
  ],
};
