import { Factory } from 'lucide-react';
import { lazy } from 'react';

import { PRODUCTION_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// Lazy load Production Planning pages
const PlanningDashboardPage = lazy(() => import('./planning/pages/PlanningDashboardPage'));
const CreatePlanPage = lazy(() => import('./planning/pages/CreatePlanPage'));
const PlanDetailPage = lazy(() => import('./planning/pages/PlanDetailPage'));
const BulkImportPage = lazy(() => import('./planning/pages/BulkImportPage'));

export const productionModuleConfig: ModuleConfig = {
  name: 'production',
  routes: [
    {
      path: '/production/planning',
      element: <PlanningDashboardPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
    },
    {
      path: '/production/planning/create',
      element: <CreatePlanPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.CREATE_PLAN],
    },
    {
      path: '/production/planning/bulk-import',
      element: <BulkImportPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.CREATE_PLAN],
    },
    {
      path: '/production/planning/:planId',
      element: <PlanDetailPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
    },
    {
      path: '/production/planning/:planId/edit',
      element: <CreatePlanPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.EDIT_PLAN],
    },
  ],
  navigation: [
    {
      path: '/production/planning',
      title: 'Production',
      icon: Factory,
      showInSidebar: true,
      permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
      hasSubmenu: true,
      children: [
        {
          path: '/production/planning',
          title: 'Planning',
          permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
        },
      ],
    },
  ],
};
