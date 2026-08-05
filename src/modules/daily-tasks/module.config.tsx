import { ClipboardCheck, ListChecks, Users } from 'lucide-react';

import { DAILY_TASKS_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleRoute } from '@/core/types';

const MyDailyTasksPage = lazy(() => import('./pages/MyDailyTasksPage'));
const TeamDailyTasksPage = lazy(() => import('./pages/TeamDailyTasksPage'));

const dailyTasksRoutes: ModuleRoute[] = [
  {
    path: '/daily-tasks',
    element: <MyDailyTasksPage />,
    layout: 'main',
    permissions: [DAILY_TASKS_PERMISSIONS.VIEW_MY],
    breadcrumb: { label: 'My Daily Tasks' },
  },
  {
    path: '/daily-tasks/team',
    element: <TeamDailyTasksPage />,
    layout: 'main',
    permissions: [DAILY_TASKS_PERMISSIONS.VIEW_ALL],
    breadcrumb: { label: 'All Users' },
  },
];

/**
 * Daily Tasks — every user's job sheet for a day.
 *
 * Not company-scoped: every unit's staff has a sheet, and the backend already scopes
 * counts by the `Company-Code` header.
 *
 * The nav item gates on the two explicit permissions rather than `modulePrefix`,
 * because the `activity_center` prefix also matches `can_view_activity_reports` — a
 * user holding only that would see the menu but be unable to open either page.
 *
 * There is deliberately no sidebar badge; see docs/modules/daily-tasks.md.
 */
export const dailyTasksModuleConfig: ModuleConfig = {
  name: 'daily-tasks',
  routes: dailyTasksRoutes,
  navigation: [
    {
      path: '/daily-tasks',
      title: 'Daily Tasks',
      icon: ClipboardCheck,
      showInSidebar: true,
      hasSubmenu: true,
      permissions: [DAILY_TASKS_PERMISSIONS.VIEW_MY, DAILY_TASKS_PERMISSIONS.VIEW_ALL],
      children: [
        {
          path: '/daily-tasks',
          title: 'My Daily Tasks',
          icon: ListChecks,
          permissions: [DAILY_TASKS_PERMISSIONS.VIEW_MY],
        },
        {
          path: '/daily-tasks/team',
          title: 'All Users',
          icon: Users,
          permissions: [DAILY_TASKS_PERMISSIONS.VIEW_ALL],
        },
      ],
    },
  ],
};
