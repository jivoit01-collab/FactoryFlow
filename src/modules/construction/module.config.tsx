import { ClipboardCheck, ClipboardList, HardHat, LandPlot } from 'lucide-react';

import {
  CONSTRUCTION_ACCESS,
  CONSTRUCTION_MODULE_PREFIX,
  CONSTRUCTION_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleRoute } from '@/core/types';

const ProjectsListPage = lazy(() => import('./pages/ProjectsListPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ConstructionApprovalsPage = lazy(() => import('./pages/ConstructionApprovalsPage'));
const CivilWorksPage = lazy(() => import('./pages/CivilWorksPage'));

const constructionRoutes: ModuleRoute[] = [
  {
    path: '/construction/projects',
    element: <ProjectsListPage />,
    layout: 'main',
    permissions: [...CONSTRUCTION_ACCESS],
    breadcrumb: { label: 'Projects' },
  },
  {
    path: '/construction/civil-works',
    element: <CivilWorksPage />,
    layout: 'main',
    permissions: [CONSTRUCTION_PERMISSIONS.VIEW_CIVIL_WORKS],
    breadcrumb: { label: 'Civil Works' },
  },
  {
    path: '/construction/approvals',
    element: <ConstructionApprovalsPage />,
    layout: 'main',
    permissions: [CONSTRUCTION_PERMISSIONS.APPROVE_PROJECT],
    breadcrumb: { label: 'Approvals' },
  },
  {
    path: '/construction/projects/:projectId',
    element: <ProjectDetailPage />,
    layout: 'main',
    permissions: [...CONSTRUCTION_ACCESS],
    breadcrumb: { label: 'Project' },
  },
];

export const constructionModuleConfig: ModuleConfig = {
  name: 'construction',
  routes: constructionRoutes,
  navigation: [
    {
      path: '/construction/projects',
      title: 'Construction',
      icon: HardHat,
      // Required, despite being optional on the type: Sidebar.tsx filters with
      // `if (!item.showInSidebar) return false`, so omitting it hides the menu.
      showInSidebar: true,
      modulePrefix: CONSTRUCTION_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        {
          path: '/construction/projects',
          title: 'Projects',
          icon: ClipboardList,
          permissions: [...CONSTRUCTION_ACCESS],
        },
        {
          path: '/construction/civil-works',
          title: 'Civil Works',
          icon: LandPlot,
          permissions: [CONSTRUCTION_PERMISSIONS.VIEW_CIVIL_WORKS],
        },
        {
          path: '/construction/approvals',
          title: 'Approvals',
          icon: ClipboardCheck,
          permissions: [CONSTRUCTION_PERMISSIONS.APPROVE_PROJECT],
        },
      ],
    },
  ],
};
