import { Warehouse } from 'lucide-react';
import { lazy } from 'react';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const WarehouseDashboardPage = lazy(() => import('./pages/WarehouseDashboardPage'));
const InventoryBrowserPage = lazy(() => import('./pages/InventoryBrowserPage'));
const InventoryDetailPage = lazy(() => import('./pages/InventoryDetailPage'));

export const warehouseModuleConfig: ModuleConfig = {
  name: 'warehouse',
  routes: [
    {
      path: '/warehouse',
      element: <WarehouseDashboardPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_DASHBOARD],
      breadcrumb: { label: 'Warehouse' },
    },
    {
      path: '/warehouse/inventory',
      element: <InventoryBrowserPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_INVENTORY],
      breadcrumb: { label: 'Inventory' },
    },
    {
      path: '/warehouse/inventory/:itemCode',
      element: <InventoryDetailPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_INVENTORY],
    },
  ],
  navigation: [
    {
      path: '/warehouse',
      title: 'Warehouse',
      icon: Warehouse,
      showInSidebar: true,
      modulePrefix: 'warehouse',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_DASHBOARD],
      hasSubmenu: true,
      children: [
        {
          path: '/warehouse',
          title: 'Dashboard',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_DASHBOARD],
        },
        {
          path: '/warehouse/inventory',
          title: 'Inventory',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_INVENTORY],
        },
      ],
    },
  ],
};
