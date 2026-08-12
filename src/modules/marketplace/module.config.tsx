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

import {
  MARKETPLACE_ACCESS,
  MARKETPLACE_ADMIN_ACCESS,
  MARKETPLACE_COMPANIES,
  MARKETPLACE_GATE_ACCESS,
  MARKETPLACE_ISSUE_ACCESS,
  MARKETPLACE_MODULE_PREFIX,
  MARKETPLACE_SHEET_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const MpOverviewPage = lazy(() => import('./pages/MpOverviewPage'));
const MpImportPage = lazy(() => import('./pages/MpImportPage'));
const MpBatchDetailPage = lazy(() => import('./pages/MpBatchDetailPage'));
const MpIssueRequestsPage = lazy(() => import('./pages/MpIssueRequestsPage'));
const MpIssueRequestDetailPage = lazy(() => import('./pages/MpIssueRequestDetailPage'));
const MpOutwardPage = lazy(() => import('./pages/MpOutwardPage'));
const MpDeliveryNotesPage = lazy(() => import('./pages/MpDeliveryNotesPage'));
const MpInwardPage = lazy(() => import('./pages/MpInwardPage'));
const MpMastersPage = lazy(() => import('./pages/MpMastersPage'));
const MpReconciliationPage = lazy(() => import('./pages/MpReconciliationPage'));
const MpGatePage = lazy(() => import('./pages/MpGatePage'));
const MpGatePassPage = lazy(() => import('./pages/MpGatePassPage'));
const MpReportsPage = lazy(() => import('./pages/MpReportsPage'));
const MpSettingsPage = lazy(() => import('./pages/MpSettingsPage'));

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
      path: '/marketplace/outward',
      element: <MpOutwardPage />,
      layout: 'main',
      permissions: MARKETPLACE_ACCESS,
      breadcrumb: { label: 'Outward' },
    },
    {
      path: '/marketplace/delivery-notes',
      element: <MpDeliveryNotesPage />,
      layout: 'main',
      permissions: MARKETPLACE_ACCESS,
      breadcrumb: { label: 'SAP Delivery Notes' },
    },
    {
      path: '/marketplace/gate',
      element: <MpGatePage />,
      layout: 'main',
      permissions: MARKETPLACE_GATE_ACCESS,
      breadcrumb: { label: 'Gate' },
    },
    {
      // Reached from the Gate page the moment a sheet is approved — the truck is
      // at the gate and the parcels are cleared, so this is the next thing done.
      path: '/marketplace/gate/:batchId/send-out',
      element: <MpGatePassPage />,
      layout: 'main',
      permissions: MARKETPLACE_GATE_ACCESS,
      breadcrumb: { label: 'Send out' },
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
    {
      path: '/marketplace/reports',
      element: <MpReportsPage />,
      layout: 'main',
      permissions: MARKETPLACE_ACCESS,
      breadcrumb: { label: 'Reports' },
    },
    {
      path: '/marketplace/settings',
      element: <MpSettingsPage />,
      layout: 'main',
      permissions: MARKETPLACE_ADMIN_ACCESS,
      breadcrumb: { label: 'Settings' },
    },
  ],
  navigation: [
    {
      path: '/marketplace',
      title: 'Marketplace',
      icon: ShoppingCart,
      showInSidebar: true,
      modulePrefix: MARKETPLACE_MODULE_PREFIX,
      companies: MARKETPLACE_COMPANIES,
      hasSubmenu: true,
      children: [
        { path: '/marketplace', title: 'Overview', permissions: MARKETPLACE_ACCESS },
        { path: '/marketplace/import', title: 'Import Sheet', permissions: MARKETPLACE_SHEET_ACCESS },
        { path: '/marketplace/issues', title: 'Warehouse Issues', permissions: MARKETPLACE_ISSUE_ACCESS },
        { path: '/marketplace/outward', title: 'Outward', permissions: MARKETPLACE_ACCESS },
        {
          path: '/marketplace/delivery-notes',
          title: 'SAP Delivery Notes',
          permissions: MARKETPLACE_ACCESS,
        },
        { path: '/marketplace/gate', title: 'Gate', permissions: MARKETPLACE_GATE_ACCESS },
        { path: '/marketplace/inward', title: 'Inward', permissions: MARKETPLACE_ACCESS },
        { path: '/marketplace/masters', title: 'Masters', permissions: MARKETPLACE_ADMIN_ACCESS },
        {
          path: '/marketplace/reconciliation',
          title: 'Reconciliation',
          permissions: MARKETPLACE_ADMIN_ACCESS,
        },
        { path: '/marketplace/reports', title: 'Reports', permissions: MARKETPLACE_ACCESS },
        { path: '/marketplace/settings', title: 'Settings', permissions: MARKETPLACE_ADMIN_ACCESS },
      ],
    },
  ],
};
