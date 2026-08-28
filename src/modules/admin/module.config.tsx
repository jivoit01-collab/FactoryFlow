import { ShieldCheck } from 'lucide-react';

import {
  ADMIN_PERMISSIONS,
  GOODS_RETURN_PERMISSIONS,
  MAINTENANCE_PERMISSIONS,
  RETURNABLE_PERMISSIONS,
  WAREHOUSE_PERMISSIONS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { BstApprovalsBadge } from './components/BstApprovalsBadge';
import { DockingApprovalsBadge } from './components/DockingApprovalsBadge';
import { GoodsReturnApprovalsBadge } from './components/GoodsReturnApprovalsBadge';
import { MaterialIndentApprovalsBadge } from './components/MaterialIndentApprovalsBadge';
import { PartialApprovalsBadge } from './components/PartialApprovalsBadge';
import { ReturnableApprovalsBadge } from './components/ReturnableApprovalsBadge';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const DockingScanApprovalsPage = lazy(() => import('./pages/DockingScanApprovalsPage'));
const DockingPartialScanApprovalsPage = lazy(
  () => import('./pages/DockingPartialScanApprovalsPage'),
);
const MaterialIndentApprovalsPage = lazy(() => import('./pages/MaterialIndentApprovalsPage'));
const ReturnableApprovalsPage = lazy(() => import('./pages/ReturnableApprovalsPage'));
const GoodsReturnApprovalsPage = lazy(() => import('./pages/GoodsReturnApprovalsPage'));
const WarehouseManagersPage = lazy(() => import('./pages/WarehouseManagersPage'));
// Same queue the Warehouse module exposes at /warehouse/bst/partial-approvals —
// mirrored here so approvers find every queue in one place. One page, two routes.
const BSTPartialApprovalsPage = lazy(
  () => import('@/modules/warehouse/pages/bst/BSTPartialApprovalsPage'),
);

const dockingApprovalPermissions = [
  ADMIN_PERMISSIONS.DOCKING.VIEW_SCAN_SKIP,
  ADMIN_PERMISSIONS.DOCKING.APPROVE_SCAN_SKIP,
] as const;

const partialApprovalPermissions = [
  ADMIN_PERMISSIONS.DOCKING.VIEW_PARTIAL_SCAN,
  ADMIN_PERMISSIONS.DOCKING.APPROVE_PARTIAL_SCAN,
] as const;

// Approve-only: this admin queue is for approvers. VIEW_MATERIAL_INDENT is held
// by requesters too, so including it here would surface the approvals page (and
// the whole Admin module, via adminPermissions) to raise-only users.
const materialIndentApprovalPermissions = [
  MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT,
] as const;

// Approve-only, for the same reason as material indents: VIEW_GATEPASS is held by
// every department that raises a pass, so it must not pull the Admin module into
// their sidebar.
const returnableApprovalPermissions = [RETURNABLE_PERMISSIONS.APPROVE_GATEPASS] as const;

const bstApprovalPermissions = [WAREHOUSE_PERMISSIONS.APPROVE_BST_PARTIAL] as const;

const goodsReturnApprovalPermissions = [GOODS_RETURN_PERMISSIONS.APPROVE] as const;

// Not an approval queue -- it decides who runs which warehouse, which is why it
// is gated on its own admin permission rather than on any movement permission.
const warehouseManagerPermissions = [
  WAREHOUSE_PERMISSIONS.MANAGE_USER_WAREHOUSES,
] as const;

const adminPermissions = [
  ...warehouseManagerPermissions,
  ...dockingApprovalPermissions,
  ...partialApprovalPermissions,
  ...materialIndentApprovalPermissions,
  ...returnableApprovalPermissions,
  ...bstApprovalPermissions,
  ...goodsReturnApprovalPermissions,
] as const;

export const adminModuleConfig: ModuleConfig = {
  name: 'admin',
  routes: [
    {
      path: '/admin',
      element: <AdminDashboardPage />,
      layout: 'main',
      permissions: adminPermissions,
      breadcrumb: { label: 'Admin' },
    },
    {
      path: '/admin/docking/scan-approvals',
      element: <DockingScanApprovalsPage />,
      layout: 'main',
      permissions: dockingApprovalPermissions,
      breadcrumb: { label: 'Scan Skip Requests' },
    },
    {
      path: '/admin/docking/partial-dispatch-approvals',
      element: <DockingPartialScanApprovalsPage />,
      layout: 'main',
      permissions: partialApprovalPermissions,
      breadcrumb: { label: 'Partial Dispatch Approvals' },
    },
    {
      path: '/admin/material-indent-approvals',
      element: <MaterialIndentApprovalsPage />,
      layout: 'main',
      permissions: materialIndentApprovalPermissions,
      breadcrumb: { label: 'Material Indent Approvals' },
    },
    {
      path: '/admin/returnable-approvals',
      element: <ReturnableApprovalsPage />,
      layout: 'main',
      permissions: returnableApprovalPermissions,
      breadcrumb: { label: 'Returnable / Non-returnable Approvals' },
    },
    {
      path: '/admin/bst-approvals',
      element: <BSTPartialApprovalsPage />,
      layout: 'main',
      permissions: bstApprovalPermissions,
      breadcrumb: { label: 'BST Approvals' },
    },
    {
      path: '/admin/goods-return-approvals',
      element: <GoodsReturnApprovalsPage />,
      layout: 'main',
      permissions: goodsReturnApprovalPermissions,
      breadcrumb: { label: 'Goods Return Approvals' },
    },
    {
      path: '/admin/warehouse-managers',
      element: <WarehouseManagersPage />,
      layout: 'main',
      permissions: warehouseManagerPermissions,
      breadcrumb: { label: 'Warehouse Managers' },
    },
  ],
  navigation: [
    {
      path: '/admin',
      title: 'Admin',
      icon: ShieldCheck,
      showInSidebar: true,
      permissions: adminPermissions,
      hasSubmenu: true,
      badge: DockingApprovalsBadge,
      children: [
        {
          path: '/admin/docking/scan-approvals',
          title: 'Docking Approvals',
          permissions: dockingApprovalPermissions,
          badge: DockingApprovalsBadge,
        },
        {
          path: '/admin/docking/partial-dispatch-approvals',
          title: 'Partial Dispatch Approvals',
          permissions: partialApprovalPermissions,
          badge: PartialApprovalsBadge,
        },
        {
          path: '/admin/material-indent-approvals',
          title: 'Material Indent Approvals',
          permissions: materialIndentApprovalPermissions,
          badge: MaterialIndentApprovalsBadge,
        },
        {
          path: '/admin/returnable-approvals',
          title: 'Returnable / Non-returnable Approvals',
          permissions: returnableApprovalPermissions,
          badge: ReturnableApprovalsBadge,
        },
        {
          path: '/admin/bst-approvals',
          title: 'BST Approvals',
          permissions: bstApprovalPermissions,
          badge: BstApprovalsBadge,
        },
        {
          path: '/admin/goods-return-approvals',
          title: 'Goods Return Approvals',
          permissions: goodsReturnApprovalPermissions,
          badge: GoodsReturnApprovalsBadge,
        },
        {
          path: '/admin/warehouse-managers',
          title: 'Warehouse Managers',
          permissions: warehouseManagerPermissions,
        },
      ],
    },
  ],
};
