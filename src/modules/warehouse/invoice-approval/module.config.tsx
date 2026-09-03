import { INVOICE_APPROVAL_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleNavItem, ModuleRoute } from '@/core/types';

import { PendingCountBadge } from './components/PendingCountBadge';

const InvoiceApprovalPage = lazy(() => import('./pages/InvoiceApprovalPage'));

/**
 * Factory Invoice Approval routes — contributed to the Warehouse module
 * (`warehouseModuleConfig`). Backed by the backend `invoice_approval` app,
 * which reads and decides SAP approval requests directly.
 */
export const invoiceApprovalRoutes: ModuleRoute[] = [
  {
    path: '/warehouse/invoice-approval',
    element: <InvoiceApprovalPage />,
    layout: 'main',
    permissions: [INVOICE_APPROVAL_PERMISSIONS.VIEW_INVOICE],
    breadcrumb: { label: 'Invoice Approval' },
  },
];

/**
 * Invoice Approval navigation — a child item under the Warehouse sidebar group,
 * with a live badge counting invoices awaiting action.
 */
export const invoiceApprovalNavChildren: ModuleNavItem[] = [
  {
    path: '/warehouse/invoice-approval',
    title: 'Invoice Approval',
    permissions: [INVOICE_APPROVAL_PERMISSIONS.VIEW_INVOICE],
    badge: PendingCountBadge,
  },
];
