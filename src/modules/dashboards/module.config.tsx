import { BarChart3 } from 'lucide-react';
import { lazy } from 'react';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const DashboardsLandingPage = lazy(() => import('./pages/DashboardsLandingPage'));
const SAPPlanDashboardPage = lazy(() => import('./sap-plan/pages/SAPPlanDashboardPage'));

export const dashboardsModuleConfig: ModuleConfig = {
  name: 'dashboards',
  routes: [
    {
      path: '/dashboards',
      element: <DashboardsLandingPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD],
    },
    {
      path: '/dashboards/sap-plan',
      element: <SAPPlanDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD],
      breadcrumb: { label: 'SAP Plan' },
    },
  ],
  navigation: [
    {
      path: '/dashboards',
      title: 'Dashboards',
      icon: BarChart3,
      showInSidebar: true,
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD],
      hasSubmenu: true,
      children: [
        {
          path: '/dashboards/sap-plan',
          title: 'SAP Material Plan',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD],
        },
      ],
    },
  ],
};
