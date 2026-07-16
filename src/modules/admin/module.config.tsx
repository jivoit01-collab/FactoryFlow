import { ShieldCheck } from 'lucide-react';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';

import { ADMIN_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

import { DockingApprovalsBadge } from './components/DockingApprovalsBadge';
import { PartialApprovalsBadge } from './components/PartialApprovalsBadge';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const DockingScanApprovalsPage = lazy(() => import('./pages/DockingScanApprovalsPage'));
const DockingPartialScanApprovalsPage = lazy(
  () => import('./pages/DockingPartialScanApprovalsPage'),
);

const dockingApprovalPermissions = [
  ADMIN_PERMISSIONS.DOCKING.VIEW_SCAN_SKIP,
  ADMIN_PERMISSIONS.DOCKING.APPROVE_SCAN_SKIP,
] as const;

const partialApprovalPermissions = [
  ADMIN_PERMISSIONS.DOCKING.VIEW_PARTIAL_SCAN,
  ADMIN_PERMISSIONS.DOCKING.APPROVE_PARTIAL_SCAN,
] as const;

const adminPermissions = [...dockingApprovalPermissions, ...partialApprovalPermissions] as const;

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
      ],
    },
  ],
};
