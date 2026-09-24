/**
 * Leave — apply, approve, and see who is out.
 *
 * A submodule of Organisation, beside Attendance, because that is where an
 * approved leave lands: the days become `ON_LEAVE` on the daily sheet, while
 * the punch machine's own reading stays beside them untouched. It was a
 * top-level module at `/leave`; its pages now live under `/organization/leave`,
 * and the old URLs redirect — push notifications already delivered still carry
 * them. The sidebar entries are in `employees/module.config.tsx`.
 *
 * Gated on `LEAVE_ACCESS` rather than on a module prefix. Applying, viewing a
 * team and deciding are three separate grants for three different audiences —
 * a prefix match would show the approvals queue to everybody who can request a
 * day off.
 *
 * Note what the route permissions do *not* do: the approvals route is gated on
 * holding a decide grant at all, but whether a given row may be actioned is the
 * server's answer (`can_decide` per request), because that depends on the
 * reporting tree. The route opens the page; the rows decide the buttons.
 */
import {
  LEAVE_ACCESS,
  LEAVE_DECIDE_ACCESS,
  LEAVE_MANAGE_ACCESS,
  LEAVE_TEAM_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleRoute } from '@/core/types';

import { LegacyRedirect } from '../components/LegacyRedirect';

const MyLeavePage = lazy(() => import('./pages/MyLeavePage'));
const LeaveApprovalsPage = lazy(() => import('./pages/LeaveApprovalsPage'));
const LeaveCalendarPage = lazy(() => import('./pages/LeaveCalendarPage'));
const LeaveSettingsPage = lazy(() => import('./pages/LeaveSettingsPage'));

export const LEAVE_PATHS = {
  MY_LEAVE: '/organization/leave',
  APPROVALS: '/organization/leave/approvals',
  CALENDAR: '/organization/leave/calendar',
  SETTINGS: '/organization/leave/settings',
} as const;

/** The four pages, each with its own gate, and the URL each used to have. */
const PAGES = [
  {
    path: LEAVE_PATHS.MY_LEAVE,
    legacy: '/leave',
    element: <MyLeavePage />,
    permissions: LEAVE_ACCESS,
    label: 'Leave',
  },
  {
    path: LEAVE_PATHS.APPROVALS,
    legacy: '/leave/approvals',
    element: <LeaveApprovalsPage />,
    permissions: LEAVE_DECIDE_ACCESS,
    label: 'Approvals',
  },
  {
    path: LEAVE_PATHS.CALENDAR,
    legacy: '/leave/calendar',
    element: <LeaveCalendarPage />,
    permissions: LEAVE_TEAM_ACCESS,
    label: 'Calendar',
  },
  {
    // The two masters. Gated on the manage grant alone: reading a leave type
    // is open to everyone who can apply, but editing one changes what the
    // whole plant may ask for.
    path: LEAVE_PATHS.SETTINGS,
    legacy: '/leave/settings',
    element: <LeaveSettingsPage />,
    permissions: LEAVE_MANAGE_ACCESS,
    label: 'Settings',
  },
] as const;

export const leaveRoutes: ModuleRoute[] = [
  ...PAGES.map(
    (page): ModuleRoute => ({
      path: page.path,
      element: page.element,
      layout: 'main',
      permissions: page.permissions,
      breadcrumb: { label: page.label },
    }),
  ),
  // The pre-move URLs, each under the same gate as the page it forwards to.
  ...PAGES.map(
    (page): ModuleRoute => ({
      path: page.legacy,
      element: <LegacyRedirect to={page.path} />,
      layout: 'main',
      permissions: page.permissions,
    }),
  ),
];
