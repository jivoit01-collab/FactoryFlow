/**
 * Warehouse Ops (self-contained WMS) module configuration.
 *
 * Uses the `/warehouse-ops` prefix to avoid colliding with the existing
 * warehouse module's `/wms` analytics routes.
 *
 * Permission gating (maps to the `WMS Admin` / `WMS Operator` Django groups):
 *   - Sidebar visibility keys off `modulePrefix: 'wms'`, so the module is hidden
 *     from any user holding no `wms.*` permission.
 *   - Operator-facing pages are gated on `WMS_ACCESS` (both groups pass);
 *     structural/config pages (warehouses, designer, admin, settings) are gated
 *     on `WMS_ADMIN_ACCESS` (only `WMS Admin` passes).
 *
 * The master enable/disable flag lives in settings and gates feature UI via
 * `useWmsEnabled` / `WmsEnabledGate`.
 */
import { Warehouse } from 'lucide-react';
import { lazy } from 'react';

import { WMS_ACCESS, WMS_ADMIN_ACCESS, WMS_MODULE_PREFIX } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const WmsOverviewPage = lazy(() => import('./pages/WmsOverviewPage'));
const WmsSettingsPage = lazy(() => import('./pages/WmsSettingsPage'));
const WmsDesignerPage = lazy(() => import('./pages/WmsDesignerPage'));
const WmsWarehousesPage = lazy(() => import('./pages/WmsWarehousesPage'));
const WmsWarehouseEditorPage = lazy(() => import('./pages/WmsWarehouseEditorPage'));
const WmsMapPage = lazy(() => import('./pages/WmsMapPage'));
const WmsLocationHistoryPage = lazy(() => import('./pages/WmsLocationHistoryPage'));
const WmsTransferPage = lazy(() => import('./pages/WmsTransferPage'));
const WmsReceivePage = lazy(() => import('./pages/WmsReceivePage'));
const WmsOutboundPage = lazy(() => import('./pages/WmsOutboundPage'));
const WmsPickPage = lazy(() => import('./pages/WmsPickPage'));
const WmsCountPage = lazy(() => import('./pages/WmsCountPage'));
const WmsReportsPage = lazy(() => import('./pages/WmsReportsPage'));
const WmsLabelsPage = lazy(() => import('./pages/WmsLabelsPage'));
const WmsAdminPage = lazy(() => import('./pages/WmsAdminPage'));

export const wmsModuleConfig: ModuleConfig = {
  name: 'warehouse-ops',
  routes: [
    {
      path: '/warehouse-ops',
      element: <WmsOverviewPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Warehouse Ops' },
    },
    {
      path: '/warehouse-ops/warehouses',
      element: <WmsWarehousesPage />,
      layout: 'main',
      permissions: WMS_ADMIN_ACCESS,
      breadcrumb: { label: 'Warehouses' },
    },
    {
      path: '/warehouse-ops/warehouses/:warehouseId',
      element: <WmsWarehouseEditorPage />,
      layout: 'main',
      permissions: WMS_ADMIN_ACCESS,
    },
    {
      path: '/warehouse-ops/map',
      element: <WmsMapPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Map' },
    },
    {
      path: '/warehouse-ops/locations/:locationId/history',
      element: <WmsLocationHistoryPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Movement history' },
    },
    {
      path: '/warehouse-ops/receive',
      element: <WmsReceivePage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Receive' },
    },
    {
      path: '/warehouse-ops/transfer',
      element: <WmsTransferPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Transfer' },
    },
    {
      path: '/warehouse-ops/pick',
      element: <WmsPickPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Pick' },
    },
    {
      path: '/warehouse-ops/outbound',
      element: <WmsOutboundPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Outbound' },
    },
    {
      path: '/warehouse-ops/count',
      element: <WmsCountPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Count' },
    },
    {
      path: '/warehouse-ops/reports',
      element: <WmsReportsPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Reports' },
    },
    {
      path: '/warehouse-ops/labels',
      element: <WmsLabelsPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Labels' },
    },
    {
      path: '/warehouse-ops/designer',
      element: <WmsDesignerPage />,
      layout: 'main',
      permissions: WMS_ADMIN_ACCESS,
      breadcrumb: { label: 'Designer' },
    },
    {
      path: '/warehouse-ops/admin',
      element: <WmsAdminPage />,
      layout: 'main',
      permissions: WMS_ADMIN_ACCESS,
      breadcrumb: { label: 'Admin' },
    },
    {
      path: '/warehouse-ops/settings',
      element: <WmsSettingsPage />,
      layout: 'main',
      permissions: WMS_ADMIN_ACCESS,
    },
  ],
  navigation: [
    {
      path: '/warehouse-ops',
      title: 'Warehouse Ops',
      icon: Warehouse,
      showInSidebar: true,
      // Hide the whole module from users with no `wms.*` permission.
      modulePrefix: WMS_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        { path: '/warehouse-ops', title: 'Overview', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/warehouses', title: 'Warehouses', permissions: WMS_ADMIN_ACCESS },
        { path: '/warehouse-ops/map', title: 'Map', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/receive', title: 'Receive', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/transfer', title: 'Transfer', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/pick', title: 'Pick', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/outbound', title: 'Outbound', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/count', title: 'Cycle Count', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/reports', title: 'Reports', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/labels', title: 'Labels', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/designer', title: 'Designer', permissions: WMS_ADMIN_ACCESS },
        { path: '/warehouse-ops/admin', title: 'Admin', permissions: WMS_ADMIN_ACCESS },
        { path: '/warehouse-ops/settings', title: 'Settings', permissions: WMS_ADMIN_ACCESS },
      ],
    },
  ],
};
