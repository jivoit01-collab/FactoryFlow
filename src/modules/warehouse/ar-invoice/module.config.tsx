import { AR_INVOICE_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleNavItem, ModuleRoute } from '@/core/types';

const ARInvoicePage = lazy(() => import('./pages/ARInvoicePage'));

/**
 * A/R invoice routes — contributed to the Warehouse module
 * (`warehouseModuleConfig`). Backed by the backend `ar_invoice` app; approvals
 * happen on the existing Invoice Approval page (same ObjType-13 requests).
 */
export const arInvoiceRoutes: ModuleRoute[] = [
  {
    path: '/warehouse/ar-invoices',
    element: <ARInvoicePage />,
    layout: 'main',
    permissions: [AR_INVOICE_PERMISSIONS.VIEW],
    breadcrumb: { label: 'AR Invoices' },
  },
];

export const arInvoiceNavChildren: ModuleNavItem[] = [
  {
    path: '/warehouse/ar-invoices',
    title: 'AR Invoices',
    permissions: [AR_INVOICE_PERMISSIONS.VIEW],
  },
];
