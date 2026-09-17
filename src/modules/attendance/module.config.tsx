/**
 * Attendance module — the punch-machine daily sheet and its corrections.
 *
 * Promoted out of `gate`, where it lived as a hidden, dashboard-only fallback
 * for marking people present by hand. It is now the sheet the factory's
 * attendance is actually read from, so it gets a sidebar entry of its own.
 *
 * Gated on ATTENDANCE_ACCESS rather than on a module prefix: viewing the sheet
 * and correcting a status are independent grants, not a ladder, and a prefix
 * match would show the correction UI to everyone who can open the page.
 */
import { CalendarCheck, CalendarDays, Table2 } from 'lucide-react';

import { ATTENDANCE_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const DailyAttendancePage = lazy(() => import('./pages/DailyAttendancePage'));
const MonthlyRegisterPage = lazy(() => import('./pages/MonthlyRegisterPage'));

export const attendanceModuleConfig: ModuleConfig = {
  name: 'attendance',
  routes: [
    {
      path: '/attendance',
      element: <DailyAttendancePage />,
      layout: 'main',
      permissions: ATTENDANCE_ACCESS,
      breadcrumb: { label: 'Attendance' },
    },
    {
      path: '/attendance/register',
      element: <MonthlyRegisterPage />,
      layout: 'main',
      permissions: ATTENDANCE_ACCESS,
      breadcrumb: { label: 'Attendance register' },
    },
  ],
  navigation: [
    {
      // Both screens read the same rows, so they share ATTENDANCE_ACCESS: the
      // register cannot show anything the daily sheet would have hidden, and
      // correcting from it still needs the override grant the cells check.
      path: '/attendance',
      title: 'Attendance',
      icon: CalendarCheck,
      showInSidebar: true,
      hasSubmenu: true,
      permissions: ATTENDANCE_ACCESS,
      children: [
        {
          path: '/attendance',
          title: 'Daily sheet',
          icon: CalendarDays,
          permissions: ATTENDANCE_ACCESS,
        },
        {
          path: '/attendance/register',
          title: 'Monthly register',
          icon: Table2,
          permissions: ATTENDANCE_ACCESS,
        },
      ],
    },
  ],
};
