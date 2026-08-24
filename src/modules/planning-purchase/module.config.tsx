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
 *   Purchase   that plan exploded through its bill of materials, netted against
 *              stock and open purchase orders, and turned into purchase orders
 *
 * The plan is READ from SAP (`OFCT`/`FCT1`, which this factory uses as its
 * monthly production plan). There is no create or edit route for it on purpose:
 * planners author it in SAP, and a second place to change it would mean two
 * answers to "what are we making this month".
 *
 * Purchase orders are ours. Raising, approving and posting to SAP are three
 * separate permissions — posting a purchase order is a commitment to a supplier.
 */
import { ClipboardList } from 'lucide-react';

import {
  PLANNING_PURCHASE_ACCESS,
  PLANNING_PURCHASE_MODULE_PREFIX,
  PLANNING_PURCHASE_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const PlanListPage = lazy(() => import('./pages/PlanListPage'));
const PlanDetailPage = lazy(() => import('./pages/PlanDetailPage'));
const ProduciblePage = lazy(() => import('./pages/ProduciblePage'));
const PurchaseFromPlanPage = lazy(() => import('./pages/PurchaseFromPlanPage'));
const PurchaseOrderListPage = lazy(() => import('./pages/PurchaseOrderListPage'));
const PurchaseOrderDetailPage = lazy(() => import('./pages/PurchaseOrderDetailPage'));

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
  ],
  navigation: [
    {
      path: '/planning-purchase',
      title: 'Planning & Purchase',
      icon: ClipboardList,
      showInSidebar: true,
      modulePrefix: PLANNING_PURCHASE_MODULE_PREFIX,
      permissions: PLANNING_PURCHASE_ACCESS,
      hasSubmenu: true,
      children: [
        {
          path: '/planning-purchase',
          title: 'Production Plans',
          permissions: [PLANNING_PURCHASE_PERMISSIONS.VIEW],
        },
        {
          path: '/planning-purchase/purchase-orders',
          title: 'Purchase Orders',
          permissions: PLANNING_PURCHASE_ACCESS,
        },
      ],
    },
  ],
};
