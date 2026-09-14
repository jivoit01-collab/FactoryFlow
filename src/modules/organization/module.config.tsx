/**
 * Organization module — the department ownership chart.
 *
 * One page: who owns each function and who backs them up. It is gated on its
 * own `org_chart.*` permissions rather than a module prefix, so granting the
 * read right is all it takes to open the chart.
 *
 * The route lives here; the sidebar entry that reaches it lives in the
 * Organisation module (`employees/module.config.tsx`), which opens on this
 * page. Keeping the two apart is deliberate — the chart is one subject
 * (departments and their owners) and the employee screens are another (real
 * people), and only the navigation joins them.
 */
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
      breadcrumb: { label: 'Organisation' },
    },
  ],
  // No sidebar entry of its own: the chart is what the Organisation module
  // opens on, so it is reached through that module's own nav item (see
  // `employees/module.config.tsx`) rather than sitting beside it as a second,
  // near-identically named top-level link.
  navigation: [],
};
