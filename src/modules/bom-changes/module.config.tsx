/**
 * BOM Changes module — SAP Portal's BOM requests, merged into JI.
 *
 * A change to a SAP bill of materials (a new tree, or a replacement of one)
 * is raised, approved level by level and written to SAP by the last approval;
 * the SAP BOMs viewer reads the trees SAP already holds. Its own sidebar group,
 * registered after SAP Finance: both are SAP master data the office keeps, but
 * BOM approvers are production and costing people, not accountants.
 *
 * Gated on explicit rights, not a module prefix: in the sidebar a prefix
 * short-circuits `permissions`. Every bom_changes right implies viewing, so the
 * group and the read-only pages open on any of them; the request form opens
 * for those who may raise a request or push one directly.
 *
 * Not the warehouse's "BOM requests" (production asking the store for
 * material) — those stay under Warehouse.
 */
import { ClipboardList, GitBranch } from 'lucide-react';

import { BOM_CHANGES_ACCESS, BOM_CHANGES_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleNavItem } from '@/core/types';

const SapBomsPage = lazy(() => import('./pages/SapBomsPage'));
const ChangeRequestsPage = lazy(() => import('./pages/ChangeRequestsPage'));
const RequestFormPage = lazy(() => import('./pages/RequestFormPage'));
const RequestDetailPage = lazy(() => import('./pages/RequestDetailPage'));

/** Who may open the request form: raise a request, or push one directly. */
export const BOM_CHANGES_RAISE_ACCESS: readonly string[] = [
  BOM_CHANGES_PERMISSIONS.REQUEST,
  BOM_CHANGES_PERMISSIONS.PUSH_DIRECTLY,
];

export const bomChangesModuleConfig: ModuleConfig = {
  name: 'bom-changes',
  routes: [
    {
      path: '/bom-changes/sap-boms',
      element: <SapBomsPage />,
      layout: 'main',
      permissions: BOM_CHANGES_ACCESS,
      breadcrumb: { label: 'SAP BOMs' },
    },
    {
      path: '/bom-changes/requests',
      element: <ChangeRequestsPage />,
      layout: 'main',
      permissions: BOM_CHANGES_ACCESS,
      breadcrumb: { label: 'Change Requests' },
    },
    {
      path: '/bom-changes/requests/new',
      element: <RequestFormPage />,
      layout: 'main',
      permissions: BOM_CHANGES_RAISE_ACCESS,
      breadcrumb: { label: 'New' },
    },
    {
      path: '/bom-changes/requests/:id',
      element: <RequestDetailPage />,
      layout: 'main',
      permissions: BOM_CHANGES_ACCESS,
      breadcrumb: { label: 'Request' },
    },
  ],
};

/** Shown under SAP Portal in the sidebar (see modules/sap-portal). */
export const BOM_CHANGES_NAV_ITEMS: ModuleNavItem[] = [
  {
    path: '/bom-changes/sap-boms',
    title: 'BOMs',
    icon: GitBranch,
    permissions: BOM_CHANGES_ACCESS,
  },
  {
    path: '/bom-changes/requests',
    title: 'BOM Change Requests',
    icon: ClipboardList,
    permissions: BOM_CHANGES_ACCESS,
  },
];
