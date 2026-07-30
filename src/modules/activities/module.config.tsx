import { ListChecks } from 'lucide-react';

import { ACTIVITY_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { MyPendingBadge } from './components/MyPendingBadge';

const MyActivitiesPage = lazy(() => import('./pages/MyActivitiesPage'));
const TeamActivityPage = lazy(() => import('./pages/TeamActivityPage'));
const UserActivityDetailPage = lazy(() => import('./pages/UserActivityDetailPage'));
const ActivityCatalogPage = lazy(() => import('./pages/ActivityCatalogPage'));

/**
 * Activity Center module configuration.
 *
 * Shows each user the work that is actually waiting on them, derived live from the
 * modules that own the records — nothing is entered or ticked here.
 *
 * Access is deliberately two-tier:
 *  - `VIEW_MY` is self-scoped; the backend always reads the authenticated user, so it
 *    cannot leak anyone else's work and is safe to grant broadly.
 *  - `VIEW_ALL` unlocks the team screens and the job catalogue, and should stay with
 *    supervisors.
 */
export const activitiesModuleConfig: ModuleConfig = {
  name: 'activities',
  routes: [
    {
      path: '/activities',
      element: <MyActivitiesPage />,
      layout: 'main',
      permissions: [ACTIVITY_PERMISSIONS.VIEW_MY],
      breadcrumb: { label: 'My Activities' },
    },
    {
      path: '/activities/team',
      element: <TeamActivityPage />,
      layout: 'main',
      permissions: [ACTIVITY_PERMISSIONS.VIEW_ALL],
      breadcrumb: { label: 'Team' },
    },
    {
      // Reachable from the team list, and by a user for their own id — the backend
      // permits self-access without VIEW_ALL, so VIEW_MY is the right route gate.
      path: '/activities/users/:userId',
      element: <UserActivityDetailPage />,
      layout: 'main',
      permissions: [ACTIVITY_PERMISSIONS.VIEW_MY, ACTIVITY_PERMISSIONS.VIEW_ALL],
      breadcrumb: { label: 'User' },
    },
    {
      path: '/activities/catalogue',
      element: <ActivityCatalogPage />,
      layout: 'main',
      permissions: [ACTIVITY_PERMISSIONS.VIEW_ALL],
      breadcrumb: { label: 'Job Catalogue' },
    },
  ],
  navigation: [
    {
      path: '/activities',
      title: 'Activities',
      icon: ListChecks,
      showInSidebar: true,
      permissions: [ACTIVITY_PERMISSIONS.VIEW_MY, ACTIVITY_PERMISSIONS.VIEW_ALL],
      hasSubmenu: true,
      badge: MyPendingBadge,
      children: [
        {
          path: '/activities',
          title: 'My Activities',
          permissions: [ACTIVITY_PERMISSIONS.VIEW_MY],
          badge: MyPendingBadge,
        },
        {
          path: '/activities/team',
          title: 'Team Activity',
          permissions: [ACTIVITY_PERMISSIONS.VIEW_ALL],
        },
        {
          path: '/activities/catalogue',
          title: 'Job Catalogue',
          permissions: [ACTIVITY_PERMISSIONS.VIEW_ALL],
        },
      ],
    },
  ],
};
