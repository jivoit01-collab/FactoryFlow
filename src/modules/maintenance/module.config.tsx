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
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';

import { COMPANY_CODES } from '@/config/constants';
import {
  GATE_PERMISSIONS,
  MAINTENANCE_MODULE_PREFIX,
  MAINTENANCE_PERMISSIONS,
  RETURNABLE_MODULE_PREFIX,
  RETURNABLE_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleRoute } from '@/core/types';

/** Maintenance is only rolled out for the Jivo Oil unit. */
const MAINTENANCE_COMPANIES = [COMPANY_CODES.JIVO_OIL] as const;

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
const MaintenanceDailyElectricityPage = lazy(
  () => import('./pages/MaintenanceDailyElectricityPage'),
);
const MaintenanceDailyWastagePage = lazy(() => import('./pages/MaintenanceDailyWastagePage'));

const maintenanceRoutes: ModuleRoute[] = [
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
    path: '/maintenance/daily-electricity',
    element: <MaintenanceDailyElectricityPage />,
    layout: 'main',
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
      MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY,
    ],
    breadcrumb: { label: 'Daily Electricity' },
  },
  {
    path: '/maintenance/daily-wastage',
    element: <MaintenanceDailyWastagePage />,
    layout: 'main',
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_WASTAGE,
      MAINTENANCE_PERMISSIONS.MANAGE_DAILY_WASTAGE,
    ],
    breadcrumb: { label: 'Daily Wastage' },
  },
  {
    path: '/maintenance/automation',
    element: <MaintenanceAutomationPage />,
    layout: 'main',
    // Alerts data requires dashboard access (backend MaintenanceAlertsAPI →
    // CanViewMaintenanceDashboard); gate the page to match, so module-only
    // roles don't see an Automation page whose data 403s.
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
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
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
      MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY,
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_WASTAGE,
      MAINTENANCE_PERMISSIONS.MANAGE_DAILY_WASTAGE,
    ],
    breadcrumb: { label: 'Maintenance' },
  },
];

export const maintenanceModuleConfig: ModuleConfig = {
  name: 'maintenance',
  // Applied to every route, not just the sidebar entry, so a direct URL from
  // another company unit lands on /unauthorized instead of rendering.
  routes: maintenanceRoutes.map((route) => ({ ...route, companies: MAINTENANCE_COMPANIES })),
  navigation: [
    {
      path: '/maintenance',
      title: 'Maintenance',
      icon: Wrench,
      showInSidebar: true,
      companies: MAINTENANCE_COMPANIES,
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
          path: '/maintenance/daily-electricity',
          title: 'Daily Electricity',
          icon: Zap,
          permissions: [
            MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
            MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY,
          ],
        },
        {
          path: '/maintenance/daily-wastage',
          title: 'Daily Wastage',
          icon: Trash2,
          permissions: [
            MAINTENANCE_PERMISSIONS.VIEW_DAILY_WASTAGE,
            MAINTENANCE_PERMISSIONS.MANAGE_DAILY_WASTAGE,
          ],
        },
        {
          path: '/maintenance/automation',
          title: 'Automation',
          icon: Bell,
          // Matches the route + backend alerts endpoint (dashboard access).
          permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
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
