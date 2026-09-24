/**
 * Organization module — the department ownership chart, the labour pages, and
 * the Attendance and Leave submodules.
 *
 * Three pages of its own, each gated on its own permissions rather than on a module prefix,
 * so granting one read right is all it takes to open that one page:
 *
 *   /organization                 — who owns each function and who backs them up
 *                                   (`org_chart.*`)
 *   /organization/request-labour  — what each department needs on the next day's
 *                                   shifts (`labour_request.*`)
 *   /organization/allocate-labour — Allocate labour: splitting the labour that
 *                                   actually came through the gate across those
 *                                   departments (`labour_gate.*`)
 *
 * They share nothing but the department as a subject; a user may hold any one of
 * them without the others.
 *
 * Allocate labour was a top-level module of its own until it was folded in here,
 * next to the request it answers. Its URL followed it under `/organization/`;
 * the old `/labour` URL still redirects there, so bookmarks keep working.
 *
 * Attendance and Leave were top-level modules too, and were folded in the same
 * way: their code lives in `./attendance` and `./leave`, their pages under
 * `/organization/attendance*` and `/organization/leave*`, and their old
 * `/attendance*` and `/leave*` URLs redirect. Each keeps its own permissions.
 *
 * The route lives here; the sidebar entry that reaches it lives in the
 * Organisation module (`employees/module.config.tsx`), which opens on this
 * page. Keeping the two apart is deliberate — the chart is one subject
 * (departments and their owners) and the employee screens are another (real
 * people), and only the navigation joins them.
 */
import { LABOUR_PERMISSIONS, LABOUR_REQUEST_ACCESS, ORG_CHART_ACCESS } from '@/config/permissions';
import { Navigate } from 'react-router-dom';

import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { attendanceRoutes } from './attendance/module.config';
import { leaveRoutes } from './leave/module.config';

const DepartmentOwnershipPage = lazy(() => import('./pages/DepartmentOwnershipPage'));
const RequestLabourPage = lazy(() => import('./pages/RequestLabourPage'));
// The allocation screen physically lives in the gate module (it reuses
// gate-domain masters: Contractor, Department). The route is registered here
// because the sidebar reaches it from Organisation.
const AllocateLabourPage = lazy(
  () => import('@/modules/gate/pages/labourGatePages/LabourModulePage'),
);

// Allocating (or just viewing) the department split is what opens this page —
// the gate person's raw in/out rights deliberately do NOT.
export const ALLOCATE_LABOUR_ACCESS: readonly string[] = [
  LABOUR_PERMISSIONS.ALLOCATE,
  LABOUR_PERMISSIONS.VIEW,
];

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
    {
      path: '/organization/allocate-labour',
      element: <AllocateLabourPage />,
      layout: 'main',
      permissions: ALLOCATE_LABOUR_ACCESS,
      breadcrumb: { label: 'Allocate labour' },
    },
    // The page's old top-level URL, kept so bookmarks still land on it.
    {
      path: '/labour',
      element: <Navigate to="/organization/allocate-labour" replace />,
      layout: 'main',
      permissions: ALLOCATE_LABOUR_ACCESS,
    },
    ...attendanceRoutes,
    ...leaveRoutes,
  ],
  // No sidebar entry of its own: the chart is what the Organisation module
  // opens on, so these pages are reached through that module's own nav item
  // (see `employees/module.config.tsx`) rather than sitting beside it as a
  // second, near-identically named top-level link.
  navigation: [],
};
