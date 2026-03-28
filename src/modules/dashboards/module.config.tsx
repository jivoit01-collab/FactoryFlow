import { BarChart3 } from 'lucide-react';
import { lazy } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const DashboardsLandingPage = lazy(() => import('./pages/DashboardsLandingPage'));
const SAPPlanDashboardPage = lazy(() => import('./sap-plan/pages/SAPPlanDashboardPage'));
const StockLevelDashboardPage = lazy(
  () => import('./stock-level/pages/StockLevelDashboardPage'),
);
const InventoryAgeDashboardPage = lazy(
  () => import('./inventory-age/pages/InventoryAgeDashboardPage'),
);
const NonMovingDashboardPage = lazy(
  () => import('./non-moving/pages/NonMovingDashboardPage'),
);

export const dashboardsModuleConfig: ModuleConfig = {
  name: 'dashboards',
  routes: [
    {
      path: '/dashboards',
      element: <DashboardsLandingPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_INVENTORY_AGE,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
      ],
    },
    {
      path: '/dashboards/sap-plan',
      element: <SAPPlanDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD],
      breadcrumb: { label: 'SAP Plan' },
    },
    {
      path: '/dashboards/stock-levels',
      element: <StockLevelDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
      breadcrumb: { label: 'Stock Levels' },
    },
    {
      path: '/dashboards/inventory-age',
      element: <InventoryAgeDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_INVENTORY_AGE],
      breadcrumb: { label: 'Inventory Age' },
    },
    {
      path: '/dashboards/non-moving',
      element: <NonMovingDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
      breadcrumb: { label: 'Non-Moving RM' },
    },
  ],
  navigation: [
    {
      path: '/dashboards',
      title: 'Dashboards',
      icon: BarChart3,
      showInSidebar: true,
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_INVENTORY_AGE,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
      ],
      hasSubmenu: true,
      children: [
        {
          path: '/dashboards/sap-plan',
          title: 'SAP Material Plan',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD],
        },
        {
          path: '/dashboards/stock-levels',
          title: 'Stock Levels',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
        },
        {
          path: '/dashboards/inventory-age',
          title: 'Inventory Age',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_INVENTORY_AGE],
        },
        {
          path: '/dashboards/non-moving',
          title: 'Non-Moving RM',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
        },
      ],
    },
  ],
};
