import { BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import {
  BLOWING_PERMISSIONS,
  DASHBOARDS_PERMISSIONS,
  DISPATCH_PERMISSIONS,
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
const SupplyChainDashboardPage = lazy(
  () => import('./supply-chain/pages/SupplyChainDashboardPage'),
);
const ProductionMovementDashboardPage = lazy(
  () => import('./production-movement/pages/ProductionMovementDashboardPage'),
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
      path: '/dashboards/supply-chain',
      element: <SupplyChainDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_SUPPLY_CHAIN],
      breadcrumb: { label: 'Smart Supply Chain' },
    },
    {
      path: '/dashboards/production-movement',
      element: <ProductionMovementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
      breadcrumb: { label: 'Production Movement' },
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
          path: '/dashboards/supply-chain',
          title: 'Smart Supply Chain',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_SUPPLY_CHAIN],
        },
        {
          path: '/dashboards/production-movement',
          title: 'Production Movement',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
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
      ],
    },
  ],
};
