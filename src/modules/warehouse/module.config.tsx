import { Warehouse } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import {
  DISPATCH_PERMISSIONS,
  GATE_PERMISSIONS,
  GRPO_PERMISSIONS,
  OMS_PERMISSIONS,
  WAREHOUSE_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { grpoNavChildren, grpoRoutes } from './grpo/module.config';
import { invoiceApprovalNavChildren, invoiceApprovalRoutes } from './invoice-approval/module.config';
import { LegacyBillSummaryRedirect } from './pages/billSummary/LegacyBillSummaryRedirect';

const WarehouseDashboardPage = lazy(() => import('./pages/WarehouseDashboardPage'));
const BillSummaryListPage = lazy(() => import('./pages/billSummary/BillSummaryListPage'));
const BillSummaryNewPage = lazy(() => import('./pages/billSummary/BillSummaryNewPage'));
const BillSummaryDetailPage = lazy(
  () => import('./pages/billSummary/BillSummaryDetailPage'),
);

// The bill summary is warehouse work — the floor picks against it — but its
// permissions still name the Django app the backend lives in (`dispatch_plans`),
// which is where the dispatch plan it reads from lives too.
const billSummaryViewPermissions = [
  DISPATCH_PERMISSIONS.VIEW_BILL_SUMMARY,
  DISPATCH_PERMISSIONS.CREATE_BILL_SUMMARY,
  DISPATCH_PERMISSIONS.PICK_BILL_SUMMARY,
] as const;
const BOMRequestListPage = lazy(() => import('./pages/BOMRequestListPage'));
const BOMRequestDetailPage = lazy(() => import('./pages/BOMRequestDetailPage'));
const FGReceiptListPage = lazy(() => import('./pages/FGReceiptListPage'));

// BST (Branch Stock Transfer) Pages
const BSTDashboardPage = lazy(() => import('./pages/bst/BSTDashboardPage'));
const BSTNewPage = lazy(() => import('./pages/bst/BSTNewPage'));
const BSTScanPage = lazy(() => import('./pages/bst/BSTScanPage'));
const BSTReviewPage = lazy(() => import('./pages/bst/BSTReviewPage'));
const BSTDetailPage = lazy(() => import('./pages/bst/BSTDetailPage'));
const BSTReceivePage = lazy(() => import('./pages/bst/BSTReceivePage'));
const BSTPartialApprovalsPage = lazy(() => import('./pages/bst/BSTPartialApprovalsPage'));

// Warehouse Transfer Requests — raise → approve → post to SAP → BST
const TransferRequestListPage = lazy(() => import('./pages/transfer/TransferRequestListPage'));
const TransferRequestNewPage = lazy(() => import('./pages/transfer/TransferRequestNewPage'));
const TransferRequestDetailPage = lazy(() => import('./pages/transfer/TransferRequestDetailPage'));

// Dispatch Loading — scan pallets against a docked truck's bills, freeing map bins
const DispatchLoadingListPage = lazy(() => import('./pages/dispatch-loading/DispatchLoadingListPage'));
const DispatchLoadingScanPage = lazy(() => import('./pages/dispatch-loading/DispatchLoadingScanPage'));
const DispatchLoadingPrepScanPage = lazy(
  () => import('./pages/dispatch-loading/DispatchLoadingPrepScanPage'),
);

export const warehouseModuleConfig: ModuleConfig = {
  name: 'warehouse',
  routes: [
    {
      path: '/warehouse/bill-summaries',
      element: <BillSummaryListPage />,
      layout: 'main',
      permissions: billSummaryViewPermissions,
      breadcrumb: { label: 'Bill Summaries' },
    },
    {
      path: '/warehouse/bill-summaries/new',
      element: <BillSummaryNewPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.CREATE_BILL_SUMMARY],
      breadcrumb: { label: 'New' },
    },
    {
      path: '/warehouse/bill-summaries/:summaryId',
      element: <BillSummaryDetailPage />,
      layout: 'main',
      permissions: billSummaryViewPermissions,
      breadcrumb: { label: 'Bill Summary' },
    },
    // Pre-move paths, so a bookmarked sheet still opens.
    {
      path: '/dispatch/bill-summaries',
      element: <Navigate to="/warehouse/bill-summaries" replace />,
      layout: 'main',
      permissions: billSummaryViewPermissions,
    },
    {
      path: '/dispatch/bill-summaries/*',
      element: <LegacyBillSummaryRedirect />,
      layout: 'main',
      permissions: billSummaryViewPermissions,
    },
    {
      // Warehouse landing dashboard — reachable by every authenticated user. The cards
      // inside filter by permission, so a user only sees the sections they can access.
      path: '/warehouse',
      element: <WarehouseDashboardPage />,
      layout: 'main',
    },
    {
      path: '/warehouse/bom-requests',
      element: <BOMRequestListPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/warehouse/bom-requests/:requestId',
      element: <BOMRequestDetailPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
    },
    {
      path: '/warehouse/fg-receipts',
      element: <FGReceiptListPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_FG_RECEIPT],
    },
    // Dispatch Loading Routes (static list before the :entryId route)
    {
      path: '/warehouse/dispatch-loading',
      element: <DispatchLoadingListPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
    },
    {
      // A sibling path (not nested under dispatch-loading/) so it can never be
      // captured by the `:entryId` docking-scan route.
      path: '/warehouse/dispatch-loading-prep',
      element: <DispatchLoadingPrepScanPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
    },
    {
      path: '/warehouse/dispatch-loading/:entryId',
      element: <DispatchLoadingScanPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
    },
    // Transfer Request Routes ('new' registered before `:requestId`)
    {
      path: '/warehouse/transfer-requests',
      element: <TransferRequestListPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_TRANSFER_REQUEST],
    },
    {
      path: '/warehouse/transfer-requests/new',
      element: <TransferRequestNewPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.CREATE_TRANSFER_REQUEST],
    },
    {
      path: '/warehouse/transfer-requests/:requestId',
      element: <TransferRequestDetailPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_TRANSFER_REQUEST],
    },
    // BST Routes
    {
      path: '/warehouse/bst',
      element: <BSTDashboardPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BST],
    },
    {
      path: '/warehouse/bst/new',
      element: <BSTNewPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.CREATE_BST],
    },
    {
      path: '/warehouse/bst/incoming/:transferId',
      element: <BSTReceivePage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.MANAGE_BST],
    },
    {
      // Static path registered before the `:transferId` route so it isn't captured.
      path: '/warehouse/bst/partial-approvals',
      element: <BSTPartialApprovalsPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.APPROVE_BST_PARTIAL],
    },
    {
      path: '/warehouse/bst/:transferId',
      element: <BSTDetailPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.VIEW_BST],
    },
    {
      path: '/warehouse/bst/:transferId/scan',
      element: <BSTScanPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.CREATE_BST],
    },
    {
      path: '/warehouse/bst/:transferId/review',
      element: <BSTReviewPage />,
      layout: 'main',
      permissions: [WAREHOUSE_PERMISSIONS.CREATE_BST],
    },
    // GRPO submodule routes (/warehouse/grpo/*, plus legacy /grpo/* redirect)
    ...grpoRoutes,
    // Invoice Approval submodule route (/warehouse/invoice-approval)
    ...invoiceApprovalRoutes,
  ],
  navigation: [
    {
      path: '/warehouse',
      title: 'Warehouse',
      icon: Warehouse,
      showInSidebar: true,
      // Any of these shows the Warehouse group; the children filter individually,
      // so an FG-only user sees the group with just "FG Receipts", a BST-only user
      // with just "Branch Transfer", and a GRPO-only user with just "Material GRPO".
      // Keep this list in sync with the union of the children's permissions below.
      permissions: [
        WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST,
        WAREHOUSE_PERMISSIONS.VIEW_FG_RECEIPT,
        WAREHOUSE_PERMISSIONS.VIEW_BST,
        WAREHOUSE_PERMISSIONS.APPROVE_BST_PARTIAL,
        WAREHOUSE_PERMISSIONS.VIEW_TRANSFER_REQUEST,
        GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
        GRPO_PERMISSIONS.VIEW_PENDING,
        OMS_PERMISSIONS.VIEW_INVOICE,
        // A floor picker may hold only the bill-summary permissions; without
        // these the Warehouse menu would not appear for them at all.
        ...billSummaryViewPermissions,
      ],
      hasSubmenu: true,
      children: [
        {
          path: '/warehouse/bill-summaries',
          title: 'Bill Summaries',
          permissions: billSummaryViewPermissions,
        },
        {
          path: '/warehouse/dispatch-loading',
          title: 'Dispatch Loading',
          permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
        },
        {
          path: '/warehouse/bom-requests',
          title: 'BOM Requests',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
        },
        {
          path: '/warehouse/fg-receipts',
          title: 'FG Receipts',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_FG_RECEIPT],
        },
        {
          path: '/warehouse/transfer-requests',
          title: 'Transfer Requests',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_TRANSFER_REQUEST],
        },
        {
          path: '/warehouse/bst',
          title: 'Branch Transfer',
          permissions: [WAREHOUSE_PERMISSIONS.VIEW_BST],
        },
        {
          path: '/warehouse/bst/partial-approvals',
          title: 'BST Approvals',
          permissions: [WAREHOUSE_PERMISSIONS.APPROVE_BST_PARTIAL],
        },
        // GRPO submodule — nested under the Warehouse group
        ...grpoNavChildren,
        // Invoice Approval submodule — nested under the Warehouse group
        ...invoiceApprovalNavChildren,
      ],
    },
  ],
};
