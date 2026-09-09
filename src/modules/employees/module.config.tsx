/**
 * Employees module — the directory, the reporting tree, and compensation.
 *
 * Six screens, gated on their own `employee_hierarchy.*` permissions rather
 * than on a module prefix, because the permissions here are not a ladder: the
 * directory, the structure masters, the reports and the salary screens are four
 * separate grants, and somebody may hold any one of them without the others. A
 * prefix match would put Compensation in the sidebar of anybody who could open
 * the org chart.
 *
 * The profile route is registered last of the static paths but its dynamic
 * segment (`/employees/:employeeId`) cannot swallow them: React Router ranks a
 * static segment above a dynamic one, so `/employees/chart` is never read as an
 * employee id.
 */
import { Building2, Network, Users, Wallet } from 'lucide-react';

import {
  EMPLOYEE_ACCESS,
  EMPLOYEE_REPORTS_ACCESS,
  EMPLOYEE_STRUCTURE_ACCESS,
  SALARY_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const EmployeeDirectoryPage = lazy(() => import('./pages/EmployeeDirectoryPage'));
const OrgChartPage = lazy(() => import('./pages/OrgChartPage'));
const EmployeeProfilePage = lazy(() => import('./pages/EmployeeProfilePage'));
const OrgStructurePage = lazy(() => import('./pages/OrgStructurePage'));
const WorkforceReportsPage = lazy(() => import('./pages/WorkforceReportsPage'));
const CompensationReviewPage = lazy(() => import('./pages/CompensationReviewPage'));

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
      path: '/employees',
      title: 'Employees',
      icon: Users,
      showInSidebar: true,
      hasSubmenu: true,
      permissions: EMPLOYEE_ACCESS,
      children: [
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
