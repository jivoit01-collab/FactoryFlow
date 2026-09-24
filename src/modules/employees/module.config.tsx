/**
 * Organisation module — the directory, the reporting tree, and compensation.
 *
 * The sidebar calls it "Organisation" and it opens on the department ownership
 * chart at `/organization`, which is registered by its own module, alongside
 * Request Labour (`/organization/request-labour`) -- what each department needs
 * on the next day's shifts -- and Allocate Labour
 * (`/organization/allocate-labour`) -- how the labour that turned up is split
 * across those departments. Allocate Labour used to be a top-level module at
 * `/labour`, which now redirects there. Everything below those three is the employee screens,
 * which keep their `/employees/*` paths. The name is the only thing shared —
 * nothing was moved, so a bookmark, a deep link or a printed URL still lands
 * where it did.
 *
 * Attendance and Leave were top-level sidebar modules too, and were folded in
 * the same way: they are about the same people, read day to day. Their routes
 * are still registered by their own modules (`attendance/`, `leave/`) at
 * `/attendance/*` and `/leave/*`; only the sidebar entries moved here.
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
  CalendarCheck,
  CalendarCheck2,
  CalendarRange,
  ClipboardList,
  HardHat,
  Inbox,
  Network,
  Settings,
  Split,
  Table2,
  Users,
  Wallet,
} from 'lucide-react';

import {
  ATTENDANCE_ACCESS,
  EMPLOYEE_ACCESS,
  EMPLOYEE_REPORTS_ACCESS,
  EMPLOYEE_STRUCTURE_ACCESS,
  LABOUR_REQUEST_ACCESS,
  LEAVE_ACCESS,
  LEAVE_DECIDE_ACCESS,
  LEAVE_MANAGE_ACCESS,
  LEAVE_TEAM_ACCESS,
  ORG_CHART_ACCESS,
  SALARY_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';
import { PendingLeaveBadge } from '@/modules/leave/components/PendingLeaveBadge';
import { ALLOCATE_LABOUR_ACCESS } from '@/modules/organization/module.config';

const EmployeeDirectoryPage = lazy(() => import('./pages/EmployeeDirectoryPage'));
const OrgChartPage = lazy(() => import('./pages/OrgChartPage'));
const EmployeeProfilePage = lazy(() => import('./pages/EmployeeProfilePage'));
const OrgStructurePage = lazy(() => import('./pages/OrgStructurePage'));
const WorkforceReportsPage = lazy(() => import('./pages/WorkforceReportsPage'));
const CompensationReviewPage = lazy(() => import('./pages/CompensationReviewPage'));
const LabourPresencePage = lazy(() => import('./pages/LabourPresencePage'));

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
      // No permissions: every signed-in user may read the ownership chart this
      // header opens on, so every user sees Organisation. The children below
      // are still filtered one by one, so a user without other rights sees the
      // chart alone.
      // The pending-leave count used to sit on the Leave header. It is carried
      // up here so an approver still sees it with the sidebar collapsed, when
      // only the Organisation icon shows.
      badge: PendingLeaveBadge,
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
          path: '/organization/allocate-labour',
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
        // Attendance's two screens read the same rows, so they share
        // ATTENDANCE_ACCESS. The register cannot show anything the daily sheet
        // would have hidden.
        {
          path: '/attendance',
          title: 'Attendance',
          icon: CalendarCheck,
          permissions: ATTENDANCE_ACCESS,
        },
        {
          path: '/attendance/register',
          title: 'Attendance register',
          icon: Table2,
          permissions: ATTENDANCE_ACCESS,
        },
        {
          path: '/leave',
          title: 'My leave',
          icon: CalendarCheck2,
          permissions: LEAVE_ACCESS,
        },
        {
          // Only for people who can decide something. A supervisor who can see
          // their team but not decide does not get an empty queue to stare at.
          path: '/leave/approvals',
          title: 'Leave approvals',
          icon: Inbox,
          permissions: LEAVE_DECIDE_ACCESS,
          badge: PendingLeaveBadge,
        },
        {
          path: '/leave/calendar',
          title: 'Leave calendar',
          icon: CalendarRange,
          permissions: LEAVE_TEAM_ACCESS,
        },
        {
          path: '/leave/settings',
          title: 'Leave settings',
          icon: Settings,
          permissions: LEAVE_MANAGE_ACCESS,
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
