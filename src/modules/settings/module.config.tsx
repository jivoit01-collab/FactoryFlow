import { lazy } from 'react';

import type { ModuleConfig } from '@/core/types';

const SettingsPage = lazy(() => import('./pages/SettingsPage'));

/**
 * Settings module configuration
 */
export const settingsModuleConfig: ModuleConfig = {
  name: 'settings',
  routes: [
    {
      path: '/settings',
      element: <SettingsPage />,
      layout: 'main',
      requiresAuth: true,
      breadcrumb: { label: 'Settings' },
    },
  ],
  // No sidebar navigation - settings is accessed via the sidebar settings button
  navigation: [],
};
