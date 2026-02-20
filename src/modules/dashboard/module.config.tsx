import { LayoutDashboard } from 'lucide-react';

import { GATE_MODULE_PREFIX, GATE_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

import DashboardPage from './pages/DashboardPage';

/**
 * Dashboard module configuration
 */
export const dashboardModuleConfig: ModuleConfig = {
  name: 'dashboard',
  routes: [
    {
      path: '/',
      element: <DashboardPage />,
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/',
      title: 'Dashboard',
      icon: LayoutDashboard,
      permissions: [GATE_PERMISSIONS.DASHBOARD.VIEW],
      modulePrefix: GATE_MODULE_PREFIX,
      showInSidebar: true,
    },
  ],
};
