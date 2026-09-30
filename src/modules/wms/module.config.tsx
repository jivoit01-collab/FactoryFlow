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
import { Boxes } from 'lucide-react';

import {
  STOCK_AUDIT_ACCESS,
  STOCK_AUDIT_MODULE_PREFIX,
  WMS_ACCESS,
  WMS_ADMIN_ACCESS,
  WMS_MODULE_PREFIX,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
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
const WmsRemovedPalletsPage = lazy(() => import('./pages/WmsRemovedPalletsPage'));
const WmsPickPage = lazy(() => import('./pages/WmsPickPage'));
const WmsCountPage = lazy(() => import('./pages/WmsCountPage'));
const WmsReportsPage = lazy(() => import('./pages/WmsReportsPage'));
const WmsLabelsPage = lazy(() => import('./pages/WmsLabelsPage'));
const WmsAdminPage = lazy(() => import('./pages/WmsAdminPage'));
const StockAuditListPage = lazy(() => import('./stock-audit/pages/StockAuditListPage'));
const StockAuditPage = lazy(() => import('./stock-audit/pages/StockAuditPage'));

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
      path: '/warehouse-ops/removed',
      element: <WmsRemovedPalletsPage />,
      layout: 'main',
      permissions: WMS_ACCESS,
      breadcrumb: { label: 'Removed Pallets' },
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
    {
      // A physical count of a SAP warehouse against SAP's figures. Its own
      // rights: auditors count stock without being WMS operators.
      path: '/warehouse-ops/stock-audit',
      element: <StockAuditListPage />,
      layout: 'main',
      permissions: STOCK_AUDIT_ACCESS,
      breadcrumb: { label: 'Stock Audit' },
    },
    {
      path: '/warehouse-ops/stock-audit/:auditId',
      element: <StockAuditPage />,
      layout: 'main',
      permissions: STOCK_AUDIT_ACCESS,
      breadcrumb: { label: 'Audit' },
    },
  ],
  navigation: [
    {
      path: '/warehouse-ops',
      title: 'Warehouse Ops',
      icon: Boxes,
      showInSidebar: true,
      // Hide the whole module from users with no `wms.*` or `stock_audit.*`
      // permission — an auditor sees the module with only Stock Audit in it.
      modulePrefix: [WMS_MODULE_PREFIX, STOCK_AUDIT_MODULE_PREFIX],
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
        {
          path: '/warehouse-ops/stock-audit',
          title: 'Stock Audit',
          permissions: STOCK_AUDIT_ACCESS,
        },
        { path: '/warehouse-ops/removed', title: 'Removed Pallets', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/reports', title: 'Reports', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/labels', title: 'Labels', permissions: WMS_ACCESS },
        { path: '/warehouse-ops/designer', title: 'Designer', permissions: WMS_ADMIN_ACCESS },
        { path: '/warehouse-ops/admin', title: 'Admin', permissions: WMS_ADMIN_ACCESS },
        { path: '/warehouse-ops/settings', title: 'Settings', permissions: WMS_ADMIN_ACCESS },
      ],
    },
  ],
};
