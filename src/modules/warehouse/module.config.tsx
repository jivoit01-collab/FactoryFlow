import { Warehouse, LayoutDashboard } from 'lucide-react';
import { lazy } from 'react';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const WarehouseDashboardPage = lazy(() => import('./pages/WarehouseDashboardPage'));
const BOMRequestListPage = lazy(() => import('./pages/BOMRequestListPage'));
const BOMRequestDetailPage = lazy(() => import('./pages/BOMRequestDetailPage'));
const FGReceiptListPage = lazy(() => import('./pages/FGReceiptListPage'));

// WMS Pages
const WMSDashboardPage = lazy(() => import('./pages/WMSDashboardPage'));
const StockTrackerPage = lazy(() => import('./pages/StockTrackerPage'));
const BillingTrackerPage = lazy(() => import('./pages/BillingTrackerPage'));
const WarehouseComparisonPage = lazy(() => import('./pages/WarehouseComparisonPage'));

export const warehouseModuleConfig: ModuleConfig = {
  name: 'warehouse',
  routes: [
    {
      path: '/warehouse',
      element: <WarehouseDashboardPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/warehouse/bom-requests',
      element: <BOMRequestListPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/warehouse/bom-requests/:requestId',
      element: <BOMRequestDetailPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/warehouse/fg-receipts',
      element: <FGReceiptListPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_FG_RECEIPT],
    },
    // WMS Routes
    {
      path: '/wms',
      element: <WMSDashboardPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/wms/stock',
      element: <StockTrackerPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/wms/billing',
      element: <BillingTrackerPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/wms/warehouses',
      element: <WarehouseComparisonPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
  ],
  navigation: [
    {
      path: '/warehouse',
      title: 'Warehouse',
      icon: Warehouse,
      showInSidebar: true,
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
      hasSubmenu: true,
      children: [
        {
          path: '/warehouse/bom-requests',
          title: 'BOM Requests',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
        },
        {
          path: '/warehouse/fg-receipts',
          title: 'FG Receipts',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_FG_RECEIPT],
        },
      ],
    },
    {
      path: '/wms',
      title: 'WMS',
      icon: LayoutDashboard,
      showInSidebar: true,
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
      hasSubmenu: true,
      children: [
        {
          path: '/wms',
          title: 'Dashboard',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
        },
        {
          path: '/wms/stock',
          title: 'Stock Tracker',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
        },
        {
          path: '/wms/billing',
          title: 'Billing Tracker',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
        },
        {
          path: '/wms/warehouses',
          title: 'Warehouses',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
        },
      ],
    },
  ],
};
