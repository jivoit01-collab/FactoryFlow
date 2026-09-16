import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleNavItem, ModuleRoute } from '@/core/types';

import { PendingCountBadge } from './components/PendingCountBadge';

const CreditNoteApprovalPage = lazy(() => import('./pages/CreditNoteApprovalPage'));

/**
 * Credit Note Approval routes — contributed to the Warehouse module
 * (`warehouseModuleConfig`). Backed by `warehouse/views_credit_note_approval`,
 * which reads and decides SAP approval requests on credit-note drafts directly.
 */
export const creditNoteApprovalRoutes: ModuleRoute[] = [
  {
    path: '/warehouse/credit-note-approval',
    element: <CreditNoteApprovalPage />,
    layout: 'main',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_CREDIT_NOTE_APPROVAL],
    breadcrumb: { label: 'Credit Note Approval' },
  },
];

/**
 * Credit Note Approval navigation — a child item under the Warehouse sidebar
 * group, with a live badge counting what SAP is holding.
 */
export const creditNoteApprovalNavChildren: ModuleNavItem[] = [
  {
    path: '/warehouse/credit-note-approval',
    title: 'Credit Note Approval',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_CREDIT_NOTE_APPROVAL],
    badge: PendingCountBadge,
  },
];
