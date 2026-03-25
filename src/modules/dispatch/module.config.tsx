import { Truck } from 'lucide-react';
import { lazy } from 'react';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// Lazy load Dispatch pages
const DispatchDashboardPage = lazy(() => import('./pages/DispatchDashboardPage'));
const ShipmentListPage = lazy(() => import('./pages/ShipmentListPage'));
const ShipmentDetailPage = lazy(() => import('./pages/ShipmentDetailPage'));

export const dispatchModuleConfig: ModuleConfig = {
  name: 'dispatch',
  routes: [
    {
      path: '/dispatch',
      element: <DispatchDashboardPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.DASHBOARD],
      breadcrumb: { label: 'Dispatch' },
    },
    {
      path: '/dispatch/shipments',
      element: <ShipmentListPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW],
    },
    {
      path: '/dispatch/shipments/:id',
      element: <ShipmentDetailPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.VIEW],
    },
  ],
  navigation: [
    {
      path: '/dispatch',
      title: 'Outbound Dispatch',
      icon: Truck,
      showInSidebar: true,
      permissions: [DISPATCH_PERMISSIONS.VIEW],
      hasSubmenu: true,
      children: [
        {
          path: '/dispatch',
          title: 'Dashboard',
          permissions: [DISPATCH_PERMISSIONS.DASHBOARD],
        },
        {
          path: '/dispatch/shipments',
          title: 'Shipments',
          permissions: [DISPATCH_PERMISSIONS.VIEW],
        },
      ],
    },
  ],
};
