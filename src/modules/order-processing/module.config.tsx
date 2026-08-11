/**
 * Order Processing module.
 *
 * The orchestration layer between OMS and SAP: orders are mirrored from OMS,
 * checked against SAP stock, and whatever stock cannot cover becomes a production
 * requirement, then a material requirement, then something to buy.
 *
 * A module rather than a dashboard because it holds state and makes decisions —
 * nothing under `dashboards/` writes.
 */
import { ClipboardList } from 'lucide-react';

import {
  ORDER_PROCESSING_ACCESS,
  ORDER_PROCESSING_MODULE_PREFIX,
  ORDER_PROCESSING_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const DashboardPage = lazy(() => import('./pages/OrderProcessingDashboardPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const PlanningPage = lazy(() => import('./pages/PlanningPage'));

export const orderProcessingModuleConfig: ModuleConfig = {
  name: 'order-processing',
  routes: [
    {
      path: '/order-processing',
      element: <DashboardPage />,
      layout: 'main',
      permissions: [ORDER_PROCESSING_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Order Processing' },
    },
    {
      path: '/order-processing/orders',
      element: <OrdersPage />,
      layout: 'main',
      permissions: [ORDER_PROCESSING_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Orders' },
    },
    {
      path: '/order-processing/orders/:orderId',
      element: <OrderDetailPage />,
      layout: 'main',
      permissions: [ORDER_PROCESSING_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Order' },
    },
    {
      path: '/order-processing/planning',
      element: <PlanningPage />,
      layout: 'main',
      permissions: [ORDER_PROCESSING_PERMISSIONS.VIEW],
      breadcrumb: { label: 'Planning' },
    },
  ],
  navigation: [
    {
      path: '/order-processing',
      title: 'Order Processing',
      icon: ClipboardList,
      showInSidebar: true,
      modulePrefix: ORDER_PROCESSING_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        { path: '/order-processing', title: 'Overview', permissions: ORDER_PROCESSING_ACCESS },
        { path: '/order-processing/orders', title: 'Orders', permissions: ORDER_PROCESSING_ACCESS },
        { path: '/order-processing/planning', title: 'Planning', permissions: ORDER_PROCESSING_ACCESS },
      ],
    },
  ],
};
