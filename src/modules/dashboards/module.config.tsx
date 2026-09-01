import { BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import {
  BLOWING_PERMISSIONS,
  DASHBOARDS_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  GATE_PERMISSIONS,
  SAP_REPORTS_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { GATE_DASHBOARD_VIEW_PERMISSIONS } from './gate/constants/gate-dashboard.constants';

const DashboardsLandingPage = lazy(() => import('./pages/DashboardsLandingPage'));
const ExecutiveOverviewPage = lazy(() => import('./overview/pages/ExecutiveOverviewPage'));
const GateDashboardPage = lazy(() => import('./gate/pages/GateDashboardPage'));
const ProductionDashboardPage = lazy(() => import('./production/pages/ProductionDashboardPage'));
const BlowingDashboardPage = lazy(() => import('./blowing/pages/BlowingDashboardPage'));
const StockLevelDashboardPage = lazy(
  () => import('./stock-level/pages/StockLevelDashboardPage'),
);
const NonMovingDashboardPage = lazy(
  () => import('./non-moving/pages/NonMovingDashboardPage'),
);
const SalesPlanningRequirementDashboardPage = lazy(
  () => import('./sales-planning-requirement/pages/SalesPlanningRequirementDashboardPage'),
);
const ProductionMovementDashboardPage = lazy(
  () => import('./production-movement/pages/ProductionMovementDashboardPage'),
);
const DispatchDayDashboardPage = lazy(
  () => import('./dispatch/pages/DispatchDayDashboardPage'),
);
const DispatchPipelineDashboardPage = lazy(
  () => import('./dispatch-pipeline/pages/DispatchPipelineDashboardPage'),
);
const DispatchFulfilmentDashboardPage = lazy(
  () => import('./dispatch-fulfilment/pages/DispatchFulfilmentDashboardPage'),
);
const DispatchTrackingDashboardPage = lazy(
  () => import('./dispatch-tracking/pages/DispatchTrackingDashboardPage'),
);
const FactoryExpenseWallPage = lazy(
  () => import('./factory-expense/pages/FactoryExpenseWallPage'),
);
const FactoryExpenseConfigPage = lazy(
  () => import('./factory-expense/pages/FactoryExpenseConfigPage'),
);
export const dashboardsModuleConfig: ModuleConfig = {
  name: 'dashboards',
  routes: [
    {
      path: '/dashboards',
      element: <DashboardsLandingPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
        DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
        DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
        BLOWING_PERMISSIONS.VIEW_REPORTS,
      ],
    },
    {
      path: '/dashboards/overview',
      element: <ExecutiveOverviewPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
        DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
        DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
      ],
      breadcrumb: { label: 'Command Centre' },
    },
    {
      path: '/dashboards/gate',
      element: <GateDashboardPage />,
      layout: 'main',
      permissions: GATE_DASHBOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Gate' },
    },
    {
      path: '/dashboards/production',
      element: <ProductionDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
      breadcrumb: { label: 'Production' },
    },
    {
      path: '/dashboards/blowing',
      element: <BlowingDashboardPage />,
      layout: 'main',
      permissions: [BLOWING_PERMISSIONS.VIEW_REPORTS],
      breadcrumb: { label: 'Blowing' },
    },
    {
      path: '/dashboards/stock-levels',
      element: <StockLevelDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
      breadcrumb: { label: 'Stock Benchmark' },
    },
    {
      path: '/dashboards/non-moving',
      element: <NonMovingDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
      breadcrumb: { label: 'Non-Moving' },
    },
    {
      path: '/dashboards/sales-planning-requirement',
      element: <SalesPlanningRequirementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
      breadcrumb: { label: 'Sales Planning vs Requirement' },
    },
    {
      path: '/dashboards/production-movement',
      element: <ProductionMovementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
      breadcrumb: { label: 'Production Movement' },
    },
    {
      // The wall board. Route sits first among the dispatch entries because it
      // is the one an admin opens and leaves running.
      path: '/dashboards/dispatch',
      element: <DispatchDayDashboardPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        // The vendor / company / vehicle panels read the docking register, so
        // gate staff who only hold that permission can open the board too.
        GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
      ],
      breadcrumb: { label: 'Dispatch' },
    },
    {
      path: '/dashboards/dispatch-plans',
      element: <Navigate to="/dispatch/plans" replace />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS],
      breadcrumb: { label: 'Dispatch Plans' },
    },
    {
      path: '/dashboards/dispatch-pipeline',
      element: <DispatchPipelineDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE],
      breadcrumb: { label: 'Dispatch Pipeline' },
    },
    {
      path: '/dashboards/dispatch-fulfilment',
      element: <DispatchFulfilmentDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS],
      breadcrumb: { label: 'Dispatch Fulfilment' },
    },
    {
      // The expense wall. Sits with the dispatch board because they are the two
      // screens that live on a wall rather than a desk.
      path: '/dashboards/factory-expense',
      element: <FactoryExpenseWallPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
        DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
      ],
      breadcrumb: { label: 'Factory Expense' },
    },
    {
      path: '/dashboards/factory-expense/config',
      element: <FactoryExpenseConfigPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE],
      breadcrumb: { label: 'Configuration' },
    },
    {
      path: '/dashboards/dispatch-tracking',
      element: <DispatchTrackingDashboardPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW],
      breadcrumb: { label: 'Dispatch Tracking' },
    },
  ],
  navigation: [
    {
      path: '/dashboards',
      title: 'Dashboards',
      icon: BarChart3,
      showInSidebar: true,
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
        DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
        // Production reports permission — lets production staff reach the
        // Dashboards menu for the company-aware Production dashboard.
        DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
        DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW,
        // Gate dashboard lives here too — let gate staff reach the Dashboards menu.
        ...GATE_DASHBOARD_VIEW_PERMISSIONS,
        // Blowing dashboard lives here too — let blowing staff reach the menu.
        BLOWING_PERMISSIONS.VIEW_REPORTS,
        // SAP Reports lives here too — a user with only report access still
        // needs the group to appear.
        ...SAP_REPORTS_ACCESS,
        // Factory Expense wall — an admin who only holds this must still be
        // able to reach the Dashboards menu.
        DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
        DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
      ],
      hasSubmenu: true,
      // Dispatch Tracking dashboard lives here too — let tracking staff reach the menu.
      // (appended after the shared list so it doesn't disturb existing entries)
      children: [
        {
          path: '/dashboards/overview',
          title: 'Command Centre',
          permissions: [
            DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
            DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
            DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
            DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
            DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
          ],
        },
        {
          path: '/dashboards/gate',
          title: 'Gate',
          permissions: GATE_DASHBOARD_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/production',
          title: 'Production',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
        },
        {
          path: '/dashboards/blowing',
          title: 'Blowing',
          permissions: [BLOWING_PERMISSIONS.VIEW_REPORTS],
        },
        {
          path: '/dashboards/stock-levels',
          title: 'Stock Benchmark',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
        },
        {
          path: '/dashboards/non-moving',
          title: 'Non-Moving',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
        },
        {
          path: '/dashboards/sales-planning-requirement',
          title: 'Sales Plan vs Req.',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
        },
        {
          path: '/dashboards/production-movement',
          title: 'Production Movement',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
        },
        {
          path: '/dashboards/dispatch',
          title: 'Dispatch',
          permissions: [
            DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
            DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
            GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
          ],
        },
        {
          path: '/dashboards/factory-expense',
          title: 'Factory Expense',
          permissions: [
            DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
            DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
          ],
        },
        {
          path: '/dashboards/dispatch-pipeline',
          title: 'Dispatch Pipeline',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE],
        },
        {
          path: '/dashboards/dispatch-fulfilment',
          title: 'Dispatch Fulfilment',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS],
        },
        {
          path: '/dashboards/dispatch-tracking',
          title: 'Dispatch Tracking',
          permissions: [DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW],
        },
        {
          // Routes for this one are owned by the sap-reports module; only the
          // sidebar entry lives here. Same split the gate module uses for
          // Marketplace Gate.
          path: '/dashboards/sap-reports',
          title: 'SAP Reports',
          permissions: SAP_REPORTS_ACCESS,
        },
      ],
    },
  ],
};
