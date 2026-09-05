/**
 * Organization module — the department ownership chart.
 *
 * One page: who owns each function and who backs them up. It is gated on its
 * own `org_chart.*` permissions rather than a module prefix so that granting
 * the read right is all it takes to put the chart in someone's sidebar.
 */
import { Network } from 'lucide-react';

import { ORG_CHART_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const DepartmentOwnershipPage = lazy(() => import('./pages/DepartmentOwnershipPage'));

export const organizationModuleConfig: ModuleConfig = {
  name: 'organization',
  routes: [
    {
      path: '/organization',
      element: <DepartmentOwnershipPage />,
      layout: 'main',
      permissions: ORG_CHART_ACCESS,
      breadcrumb: { label: 'Organization' },
    },
  ],
  navigation: [
    {
      path: '/organization',
      title: 'Organization',
      icon: Network,
      showInSidebar: true,
      permissions: ORG_CHART_ACCESS,
    },
  ],
};
