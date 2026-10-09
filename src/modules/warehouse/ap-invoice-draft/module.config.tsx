import { AP_INVOICE_DRAFT_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleNavItem, ModuleRoute } from '@/core/types';

const APInvoiceDraftListPage = lazy(() => import('./pages/APInvoiceDraftListPage'));
const APInvoiceDraftDetailPage = lazy(() => import('./pages/APInvoiceDraftDetailPage'));

/**
 * A/P Invoice Draft routes — contributed to the Warehouse module
 * (`warehouseModuleConfig`). Backed by the backend `ap_invoice_draft` app.
 *
 * Warehouse because the store holds the GRPO and the bill that came with the
 * truck; it makes the SAP draft and accounts adds it.
 */
export const apInvoiceDraftRoutes: ModuleRoute[] = [
  {
    path: '/warehouse/ap-invoice-drafts',
    element: <APInvoiceDraftListPage />,
    layout: 'main',
    permissions: AP_INVOICE_DRAFT_ACCESS,
    breadcrumb: { label: 'A/P Invoice Drafts' },
  },
  {
    path: '/warehouse/ap-invoice-drafts/:entryId',
    element: <APInvoiceDraftDetailPage />,
    layout: 'main',
    permissions: AP_INVOICE_DRAFT_ACCESS,
    breadcrumb: { label: 'A/P Invoice Draft' },
  },
];

export const apInvoiceDraftNavChildren: ModuleNavItem[] = [
  {
    path: '/warehouse/ap-invoice-drafts',
    title: 'A/P Invoice Drafts',
    permissions: AP_INVOICE_DRAFT_ACCESS,
  },
];
