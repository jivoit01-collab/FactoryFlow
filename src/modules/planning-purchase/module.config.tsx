/**
 * Planning & Purchase module.
 *
 * Two things, in one place, because they are one decision split across two
 * departments today:
 *
 *   Plans      the monthly production plan SAP holds, phased into days, weeks
 *              and months, against what was actually produced
 *   What runs  how much of it stock on hand actually allows, and what blocks
 *              the rest
 *   Can we run the same question asked the other way round, and NOT tied to a
 *              plan: name the products and quantities you want to make, and be
 *              told whether stock covers it and how much of it can be made
 *   Purchase   that plan exploded through its bill of materials, netted against
 *              stock and open purchase orders, and turned into purchase orders
 *
 * Three read-only boards moved in from Dashboards because planners and buyers
 * are who read them: Sales Plan vs Req., PM Requirement and Stock Benchmark.
 * Their code still lives under `modules/dashboards/` (as Dispatch Plans does
 * under Dispatch), they keep their own rights, and their old `/dashboards/...`
 * addresses forward here -- the stock alert notifications still open the old
 * one with `?search=` on it.
 *
 * The plan is READ from SAP (`OFCT`/`FCT1`, which this factory uses as its
 * monthly production plan). There is no create or edit route for it on purpose:
 * planners author it in SAP, and a second place to change it would mean two
 * answers to "what are we making this month".
 *
 * Purchase orders are ours. Raising, approving and posting to SAP are three
 * separate permissions — posting a purchase order is a commitment to a supplier.
 *
 * Two screens moved in from EXIM: Open POs (every PO line SAP still expects
 * goods against) and Monthly Plan (the planning team's own workbook, uploaded
 * month by month). Each also opens to the EXIM right its users arrived with.
 */
import { ClipboardList } from 'lucide-react';

import {
  DASHBOARDS_PERMISSIONS,
  PLANNING_PURCHASE_ACCESS,
  PLANNING_PURCHASE_PERMISSIONS,
} from '@/config/permissions';
import {
  MONTHLY_PLAN_VIEW_ACCESS,
  OPEN_POS_ACCESS,
} from '@/config/permissions/planning-purchase.permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const PlanListPage = lazy(() => import('./pages/PlanListPage'));
const PlanDetailPage = lazy(() => import('./pages/PlanDetailPage'));
const ProduciblePage = lazy(() => import('./pages/ProduciblePage'));
const WhatCanRunPage = lazy(() => import('./pages/WhatCanRunPage'));
const PurchaseFromPlanPage = lazy(() => import('./pages/PurchaseFromPlanPage'));
const PurchaseOrderListPage = lazy(() => import('./pages/PurchaseOrderListPage'));
const PurchaseOrderDetailPage = lazy(() => import('./pages/PurchaseOrderDetailPage'));
const OpenPosPage = lazy(() => import('./pages/OpenPosPage'));
const MonthlyPlanPage = lazy(() => import('./pages/MonthlyPlanPage'));
const SalesPlanningRequirementDashboardPage = lazy(
  () =>
    import('@/modules/dashboards/sales-planning-requirement/pages/SalesPlanningRequirementDashboardPage'),
);
const PmRequirementDashboardPage = lazy(
  () => import('@/modules/dashboards/pm-requirement/pages/PmRequirementDashboardPage'),
);
const StockLevelDashboardPage = lazy(
  () => import('@/modules/dashboards/stock-level/pages/StockLevelDashboardPage'),
);

/**
 * Who sees the Planning & Purchase menu at all.
 *
 * An explicit list rather than `modulePrefix`, because the sidebar reads a
 * prefix INSTEAD of the list: with `planning_purchase` as the prefix, somebody
 * granted only Stock Benchmark would never see the menu it now sits in. The
 * four `planning_purchase` rights are the whole of that app, so listing them
 * loses nobody who saw the menu before. The two screens from EXIM add their
 * view rights, EXIM's included, so their users find the menu too.
 */
const PLANNING_PURCHASE_MENU_PERMISSIONS: string[] = [
  ...PLANNING_PURCHASE_ACCESS,
  ...OPEN_POS_ACCESS,
  ...MONTHLY_PLAN_VIEW_ACCESS,
  DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
  DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL,
  DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
];

export const planningPurchaseModuleConfig: ModuleConfig = {
  name: 'planning-purchase',
  routes: [
    {
      path: '/planning-purchase',
      element: <PlanListPage />,
      layout: 'main',
      permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Planning & Purchase' },
    },
    {
      path: '/planning-purchase/plans/:planId',
      element: <PlanDetailPage />,
      layout: 'main',
      permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Plan' },
    },
    {
      // Reading what stock allows is a VIEW right: it changes nothing and is the
      // question a shift supervisor asks, not a buyer.
      path: '/planning-purchase/plans/:planId/producible',
      element: <ProduciblePage />,
      layout: 'main',
      permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
      breadcrumb: { label: 'What can run' },
    },
    {
      // Deliberately NOT under /plans/:planId. This question is about the stock
      // in the building, not about a plan, and making somebody pick a plan
      // first would be demanding an input the answer never uses. Still a plain
      // VIEW right: it changes nothing.
      path: '/planning-purchase/what-can-run',
      element: <WhatCanRunPage />,
      layout: 'main',
      permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
      breadcrumb: { label: 'What can we run' },
    },
    {
      // Reading the requirement is a VIEW right; only the order bar needs
      // CREATE_PO, and it hides itself. A planner who cannot buy should still be
      // able to see what the plan will consume.
      path: '/planning-purchase/plans/:planId/purchase',
      element: <PurchaseFromPlanPage />,
      layout: 'main',
      permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Purchase from BOM' },
    },
    {
      path: '/planning-purchase/sales-plan-vs-requirement',
      element: <SalesPlanningRequirementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
      breadcrumb: { label: 'Sales Planning vs Requirement' },
    },
    {
      // The buyer's list: the month's plan exploded through its bills of
      // material, against what the floor has taken, what the stores hold and
      // the stock benchmark they should keep.
      path: '/planning-purchase/pm-requirement',
      element: <PmRequirementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
      breadcrumb: { label: 'PM Requirement' },
    },
    {
      path: '/planning-purchase/stock-benchmark',
      element: <StockLevelDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
      breadcrumb: { label: 'Stock Benchmark' },
    },
    {
      path: '/planning-purchase/purchase-orders',
      element: <PurchaseOrderListPage />,
      layout: 'main',
      permissions: PLANNING_PURCHASE_ACCESS,
      breadcrumb: { label: 'Purchase Orders' },
    },
    {
      path: '/planning-purchase/purchase-orders/:orderId',
      element: <PurchaseOrderDetailPage />,
      layout: 'main',
      permissions: PLANNING_PURCHASE_ACCESS,
      breadcrumb: { label: 'Purchase Order' },
    },
    {
      // SAP's open PO lines, every buyer's. From EXIM, where it was one buyer's.
      path: '/planning-purchase/open-pos',
      element: <OpenPosPage />,
      layout: 'main',
      permissions: OPEN_POS_ACCESS,
      breadcrumb: { label: 'Open POs' },
    },
    {
      // The planning team's workbook; uploading and deleting a version are
      // separate rights, and the page hides those buttons itself.
      path: '/planning-purchase/monthly-plan',
      element: <MonthlyPlanPage />,
      layout: 'main',
      permissions: MONTHLY_PLAN_VIEW_ACCESS,
      breadcrumb: { label: 'Monthly Plan' },
    },
  ],
  navigation: [
    {
      path: '/planning-purchase',
      title: 'Planning & Purchase',
      icon: ClipboardList,
      showInSidebar: true,
      permissions: PLANNING_PURCHASE_MENU_PERMISSIONS,
      hasSubmenu: true,
      children: [
        {
          path: '/planning-purchase',
          title: 'Production Plans',
          permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
        },
        {
          path: '/planning-purchase/monthly-plan',
          title: 'Monthly Plan',
          permissions: MONTHLY_PLAN_VIEW_ACCESS,
        },
        {
          path: '/planning-purchase/what-can-run',
          title: 'What Can We Run',
          permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
        },
        {
          path: '/planning-purchase/sales-plan-vs-requirement',
          title: 'Sales Plan vs Req.',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
        },
        {
          path: '/planning-purchase/pm-requirement',
          title: 'PM Requirement',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
        },
        {
          path: '/planning-purchase/stock-benchmark',
          title: 'Stock Benchmark',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
        },
        {
          path: '/planning-purchase/purchase-orders',
          title: 'Purchase Orders',
          permissions: PLANNING_PURCHASE_ACCESS,
        },
        {
          path: '/planning-purchase/open-pos',
          title: 'Open POs',
          permissions: OPEN_POS_ACCESS,
        },
      ],
    },
  ],
};
