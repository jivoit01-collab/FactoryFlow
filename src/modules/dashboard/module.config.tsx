import type { ModuleConfig } from '@/core/types';

import DashboardPage from './pages/DashboardPage';

/**
 * Dashboard module configuration
 * Dashboard is always visible for authenticated users
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
  navigation: [],
};
