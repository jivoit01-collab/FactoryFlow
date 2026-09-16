/**
 * Organization module — the department ownership chart and next-day labour.
 *
 * Two pages, each gated on its own permissions rather than on a module prefix,
 * so granting one read right is all it takes to open that one page:
 *
 *   /organization                 — who owns each function and who backs them up
 *                                   (`org_chart.*`)
 *   /organization/request-labour  — what each department needs on the next day's
 *                                   shifts (`labour_request.*`)
 *
 * The two share nothing but the department as a subject; a user may hold either
 * without the other.
 *
 * The route lives here; the sidebar entry that reaches it lives in the
 * Organisation module (`employees/module.config.tsx`), which opens on this
 * page. Keeping the two apart is deliberate — the chart is one subject
 * (departments and their owners) and the employee screens are another (real
 * people), and only the navigation joins them.
 */
import { LABOUR_REQUEST_ACCESS, ORG_CHART_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const DepartmentOwnershipPage = lazy(() => import('./pages/DepartmentOwnershipPage'));
const RequestLabourPage = lazy(() => import('./pages/RequestLabourPage'));

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
    {
      path: '/organization/request-labour',
      element: <RequestLabourPage />,
      layout: 'main',
      permissions: LABOUR_REQUEST_ACCESS,
      breadcrumb: { label: 'Request labour' },
    },
  ],
  // No sidebar entry of its own: the chart is what the Organisation module
  // opens on, so it is reached through that module's own nav item (see
  // `employees/module.config.tsx`) rather than sitting beside it as a second,
  // near-identically named top-level link.
  navigation: [],
};
