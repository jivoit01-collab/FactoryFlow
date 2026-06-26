/**
 * Warehouse Ops (self-contained WMS) module configuration.
 *
 * Uses the `/warehouse-ops` prefix to avoid colliding with the existing
 * warehouse module's `/wms` analytics routes. Step 2 ships two screens —
 * Overview and Settings. No permission gating yet; role-based access to the
 * designer/settings is added in Step 10. The master enable/disable flag lives
 * in settings and gates feature UI via `useWmsEnabled` / `WmsEnabledGate`.
 */
import { Warehouse } from 'lucide-react';
import { lazy } from 'react';

import type { ModuleConfig } from '@/core/types';

const WmsOverviewPage = lazy(() => import('./pages/WmsOverviewPage'));
const WmsSettingsPage = lazy(() => import('./pages/WmsSettingsPage'));
const WmsDesignerPage = lazy(() => import('./pages/WmsDesignerPage'));
const WmsWarehousesPage = lazy(() => import('./pages/WmsWarehousesPage'));
const WmsWarehouseEditorPage = lazy(() => import('./pages/WmsWarehouseEditorPage'));
const WmsMapPage = lazy(() => import('./pages/WmsMapPage'));
const WmsTransferPage = lazy(() => import('./pages/WmsTransferPage'));
const WmsReceivePage = lazy(() => import('./pages/WmsReceivePage'));
const WmsOutboundPage = lazy(() => import('./pages/WmsOutboundPage'));
const WmsPickPage = lazy(() => import('./pages/WmsPickPage'));

export const wmsModuleConfig: ModuleConfig = {
  name: 'warehouse-ops',
  routes: [
    {
      path: '/warehouse-ops',
      element: <WmsOverviewPage />,
      layout: 'main',
      breadcrumb: { label: 'Warehouse Ops' },
    },
    {
      path: '/warehouse-ops/warehouses',
      element: <WmsWarehousesPage />,
      layout: 'main',
      breadcrumb: { label: 'Warehouses' },
    },
    {
      path: '/warehouse-ops/warehouses/:warehouseId',
      element: <WmsWarehouseEditorPage />,
      layout: 'main',
    },
    {
      path: '/warehouse-ops/map',
      element: <WmsMapPage />,
      layout: 'main',
      breadcrumb: { label: 'Map' },
    },
    {
      path: '/warehouse-ops/receive',
      element: <WmsReceivePage />,
      layout: 'main',
      breadcrumb: { label: 'Receive' },
    },
    {
      path: '/warehouse-ops/transfer',
      element: <WmsTransferPage />,
      layout: 'main',
      breadcrumb: { label: 'Transfer' },
    },
    {
      path: '/warehouse-ops/pick',
      element: <WmsPickPage />,
      layout: 'main',
      breadcrumb: { label: 'Pick' },
    },
    {
      path: '/warehouse-ops/outbound',
      element: <WmsOutboundPage />,
      layout: 'main',
      breadcrumb: { label: 'Outbound' },
    },
    {
      path: '/warehouse-ops/designer',
      element: <WmsDesignerPage />,
      layout: 'main',
      breadcrumb: { label: 'Designer' },
    },
    {
      path: '/warehouse-ops/settings',
      element: <WmsSettingsPage />,
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/warehouse-ops',
      title: 'Warehouse Ops',
      icon: Warehouse,
      showInSidebar: true,
      hasSubmenu: true,
      children: [
        { path: '/warehouse-ops', title: 'Overview' },
        { path: '/warehouse-ops/warehouses', title: 'Warehouses' },
        { path: '/warehouse-ops/map', title: 'Map' },
        { path: '/warehouse-ops/receive', title: 'Receive' },
        { path: '/warehouse-ops/transfer', title: 'Transfer' },
        { path: '/warehouse-ops/pick', title: 'Pick' },
        { path: '/warehouse-ops/outbound', title: 'Outbound' },
        { path: '/warehouse-ops/designer', title: 'Designer' },
        { path: '/warehouse-ops/settings', title: 'Settings' },
      ],
    },
  ],
};
