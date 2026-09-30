/**
 * SAP Approvals module — SAP Portal's approvals inbox, merged into JI.
 *
 * Every SAP approval request of every document type that involves the reader:
 * the ones waiting on their own SAP user and the ones they raised, decided or
 * withdrawn as that SAP user. Its own sidebar item beside SAP Finance; not part
 * of Warehouse, whose approval queues each serve one document family and list
 * it company-wide.
 *
 * Gated on explicit rights (SAP_APPROVALS_ACCESS), not a module prefix: in the
 * sidebar a prefix short-circuits `permissions`. The badge is imported by
 * direct path, never through a barrel.
 */
import { ClipboardCheck } from 'lucide-react';

import { SAP_APPROVALS_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleNavItem } from '@/core/types';

import { PendingCountBadge } from './components/PendingCountBadge';

const SapApprovalsPage = lazy(() => import('./pages/SapApprovalsPage'));

export const sapApprovalsModuleConfig: ModuleConfig = {
  name: 'sap-approvals',
  routes: [
    {
      path: '/sap-approvals',
      element: <SapApprovalsPage />,
      layout: 'main',
      permissions: SAP_APPROVALS_ACCESS,
      breadcrumb: { label: 'SAP Approvals' },
    },
  ],
};

/** Shown under SAP Portal in the sidebar, with its pending count (see modules/sap-portal). */
export const SAP_APPROVALS_NAV_ITEMS: ModuleNavItem[] = [
  {
    path: '/sap-approvals',
    title: 'Approvals',
    icon: ClipboardCheck,
    permissions: SAP_APPROVALS_ACCESS,
    badge: PendingCountBadge,
  },
];
