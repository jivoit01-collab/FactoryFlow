/**
 * Leave module — apply, approve, and see who is out.
 *
 * Sits beside Attendance because that is where an approved leave lands: the
 * days become `ON_LEAVE` on the daily sheet, while the punch machine's own
 * reading stays beside them untouched.
 *
 * Gated on `LEAVE_ACCESS` rather than on a module prefix. Applying, viewing a
 * team and deciding are three separate grants for three different audiences —
 * a prefix match would show the approvals queue to everybody who can request a
 * day off.
 *
 * Note what the route permissions do *not* do: `/leave/approvals` is gated on
 * holding a decide grant at all, but whether a given row may be actioned is the
 * server's answer (`can_decide` per request), because that depends on the
 * reporting tree. The route opens the page; the rows decide the buttons.
 */
import { CalendarCheck2, CalendarDays, CalendarRange, Inbox, Settings } from 'lucide-react';

import {
  LEAVE_ACCESS,
  LEAVE_DECIDE_ACCESS,
  LEAVE_MANAGE_ACCESS,
  LEAVE_TEAM_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { PendingLeaveBadge } from './components/PendingLeaveBadge';

const MyLeavePage = lazy(() => import('./pages/MyLeavePage'));
const LeaveApprovalsPage = lazy(() => import('./pages/LeaveApprovalsPage'));
const LeaveCalendarPage = lazy(() => import('./pages/LeaveCalendarPage'));
const LeaveSettingsPage = lazy(() => import('./pages/LeaveSettingsPage'));

export const leaveModuleConfig: ModuleConfig = {
  name: 'leave',
  routes: [
    {
      path: '/leave',
      element: <MyLeavePage />,
      layout: 'main',
      permissions: LEAVE_ACCESS,
      breadcrumb: { label: 'Leave' },
    },
    {
      path: '/leave/approvals',
      element: <LeaveApprovalsPage />,
      layout: 'main',
      permissions: LEAVE_DECIDE_ACCESS,
      breadcrumb: { label: 'Approvals' },
    },
    {
      path: '/leave/calendar',
      element: <LeaveCalendarPage />,
      layout: 'main',
      permissions: LEAVE_TEAM_ACCESS,
      breadcrumb: { label: 'Calendar' },
    },
    {
      // The two masters. Gated on the manage grant alone: reading a leave type
      // is open to everyone who can apply, but editing one changes what the
      // whole plant may ask for.
      path: '/leave/settings',
      element: <LeaveSettingsPage />,
      layout: 'main',
      permissions: LEAVE_MANAGE_ACCESS,
      breadcrumb: { label: 'Settings' },
    },
  ],
  navigation: [
    {
      path: '/leave',
      title: 'Leave',
      icon: CalendarCheck2,
      showInSidebar: true,
      hasSubmenu: true,
      permissions: LEAVE_ACCESS,
      badge: PendingLeaveBadge,
      children: [
        {
          path: '/leave',
          title: 'My leave',
          icon: CalendarDays,
          permissions: LEAVE_ACCESS,
        },
        {
          // Only for people who can decide something. A supervisor who can see
          // their team but not decide does not get an empty queue to stare at.
          path: '/leave/approvals',
          title: 'Approvals',
          icon: Inbox,
          permissions: LEAVE_DECIDE_ACCESS,
          badge: PendingLeaveBadge,
        },
        {
          path: '/leave/calendar',
          title: 'Calendar',
          icon: CalendarRange,
          permissions: LEAVE_TEAM_ACCESS,
        },
        {
          path: '/leave/settings',
          title: 'Settings',
          icon: Settings,
          permissions: LEAVE_MANAGE_ACCESS,
        },
      ],
    },
  ],
};
