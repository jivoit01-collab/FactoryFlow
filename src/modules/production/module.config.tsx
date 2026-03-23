import { Factory } from 'lucide-react';
import { lazy } from 'react';

import { EXECUTION_PERMISSIONS, PRODUCTION_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// Lazy load Production Dashboard
const ProductionDashboardPage = lazy(() => import('./pages/ProductionDashboardPage'));

// Lazy load Production Planning pages
const PlanningDashboardPage = lazy(() => import('./planning/pages/PlanningDashboardPage'));
const CreatePlanPage = lazy(() => import('./planning/pages/CreatePlanPage'));
const PlanDetailPage = lazy(() => import('./planning/pages/PlanDetailPage'));
const BulkImportPage = lazy(() => import('./planning/pages/BulkImportPage'));

// Lazy load Production Execution pages
const ExecutionDashboardPage = lazy(() => import('./execution/pages/ExecutionDashboardPage'));
const StartRunPage = lazy(() => import('./execution/pages/StartRunPage'));
const RunDetailPage = lazy(() => import('./execution/pages/RunDetailPage'));
const YieldReportPage = lazy(() => import('./execution/pages/YieldReportPage'));
const LineClearanceListPage = lazy(() => import('./execution/pages/LineClearanceListPage'));
const LineClearanceFormPage = lazy(() => import('./execution/pages/LineClearanceFormPage'));
const MachineChecklistPage = lazy(() => import('./execution/pages/MachineChecklistPage'));
const BreakdownLogPage = lazy(() => import('./execution/pages/BreakdownLogPage'));
const WasteManagementPage = lazy(() => import('./execution/pages/WasteManagementPage'));
const ReportsPage = lazy(() => import('./execution/pages/ReportsPage'));
const DailyProductionReportPage = lazy(
  () => import('./execution/pages/DailyProductionReportPage'),
);
const ResourceTrackingPage = lazy(() => import('./execution/pages/ResourceTrackingPage'));
// QC moved to /qc/production module — redirect component
const QCRedirectPage = lazy(() => import('./execution/pages/QCRedirectPage'));
const MasterDataPage = lazy(() => import('./execution/pages/MasterDataPage'));

export const productionModuleConfig: ModuleConfig = {
  name: 'production',
  routes: [
    // ---- Production Dashboard ----
    {
      path: '/production',
      element: <ProductionDashboardPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
    },
    // ---- Planning ----
    {
      path: '/production/planning',
      element: <PlanningDashboardPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
    },
    {
      path: '/production/planning/create',
      element: <CreatePlanPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.CREATE_PLAN],
    },
    {
      path: '/production/planning/bulk-import',
      element: <BulkImportPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.CREATE_PLAN],
    },
    {
      path: '/production/planning/:planId',
      element: <PlanDetailPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
    },
    {
      path: '/production/planning/:planId/edit',
      element: <CreatePlanPage />,
      layout: 'main',
      permissions: [PRODUCTION_PERMISSIONS.EDIT_PLAN],
    },
    // ---- Execution ----
    {
      path: '/production/execution',
      element: <ExecutionDashboardPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_RUN],
    },
    {
      path: '/production/execution/start-run',
      element: <StartRunPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.CREATE_RUN],
    },
    {
      path: '/production/execution/runs/:runId',
      element: <RunDetailPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_RUN],
    },
    {
      path: '/production/execution/runs/:runId/yield',
      element: <YieldReportPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_MATERIAL],
    },
    {
      path: '/production/execution/runs/:runId/breakdowns',
      element: <BreakdownLogPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_BREAKDOWN],
    },
    {
      path: '/production/execution/runs/:runId/resources',
      element: <ResourceTrackingPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.CREATE_MATERIAL],
    },
    {
      path: '/production/execution/runs/:runId/qc',
      element: <QCRedirectPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_RUN],
    },
    {
      path: '/production/execution/line-clearance',
      element: <LineClearanceListPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_CLEARANCE],
    },
    {
      path: '/production/execution/line-clearance/create',
      element: <LineClearanceFormPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.CREATE_CLEARANCE],
    },
    {
      path: '/production/execution/line-clearance/:clearanceId',
      element: <LineClearanceFormPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_CLEARANCE],
    },
    {
      path: '/production/execution/machine-checklists',
      element: <MachineChecklistPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_CHECKLIST],
    },
    {
      path: '/production/execution/breakdowns',
      element: <BreakdownLogPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_BREAKDOWN],
    },
    {
      path: '/production/execution/waste',
      element: <WasteManagementPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_WASTE],
    },
    {
      path: '/production/execution/reports',
      element: <ReportsPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_REPORTS],
    },
    {
      path: '/production/execution/reports/daily',
      element: <DailyProductionReportPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.VIEW_REPORTS],
    },
    {
      path: '/production/execution/master-data',
      element: <MasterDataPage />,
      layout: 'main',
      permissions: [EXECUTION_PERMISSIONS.MANAGE_LINES],
    },
  ],
  navigation: [
    {
      path: '/production',
      title: 'Production',
      icon: Factory,
      showInSidebar: true,
      permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
      hasSubmenu: true,
      children: [
        {
          path: '/production/execution',
          title: 'Execution',
          permissions: [EXECUTION_PERMISSIONS.VIEW_RUN],
        },
        {
          path: '/production/execution/line-clearance',
          title: 'Line Clearance',
          permissions: [EXECUTION_PERMISSIONS.VIEW_CLEARANCE],
        },
        {
          path: '/production/execution/waste',
          title: 'Waste Management',
          permissions: [EXECUTION_PERMISSIONS.VIEW_WASTE],
        },
        {
          path: '/production/execution/reports',
          title: 'Reports',
          permissions: [EXECUTION_PERMISSIONS.VIEW_REPORTS],
        },
        {
          path: '/production/execution/master-data',
          title: 'Master Data',
          permissions: [EXECUTION_PERMISSIONS.MANAGE_LINES],
        },
      ],
    },
  ],
};
