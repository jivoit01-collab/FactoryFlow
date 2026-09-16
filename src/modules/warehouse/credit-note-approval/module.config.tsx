import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleNavItem, ModuleRoute } from '@/core/types';

import { PendingCountBadge } from './components/PendingCountBadge';

const CreditNoteApprovalPage = lazy(() => import('./pages/CreditNoteApprovalPage'));

/**
 * Either family opens the page — an A/P-only clerk gets in and simply finds no
 * A/R rows, because the server narrows the queue to what they hold rather than
 * the page hiding rows it was sent.
 */
const CREDIT_NOTE_VIEW_PERMISSIONS = [
  WAREHOUSE_PERMISSIONS.VIEW_AR_CREDIT_NOTE_APPROVAL,
  WAREHOUSE_PERMISSIONS.VIEW_AP_CREDIT_NOTE_APPROVAL,
] as const;

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
    permissions: CREDIT_NOTE_VIEW_PERMISSIONS,
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
    permissions: CREDIT_NOTE_VIEW_PERMISSIONS,
    badge: PendingCountBadge,
  },
];
