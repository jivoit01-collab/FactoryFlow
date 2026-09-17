/**
 * Issues module — the software's own bug list, inside the software.
 *
 * Four pages: the list, the new-issue form, one issue, and the settings
 * screen (labels and the support number). Gated on `issues.*` permissions rather than a module prefix, so
 * granting the read right is all it takes to put Issues in someone's sidebar —
 * and the intent is that nearly everyone gets the reporting right, since the
 * people who hit the bugs are the ones who should be filing them.
 */
import { Bug, CirclePlus, Tags } from 'lucide-react';

import {
  ISSUE_ACCESS,
  ISSUE_CREATE_ACCESS,
  ISSUE_SETTINGS_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const IssuesListPage = lazy(() => import('./pages/IssuesListPage'));
const IssueNewPage = lazy(() => import('./pages/IssueNewPage'));
const IssueDetailPage = lazy(() => import('./pages/IssueDetailPage'));
const IssueSettingsPage = lazy(() => import('./pages/IssueSettingsPage'));

export const issuesModuleConfig: ModuleConfig = {
  name: 'issues',
  routes: [
    {
      path: '/issues',
      element: <IssuesListPage />,
      layout: 'main',
      permissions: ISSUE_ACCESS,
      breadcrumb: { label: 'Issues' },
    },
    {
      path: '/issues/new',
      element: <IssueNewPage />,
      layout: 'main',
      permissions: ISSUE_CREATE_ACCESS,
      breadcrumb: { label: 'New issue' },
    },
    // Before the :number route would not matter (React Router ranks static
    // segments higher), but keeping the masters adjacent reads better.
    {
      path: '/issues/labels',
      element: <IssueSettingsPage />,
      layout: 'main',
      permissions: ISSUE_SETTINGS_ACCESS,
      breadcrumb: { label: 'Settings' },
    },
    {
      path: '/issues/:number',
      element: <IssueDetailPage />,
      layout: 'main',
      permissions: ISSUE_ACCESS,
      breadcrumb: { label: 'Issue' },
    },
  ],
  navigation: [
    {
      path: '/issues',
      title: 'Issues',
      icon: Bug,
      showInSidebar: true,
      hasSubmenu: true,
      permissions: ISSUE_ACCESS,
      // The parent link is itself the list, so there is no "All issues" child
      // -- it would just be the same route twice in a row.
      children: [
        {
          path: '/issues/new',
          title: 'Report an issue',
          icon: CirclePlus,
          permissions: ISSUE_CREATE_ACCESS,
        },
        {
          path: '/issues/labels',
          title: 'Settings',
          icon: Tags,
          permissions: ISSUE_SETTINGS_ACCESS,
        },
      ],
    },
  ],
};
