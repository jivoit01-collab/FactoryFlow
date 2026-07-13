/**
 * Marketplace (Flipkart/Amazon) dispatch module.
 *
 * A simple, scan-driven flow keyed on the marketplace Order ID:
 *   - Outward: pick order → scan FG → confirm → SAP delivery note + internal billing
 *   - Inward: scan returns → submit → internal credit doc
 *   - Masters: SKU→FG mappings, combos (JI sales-BOM), channel→SAP warehouse links
 *   - Reconciliation: outward-vs-inward and portal-vs-physical deviations
 *
 * Sidebar hides the module from users with no `marketplace.*` permission
 * (`modulePrefix`). Operator pages gate on `MARKETPLACE_ACCESS`; masters +
 * reconciliation on `MARKETPLACE_ADMIN_ACCESS`.
 */
import { ShoppingCart } from 'lucide-react';
import { lazy } from 'react';

import {
  MARKETPLACE_ACCESS,
  MARKETPLACE_ADMIN_ACCESS,
  MARKETPLACE_ISSUE_ACCESS,
  MARKETPLACE_MODULE_PREFIX,
  MARKETPLACE_PACKING_ACCESS,
  MARKETPLACE_SHEET_ACCESS,
} from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const MpOverviewPage = lazy(() => import('./pages/MpOverviewPage'));
const MpImportPage = lazy(() => import('./pages/MpImportPage'));
const MpBatchDetailPage = lazy(() => import('./pages/MpBatchDetailPage'));
const MpIssueRequestsPage = lazy(() => import('./pages/MpIssueRequestsPage'));
const MpIssueRequestDetailPage = lazy(() => import('./pages/MpIssueRequestDetailPage'));
const MpPackingPage = lazy(() => import('./pages/MpPackingPage'));
const MpOutwardPage = lazy(() => import('./pages/MpOutwardPage'));
const MpInwardPage = lazy(() => import('./pages/MpInwardPage'));
const MpMastersPage = lazy(() => import('./pages/MpMastersPage'));
const MpReconciliationPage = lazy(() => import('./pages/MpReconciliationPage'));

export const marketplaceModuleConfig: ModuleConfig = {
  name: 'marketplace',
  routes: [
    {
      path: '/marketplace',
      element: <MpOverviewPage />,
      layout: 'main',
      permissions: MARKETPLACE_ACCESS,
      breadcrumb: { label: 'Marketplace' },
    },
    {
      path: '/marketplace/import',
      element: <MpImportPage />,
      layout: 'main',
      permissions: MARKETPLACE_SHEET_ACCESS,
      breadcrumb: { label: 'Import Sheet' },
    },
    {
      path: '/marketplace/batches/:batchId',
      element: <MpBatchDetailPage />,
      layout: 'main',
      permissions: MARKETPLACE_SHEET_ACCESS,
      breadcrumb: { label: 'Batch' },
    },
    {
      path: '/marketplace/issues',
      element: <MpIssueRequestsPage />,
      layout: 'main',
      permissions: MARKETPLACE_ISSUE_ACCESS,
      breadcrumb: { label: 'Warehouse Issues' },
    },
    {
      path: '/marketplace/issues/:issueId',
      element: <MpIssueRequestDetailPage />,
      layout: 'main',
      permissions: MARKETPLACE_ISSUE_ACCESS,
      breadcrumb: { label: 'Issue Request' },
    },
    {
      path: '/marketplace/packing',
      element: <MpPackingPage />,
      layout: 'main',
      permissions: MARKETPLACE_PACKING_ACCESS,
      breadcrumb: { label: 'Packing' },
    },
    {
      path: '/marketplace/outward',
      element: <MpOutwardPage />,
      layout: 'main',
      permissions: MARKETPLACE_ACCESS,
      breadcrumb: { label: 'Outward' },
    },
    {
      path: '/marketplace/inward',
      element: <MpInwardPage />,
      layout: 'main',
      permissions: MARKETPLACE_ACCESS,
      breadcrumb: { label: 'Inward' },
    },
    {
      path: '/marketplace/masters',
      element: <MpMastersPage />,
      layout: 'main',
      permissions: MARKETPLACE_ADMIN_ACCESS,
      breadcrumb: { label: 'Masters' },
    },
    {
      path: '/marketplace/reconciliation',
      element: <MpReconciliationPage />,
      layout: 'main',
      permissions: MARKETPLACE_ADMIN_ACCESS,
      breadcrumb: { label: 'Reconciliation' },
    },
  ],
  navigation: [
    {
      path: '/marketplace',
      title: 'Marketplace',
      icon: ShoppingCart,
      showInSidebar: true,
      modulePrefix: MARKETPLACE_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        { path: '/marketplace', title: 'Overview', permissions: MARKETPLACE_ACCESS },
        { path: '/marketplace/import', title: 'Import Sheet', permissions: MARKETPLACE_SHEET_ACCESS },
        { path: '/marketplace/issues', title: 'Warehouse Issues', permissions: MARKETPLACE_ISSUE_ACCESS },
        { path: '/marketplace/packing', title: 'Packing', permissions: MARKETPLACE_PACKING_ACCESS },
        { path: '/marketplace/outward', title: 'Outward', permissions: MARKETPLACE_ACCESS },
        { path: '/marketplace/inward', title: 'Inward', permissions: MARKETPLACE_ACCESS },
        { path: '/marketplace/masters', title: 'Masters', permissions: MARKETPLACE_ADMIN_ACCESS },
        {
          path: '/marketplace/reconciliation',
          title: 'Reconciliation',
          permissions: MARKETPLACE_ADMIN_ACCESS,
        },
      ],
    },
  ],
};
