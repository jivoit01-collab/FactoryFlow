import {
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  Package,
  PackageOpen,
  PackagePlus,
  Settings,
  Wrench,
} from 'lucide-react';
import { lazy } from 'react';

import {
  GATE_PERMISSIONS,
  MAINTENANCE_MODULE_PREFIX,
  MAINTENANCE_PERMISSIONS,
  RETURNABLE_MODULE_PREFIX,
  RETURNABLE_PERMISSIONS,
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
const MaintenanceMaterialIndentPage = lazy(() => import('./pages/MaintenanceMaterialIndentPage'));
const MaintenanceWorkOrdersPage = lazy(() => import('./pages/MaintenanceWorkOrdersPage'));
const MaintenanceWorkOrderDetailPage = lazy(() => import('./pages/MaintenanceWorkOrderDetailPage'));
const MaintenanceReturnablePage = lazy(() => import('./pages/MaintenanceReturnablePage'));
const MaintenanceReturnableDetailPage = lazy(
  () => import('./pages/MaintenanceReturnableDetailPage'),
);
const MaintenanceReturnableFormPage = lazy(() => import('./pages/MaintenanceReturnableFormPage'));

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
      path: '/maintenance/material-indents',
      element: <MaintenanceMaterialIndentPage />,
      layout: 'main',
      permissions: [MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT],
      breadcrumb: { label: 'Material Indent' },
    },
    {
      path: '/maintenance/returnable',
      element: <MaintenanceReturnablePage />,
      layout: 'main',
      permissions: [RETURNABLE_PERMISSIONS.VIEW_GATEPASS],
      breadcrumb: { label: 'Returnable / Non-returnable' },
    },
    {
      // Declared before `:passId` so "new" is never read as a pass id.
      path: '/maintenance/returnable/new',
      element: <MaintenanceReturnableFormPage />,
      layout: 'main',
      permissions: [RETURNABLE_PERMISSIONS.MANAGE_GATEPASS],
      breadcrumb: { label: 'New Gate Pass' },
    },
    {
      path: '/maintenance/returnable/:passId/edit',
      element: <MaintenanceReturnableFormPage />,
      layout: 'main',
      permissions: [RETURNABLE_PERMISSIONS.MANAGE_GATEPASS],
      breadcrumb: { label: 'Edit Gate Pass' },
    },
    {
      path: '/maintenance/returnable/:passId',
      element: <MaintenanceReturnableDetailPage />,
      layout: 'main',
      permissions: [RETURNABLE_PERMISSIONS.VIEW_GATEPASS],
      breadcrumb: { label: 'Gate Pass' },
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
        MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
        MAINTENANCE_PERMISSIONS.VIEW_PM,
        MAINTENANCE_PERMISSIONS.VIEW_REPORTS,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
        MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
        MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
        RETURNABLE_PERMISSIONS.VIEW_GATEPASS,
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
      // The module spans two Django apps: `maintenance` and `returnable_items`.
      // A user holding only returnable permissions still needs this menu, or the
      // Returnable / Non-returnable section has nowhere to appear.
      modulePrefix: [MAINTENANCE_MODULE_PREFIX, RETURNABLE_MODULE_PREFIX],
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
          path: '/maintenance/material-indents',
          title: 'Material Indent',
          icon: PackagePlus,
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT],
        },
        {
          path: '/maintenance/returnable',
          title: 'Returnable / Non-returnable',
          icon: PackageOpen,
          permissions: [RETURNABLE_PERMISSIONS.VIEW_GATEPASS],
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
