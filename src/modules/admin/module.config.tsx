import { ShieldCheck } from 'lucide-react';

import { ADMIN_PERMISSIONS, MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { DockingApprovalsBadge } from './components/DockingApprovalsBadge';
import { MaterialIndentApprovalsBadge } from './components/MaterialIndentApprovalsBadge';
import { PartialApprovalsBadge } from './components/PartialApprovalsBadge';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const DockingScanApprovalsPage = lazy(() => import('./pages/DockingScanApprovalsPage'));
const DockingPartialScanApprovalsPage = lazy(
  () => import('./pages/DockingPartialScanApprovalsPage'),
);
const MaterialIndentApprovalsPage = lazy(() => import('./pages/MaterialIndentApprovalsPage'));

const dockingApprovalPermissions = [
  ADMIN_PERMISSIONS.DOCKING.VIEW_SCAN_SKIP,
  ADMIN_PERMISSIONS.DOCKING.APPROVE_SCAN_SKIP,
] as const;

const partialApprovalPermissions = [
  ADMIN_PERMISSIONS.DOCKING.VIEW_PARTIAL_SCAN,
  ADMIN_PERMISSIONS.DOCKING.APPROVE_PARTIAL_SCAN,
] as const;

const materialIndentApprovalPermissions = [
  MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
  MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT,
] as const;

const adminPermissions = [
  ...dockingApprovalPermissions,
  ...partialApprovalPermissions,
  ...materialIndentApprovalPermissions,
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
      ],
    },
  ],
};
