/**
 * Attendance module — the punch-machine daily sheet and its corrections.
 *
 * Promoted out of `gate`, where it lived as a hidden, dashboard-only fallback
 * for marking people present by hand. It is now the sheet the factory's
 * attendance is actually read from. Its sidebar entries sit under
 * Organisation; the routes are still registered here.
 *
 * Gated on ATTENDANCE_ACCESS rather than on a module prefix: viewing the sheet
 * and correcting a status are independent grants, not a ladder, and a prefix
 * match would show the correction UI to everyone who can open the page.
 */
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
  // No sidebar entry of its own: both screens are listed under Organisation
  // (`employees/module.config.tsx`), beside the people they are about. Only
  // the navigation moved; the routes above keep their `/attendance` URLs.
  navigation: [],
};
