/**
 * Organisation module — the directory, the reporting tree, and compensation.
 *
 * The sidebar calls it "Organisation" and it opens on the department ownership
 * chart at `/organization`, which is registered by its own module, alongside
 * Request Labour (`/organization/request-labour`) -- what each department needs
 * on the next day's shifts -- and Allocate Labour (`/labour`) -- how the labour
 * that turned up is split across those departments. Allocate Labour used to be
 * a top-level module of its own; only its sidebar entry moved, so its URL is
 * unchanged. Everything below those three is the employee screens,
 * which keep their `/employees/*` paths. The name is the only thing shared —
 * nothing was moved, so a bookmark, a deep link or a printed URL still lands
 * where it did.
 *
 * Seven screens, gated on their own `employee_hierarchy.*` permissions rather
 * than on a module prefix, because the permissions here are not a ladder: the
 * directory, the structure masters, the reports and the salary screens are four
 * separate grants, and somebody may hold any one of them without the others. A
 * prefix match would put Compensation in the sidebar of anybody who could open
 * the org chart.
 *
 * The permanent-labour register rides on the directory grant to be *seen*;
 * recording a shift is its own right, checked inside the page against the meta
 * endpoint's flags rather than here, because a clerk who may count heads and an
 * HR user who may edit the roll both belong on the same screen.
 *
 * The profile route is registered last of the static paths but its dynamic
 * segment (`/employees/:employeeId`) cannot swallow them: React Router ranks a
 * static segment above a dynamic one, so `/employees/chart` is never read as an
 * employee id.
 */
import {
  Building2,
  ClipboardList,
  HardHat,
  Network,
  Split,
  Table2,
  Users,
  Wallet,
} from 'lucide-react';

import {
  EMPLOYEE_ACCESS,
  EMPLOYEE_REPORTS_ACCESS,
  EMPLOYEE_STRUCTURE_ACCESS,
  LABOUR_REQUEST_ACCESS,
  ORG_CHART_ACCESS,
  SALARY_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';
import { ALLOCATE_LABOUR_ACCESS } from '@/modules/organization/module.config';

const EmployeeDirectoryPage = lazy(() => import('./pages/EmployeeDirectoryPage'));
const OrgChartPage = lazy(() => import('./pages/OrgChartPage'));
const EmployeeProfilePage = lazy(() => import('./pages/EmployeeProfilePage'));
const OrgStructurePage = lazy(() => import('./pages/OrgStructurePage'));
const WorkforceReportsPage = lazy(() => import('./pages/WorkforceReportsPage'));
const CompensationReviewPage = lazy(() => import('./pages/CompensationReviewPage'));
const LabourPresencePage = lazy(() => import('./pages/LabourPresencePage'));

/**
 * Anything that should reveal the Organisation module in the sidebar: the
 * ownership chart or any of the employee screens. The parent item is a link as
 * well as a header, so it has to be visible to somebody who holds only one
 * side of that.
 */
const ORGANISATION_ACCESS: readonly string[] = [
  ...ORG_CHART_ACCESS,
  ...EMPLOYEE_ACCESS,
  ...LABOUR_REQUEST_ACCESS,
  ...ALLOCATE_LABOUR_ACCESS,
];

export const employeesModuleConfig: ModuleConfig = {
  name: 'employees',
  routes: [
    {
      path: '/employees',
      element: <EmployeeDirectoryPage />,
      layout: 'main',
      permissions: EMPLOYEE_ACCESS,
      breadcrumb: { label: 'Employees' },
    },
    {
      path: '/employees/chart',
      element: <OrgChartPage />,
      layout: 'main',
      permissions: EMPLOYEE_ACCESS,
      breadcrumb: { label: 'Org chart' },
    },
    {
      path: '/employees/structure',
      element: <OrgStructurePage />,
      layout: 'main',
      permissions: EMPLOYEE_STRUCTURE_ACCESS,
      breadcrumb: { label: 'Structure' },
    },
    {
      path: '/employees/labour',
      element: <LabourPresencePage />,
      layout: 'main',
      permissions: EMPLOYEE_ACCESS,
      breadcrumb: { label: 'Permanent labour' },
    },
    {
      path: '/employees/compensation',
      element: <CompensationReviewPage />,
      layout: 'main',
      permissions: SALARY_ACCESS,
      breadcrumb: { label: 'Compensation' },
    },
    {
      path: '/employees/reports',
      element: <WorkforceReportsPage />,
      layout: 'main',
      permissions: EMPLOYEE_REPORTS_ACCESS,
      breadcrumb: { label: 'Reports' },
    },
    {
      path: '/employees/:employeeId',
      element: <EmployeeProfilePage />,
      layout: 'main',
      permissions: EMPLOYEE_ACCESS,
    },
  ],
  navigation: [
    {
      path: '/organization',
      title: 'Organisation',
      icon: Network,
      showInSidebar: true,
      hasSubmenu: true,
      permissions: ORGANISATION_ACCESS,
      children: [
        {
          path: '/organization',
          title: 'Ownership chart',
          icon: Table2,
          permissions: ORG_CHART_ACCESS,
        },
        {
          path: '/organization/request-labour',
          title: 'Request labour',
          icon: ClipboardList,
          permissions: LABOUR_REQUEST_ACCESS,
        },
        {
          path: '/labour',
          title: 'Allocate labour',
          icon: Split,
          permissions: ALLOCATE_LABOUR_ACCESS,
        },
        {
          path: '/employees',
          title: 'Directory',
          icon: Users,
          permissions: EMPLOYEE_ACCESS,
        },
        {
          path: '/employees/chart',
          title: 'Org chart',
          icon: Network,
          permissions: EMPLOYEE_ACCESS,
        },
        {
          path: '/employees/structure',
          title: 'Structure',
          icon: Building2,
          permissions: EMPLOYEE_STRUCTURE_ACCESS,
        },
        {
          path: '/employees/labour',
          title: 'Permanent labour',
          icon: HardHat,
          permissions: EMPLOYEE_ACCESS,
        },
        {
          path: '/employees/compensation',
          title: 'Compensation',
          icon: Wallet,
          permissions: SALARY_ACCESS,
        },
        {
          path: '/employees/reports',
          title: 'Reports',
          icon: Users,
          permissions: EMPLOYEE_REPORTS_ACCESS,
        },
      ],
    },
  ],
};
