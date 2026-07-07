import {
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  Flame,
  HardHat,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { lazy } from 'react';

import {
  GATE_PERMISSIONS,
  MAINTENANCE_MODULE_PREFIX,
  MAINTENANCE_PERMISSIONS,
} from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const MaintenanceHubPage = lazy(() => import('./pages/MaintenanceHubPage'));
const MaintenanceDashboardPage = lazy(() => import('./pages/MaintenanceDashboardPage'));
const MaintenanceAssetsPage = lazy(() => import('./pages/MaintenanceAssetsPage'));
const MaintenanceAssetDetailPage = lazy(() => import('./pages/MaintenanceAssetDetailPage'));
const MaintenanceAutomationPage = lazy(() => import('./pages/MaintenanceAutomationPage'));
const MaintenanceMastersPage = lazy(() => import('./pages/MaintenanceMastersPage'));
const MaintenancePMPage = lazy(() => import('./pages/MaintenancePMPage'));
const MaintenanceReportsPage = lazy(() => import('./pages/MaintenanceReportsPage'));
const MaintenanceSparesPage = lazy(() => import('./pages/MaintenanceSparesPage'));
const MaintenanceFirePage = lazy(() => import('./pages/MaintenanceFirePage'));
const MaintenanceFireReportsPage = lazy(() => import('./pages/MaintenanceFireReportsPage'));
const MaintenanceFireIssuePage = lazy(() => import('./pages/MaintenanceFireIssuePage'));
const MaintenanceWorkPermitsPage = lazy(() => import('./pages/MaintenanceWorkPermitsPage'));
const MaintenanceWorkOrdersPage = lazy(() => import('./pages/MaintenanceWorkOrdersPage'));
const MaintenanceWorkOrderDetailPage = lazy(() => import('./pages/MaintenanceWorkOrderDetailPage'));

export const maintenanceModuleConfig: ModuleConfig = {
  name: 'maintenance',
  routes: [
    {
      path: '/maintenance/dashboard',
      element: <MaintenanceDashboardPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
      breadcrumb: { label: 'Dashboard' },
    },
    {
      path: '/maintenance/assets',
      element: <MaintenanceAssetsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
      breadcrumb: { label: 'Assets' },
    },
    {
      path: '/maintenance/assets/:assetId',
      element: <MaintenanceAssetDetailPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
      breadcrumb: { label: 'Asset' },
    },
    {
      path: '/maintenance/work-orders',
      element: <MaintenanceWorkOrdersPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
      breadcrumb: { label: 'Work Orders' },
    },
    {
      path: '/maintenance/work-orders/:workOrderId',
      element: <MaintenanceWorkOrderDetailPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
      breadcrumb: { label: 'Work Order' },
    },
    {
      path: '/maintenance/spares',
      element: <MaintenanceSparesPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_SPARE],
      breadcrumb: { label: 'Store / Spares' },
    },
    {
      path: '/maintenance/fire',
      element: <MaintenanceFirePage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE],
      breadcrumb: { label: 'Store / Fire' },
    },
    {
      path: '/maintenance/fire-reports',
      element: <MaintenanceFireReportsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT],
      breadcrumb: { label: 'Fire Reports' },
    },
    {
      path: '/maintenance/fire-issue',
      element: <MaintenanceFireIssuePage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE],
      breadcrumb: { label: 'Fire Equipment Issue / Return' },
    },
    {
      path: '/maintenance/work-permits',
      element: <MaintenanceWorkPermitsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT],
      breadcrumb: { label: 'Work Permits' },
    },
    {
      path: '/maintenance/pm',
      element: <MaintenancePMPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_PM],
      breadcrumb: { label: 'PM / Checklist' },
    },
    {
      path: '/maintenance/reports',
      element: <MaintenanceReportsPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_REPORTS],
      breadcrumb: { label: 'Reports' },
    },
    {
      path: '/maintenance/automation',
      element: <MaintenanceAutomationPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_MODULE],
      breadcrumb: { label: 'Automation' },
    },
    {
      path: '/maintenance/masters',
      element: <MaintenanceMastersPage />,
      layout: 'main',
      permissions: [
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
        MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
      ],
      breadcrumb: { label: 'Masters' },
    },
    {
      // Module landing: a card hub of sub-modules, each shown only if the user
      // has access. Gated with any-of every sub-module view permission so anyone
      // with any Maintenance access can reach it.
      path: '/maintenance',
      element: <MaintenanceHubPage />,
      layout: 'main',
      permissions: [
        MAINTENANCE_PERMISSIONS.VIEW_MODULE,
        MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET,
        MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER,
        MAINTENANCE_PERMISSIONS.VIEW_SPARE,
        MAINTENANCE_PERMISSIONS.VIEW_FIRE,
        MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT,
        MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE,
        MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT,
        MAINTENANCE_PERMISSIONS.VIEW_PM,
        MAINTENANCE_PERMISSIONS.VIEW_REPORTS,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
        MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
      ],
      breadcrumb: { label: 'Maintenance' },
    },
  ],
  navigation: [
    {
      path: '/maintenance',
      title: 'Maintenance',
      icon: Wrench,
      showInSidebar: true,
      modulePrefix: MAINTENANCE_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        {
          path: '/maintenance/dashboard',
          title: 'Dashboard',
          icon: LayoutDashboard,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
        },
        {
          path: '/maintenance/assets',
          title: 'Assets',
          icon: Factory,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
        },
        {
          path: '/maintenance/work-orders',
          title: 'Work Orders',
          icon: ClipboardList,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
        },
        {
          path: '/maintenance/spares',
          title: 'Store / Spares',
          icon: Boxes,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_SPARE],
        },
        {
          path: '/maintenance/fire',
          title: 'Store / Fire',
          icon: Flame,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE],
        },
        {
          path: '/maintenance/fire-reports',
          title: 'Fire Reports',
          icon: ClipboardCheck,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT],
        },
        {
          path: '/maintenance/fire-issue',
          title: 'Fire Equipment Issue / Return',
          icon: HardHat,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE],
        },
        {
          path: '/maintenance/work-permits',
          title: 'Work Permits',
          icon: ShieldCheck,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT],
        },
        {
          path: '/maintenance/pm',
          title: 'PM / Checklist',
          icon: CalendarCheck,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_PM],
        },
        {
          path: '/maintenance/reports',
          title: 'Reports',
          icon: BarChart3,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_REPORTS],
        },
        {
          path: '/maintenance/automation',
          title: 'Automation',
          icon: Bell,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_MODULE],
        },
        {
          path: '/maintenance/masters',
          title: 'Masters',
          icon: Settings,
          permissions: [
            MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
            MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
            MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
            MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
          ],
        },
        {
          path: '/gate/maintenance',
          title: 'Gate Material In',
          icon: Package,
          permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
        },
        {
          path: '/gate/repair-parts-out',
          title: 'Repair Movement',
          icon: FileText,
          permissions: [
            GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW,
            GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE,
          ],
        },
      ],
    },
  ],
};
