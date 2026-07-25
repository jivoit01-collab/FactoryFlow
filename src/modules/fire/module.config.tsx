import { BadgeIndianRupee, ClipboardCheck, Flame, HardHat, ShieldCheck } from 'lucide-react';
import { lazy } from 'react';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// The Fire module reuses the page components that still live in the maintenance
// module folder — only the routing/navigation moves here. Permissions are the
// existing maintenance.* codenames (no re-granting needed).
const FireHubPage = lazy(() => import('./pages/FireHubPage'));
const StoreFirePage = lazy(() => import('@/modules/maintenance/pages/MaintenanceFirePage'));
const FireReportsPage = lazy(() => import('@/modules/maintenance/pages/MaintenanceFireReportsPage'));
const FireEquipmentPage = lazy(() => import('@/modules/maintenance/pages/MaintenanceFireIssuePage'));
const WorkPermitsPage = lazy(() => import('@/modules/maintenance/pages/MaintenanceWorkPermitsPage'));
const SafetyFinePage = lazy(() => import('@/modules/maintenance/pages/MaintenanceSafetyFinePage'));

// Any of these means the user can reach the Fire module landing.
const FIRE_ANY = [
  MAINTENANCE_PERMISSIONS.VIEW_FIRE,
  MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT,
  MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE,
  MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT,
  MAINTENANCE_PERMISSIONS.VIEW_SAFETY_FINE,
];

export const fireModuleConfig: ModuleConfig = {
  name: 'fire',
  routes: [
    {
      path: '/fire/store',
      element: <StoreFirePage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE],
      breadcrumb: { label: 'Store / Fire' },
    },
    {
      path: '/fire/reports',
      element: <FireReportsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT],
      breadcrumb: { label: 'Fire Reports' },
    },
    {
      path: '/fire/equipment',
      element: <FireEquipmentPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE],
      breadcrumb: { label: 'Fire Equipment Issue / Return' },
    },
    {
      path: '/fire/work-permits',
      element: <WorkPermitsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT],
      breadcrumb: { label: 'Work Permits' },
    },
    {
      path: '/fire/safety-fines',
      element: <SafetyFinePage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_SAFETY_FINE],
      breadcrumb: { label: 'Safety Fines' },
    },
    {
      // Module landing — reachable with any Fire section permission.
      path: '/fire',
      element: <FireHubPage />,
      layout: 'main',
      permissions: FIRE_ANY,
      breadcrumb: { label: 'Fire' },
    },
  ],
  navigation: [
    {
      path: '/fire',
      title: 'Fire',
      icon: Flame,
      showInSidebar: true,
      hasSubmenu: true,
      // Precise gating on the existing fire-section view permissions.
      permissions: FIRE_ANY,
      children: [
        {
          path: '/fire/store',
          title: 'Store / Fire',
          icon: Flame,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE],
        },
        {
          path: '/fire/reports',
          title: 'Fire Reports',
          icon: ClipboardCheck,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT],
        },
        {
          path: '/fire/equipment',
          title: 'Fire Equipment Issue / Return',
          icon: HardHat,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE],
        },
        {
          path: '/fire/work-permits',
          title: 'Work Permits',
          icon: ShieldCheck,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT],
        },
        {
          path: '/fire/safety-fines',
          title: 'Safety Fines',
          icon: BadgeIndianRupee,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_SAFETY_FINE],
        },
      ],
    },
  ],
};
