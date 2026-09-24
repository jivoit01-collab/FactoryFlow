/**
 * Attendance — the punch-machine daily sheet and its corrections.
 *
 * A submodule of Organisation. It was a top-level module at `/attendance`
 * (promoted out of `gate` before that); its pages now live under
 * `/organization/attendance`, and the old URLs redirect, so bookmarks still
 * land. The sidebar entries are in `employees/module.config.tsx`, under the
 * Organisation header.
 *
 * Gated on ATTENDANCE_ACCESS rather than on a module prefix: viewing the sheet
 * and correcting a status are independent grants, not a ladder, and a prefix
 * match would show the correction UI to everyone who can open the page.
 */
import { ATTENDANCE_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleRoute } from '@/core/types';

import { LegacyRedirect } from '../components/LegacyRedirect';

const DailyAttendancePage = lazy(() => import('./pages/DailyAttendancePage'));
const MonthlyRegisterPage = lazy(() => import('./pages/MonthlyRegisterPage'));

export const ATTENDANCE_PATHS = {
  DAILY: '/organization/attendance',
  REGISTER: '/organization/attendance/register',
} as const;

export const attendanceRoutes: ModuleRoute[] = [
  {
    path: ATTENDANCE_PATHS.DAILY,
    element: <DailyAttendancePage />,
    layout: 'main',
    permissions: ATTENDANCE_ACCESS,
    breadcrumb: { label: 'Attendance' },
  },
  {
    path: ATTENDANCE_PATHS.REGISTER,
    element: <MonthlyRegisterPage />,
    layout: 'main',
    permissions: ATTENDANCE_ACCESS,
    breadcrumb: { label: 'Attendance register' },
  },
  // The pre-move URLs, kept so bookmarks still land on the page.
  {
    path: '/attendance',
    element: <LegacyRedirect to={ATTENDANCE_PATHS.DAILY} />,
    layout: 'main',
    permissions: ATTENDANCE_ACCESS,
  },
  {
    path: '/attendance/register',
    element: <LegacyRedirect to={ATTENDANCE_PATHS.REGISTER} />,
    layout: 'main',
    permissions: ATTENDANCE_ACCESS,
  },
];
