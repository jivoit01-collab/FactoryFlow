import { LayoutDashboard } from 'lucide-react';

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
      permissions: ['gatein.view_dashboard'],
      modulePrefix: 'gatein',
      showInSidebar: true,
    },
  ],
};
