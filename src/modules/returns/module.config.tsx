/**
 * Returns module — goods travelling against the normal direction.
 *
 * The app is otherwise organised by direction of movement (Gate is in, Dispatch
 * is out), and a return fits neither: it is triggered by a sales document, it
 * arrives through the gate as its own `VehicleEntry` entry type, and it lands as
 * an inventory posting. Rather than make it a sub-step of any one of those, this
 * module owns the direction itself.
 *
 * Submodules:
 *  - `customer/` — customer returns of finished goods, posting a standalone SAP
 *    A/R Return into a `-GR` warehouse. Built.
 *  - `dismantle/` — disposition of that returned stock: taking a finished good
 *    apart into its components as a SAP disassembly order. Built. It also
 *    dismantles plain warehouse stock, which is how returns keyed straight into
 *    SAP (and so unknown to `customer/`) are covered.
 *
 * Room it was created for: vendor returns (SAP object 21, for QC-rejected raw
 * material that currently has no way back to the supplier) and the credit-note
 * tail. Neither exists yet — add them as siblings of `customer/`, and extend
 * `modulePrefix` below so the group keeps showing for whoever can see any of
 * them.
 */
import { Undo2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import {
  DISMANTLE_ACCESS,
  DISMANTLE_MODULE_PREFIX,
  DISMANTLE_PERMISSIONS,
  GOODS_RETURN_ACCESS,
  GOODS_RETURN_MODULE_PREFIX,
  GOODS_RETURN_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { LegacyGoodsReturnRedirect } from './LegacyGoodsReturnRedirect';

const GoodsReturnListPage = lazy(() => import('./customer/pages/GoodsReturnListPage'));
const GoodsReturnStep1Page = lazy(() => import('./customer/pages/GoodsReturnStep1Page'));
const GoodsReturnDetailsEditPage = lazy(
  () => import('./customer/pages/GoodsReturnDetailsEditPage'),
);
const GoodsReturnItemsPage = lazy(() => import('./customer/pages/GoodsReturnItemsPage'));
const GoodsReturnVehiclePage = lazy(() => import('./customer/pages/GoodsReturnVehiclePage'));
const GoodsReturnReviewPage = lazy(() => import('./customer/pages/GoodsReturnReviewPage'));
const GoodsReturnDetailPage = lazy(() => import('./customer/pages/GoodsReturnDetailPage'));

const DismantleListPage = lazy(() => import('./dismantle/pages/DismantleListPage'));
const DismantleNewPage = lazy(() => import('./dismantle/pages/DismantleNewPage'));
const DismantleDetailPage = lazy(() => import('./dismantle/pages/DismantleDetailPage'));

export const returnsModuleConfig: ModuleConfig = {
  name: 'returns',
  routes: [
    // Nothing to show at the module root while `customer` is the only submodule.
    {
      path: '/returns',
      element: <Navigate to="/returns/customer" replace />,
      layout: 'main',
      permissions: GOODS_RETURN_ACCESS,
    },
    {
      path: '/returns/customer',
      element: <GoodsReturnListPage />,
      layout: 'main',
      permissions: GOODS_RETURN_ACCESS,
      breadcrumb: { label: 'Customer Returns' },
    },
    {
      path: '/returns/customer/new',
      element: <GoodsReturnStep1Page />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.CREATE],
      breadcrumb: { label: 'New Return' },
    },
    {
      path: '/returns/customer/edit/:entryId/details',
      element: <GoodsReturnDetailsEditPage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.EDIT],
      breadcrumb: { label: 'Return Details' },
    },
    {
      path: '/returns/customer/edit/:entryId/items',
      element: <GoodsReturnItemsPage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.EDIT],
      breadcrumb: { label: 'Returning Items' },
    },
    {
      // Off the wizard's path: the vehicle is captured on step 1 (saving it is
      // what puts the return in front of the gate), and this only corrects it.
      path: '/returns/customer/edit/:entryId/vehicle',
      element: <GoodsReturnVehiclePage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.EDIT],
      breadcrumb: { label: 'Change Vehicle' },
    },
    {
      path: '/returns/customer/edit/:entryId/review',
      element: <GoodsReturnReviewPage />,
      layout: 'main',
      permissions: [GOODS_RETURN_PERMISSIONS.SUBMIT],
      breadcrumb: { label: 'Review & Submit' },
    },
    {
      path: '/returns/customer/:entryId',
      element: <GoodsReturnDetailPage />,
      layout: 'main',
      permissions: GOODS_RETURN_ACCESS,
      breadcrumb: { label: 'Return' },
    },
    {
      path: '/returns/disassembly',
      element: <DismantleListPage />,
      layout: 'main',
      permissions: DISMANTLE_ACCESS,
      breadcrumb: { label: 'Disassembly' },
    },
    {
      path: '/returns/disassembly/new',
      element: <DismantleNewPage />,
      layout: 'main',
      permissions: [DISMANTLE_PERMISSIONS.CREATE],
      breadcrumb: { label: 'New Disassembly' },
    },
    {
      path: '/returns/disassembly/:entryId',
      element: <DismantleDetailPage />,
      layout: 'main',
      permissions: DISMANTLE_ACCESS,
      breadcrumb: { label: 'Disassembly' },
    },
    // Pre-move paths. Cheap to keep, and they cover bookmarks plus any link
    // outside this module that still points at the old location.
    {
      path: '/goods-return',
      element: <LegacyGoodsReturnRedirect />,
      layout: 'main',
      permissions: GOODS_RETURN_ACCESS,
    },
    {
      path: '/goods-return/*',
      element: <LegacyGoodsReturnRedirect />,
      layout: 'main',
      permissions: GOODS_RETURN_ACCESS,
    },
  ],
  navigation: [
    {
      path: '/returns',
      title: 'Returns',
      icon: Undo2,
      showInSidebar: true,
      hasSubmenu: true,
      // Add each new submodule's prefix here as it lands, so the group stays
      // visible to anyone who can see any one of them.
      modulePrefix: [GOODS_RETURN_MODULE_PREFIX, DISMANTLE_MODULE_PREFIX],
      children: [
        {
          // No `permissions` here on purpose: the sidebar's child filter reads
          // only `child.permissions` (a child `modulePrefix` is ignored), and
          // the gated parent above already keeps this unreachable.
          path: '/returns/customer',
          title: 'Customer Returns',
          showInSidebar: true,
        },
        {
          // This one DOES carry permissions: a returns clerk is not necessarily
          // someone who takes stock apart, and the parent's prefix list now lets
          // either group through.
          path: '/returns/disassembly',
          title: 'Disassembly',
          showInSidebar: true,
          permissions: DISMANTLE_ACCESS,
        },
      ],
    },
  ],
};
