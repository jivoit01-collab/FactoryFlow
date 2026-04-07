import { Warehouse } from 'lucide-react';
import { lazy } from 'react';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const WarehouseDashboardPage = lazy(() => import('./pages/WarehouseDashboardPage'));
const BOMRequestListPage = lazy(() => import('./pages/BOMRequestListPage'));
const BOMRequestDetailPage = lazy(() => import('./pages/BOMRequestDetailPage'));
const FGReceiptListPage = lazy(() => import('./pages/FGReceiptListPage'));

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
  ],
};
