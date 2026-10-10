/**
 * Production Orders module — what was made, posted to SAP as a production
 * order the way SAP itself takes it: plan (the order, its lines the BOM),
 * release, issue, receipt (the goods under their batch), close. One page per
 * step, in the gate wizards' style, each asking only what its step needs and
 * each saving a draft or posting that step. Each step is its own right and
 * posts under the SAP user of whoever takes it.
 *
 * Its menu entry sits in the Production sidebar group; its pages and code are
 * its own, apart from the production execution screens (runs, and their own
 * "SAP Orders" page), which stay as they are. Oil's finished-goods filling only,
 * for now.
 *
 * Its pages are gated on its own rights and company. The Production group
 * shows for anyone holding a production-order right (its prefix list includes
 * `production_orders`); the entry within it checks the rights themselves.
 */

import {
  PRODUCTION_ORDERS_ACCESS,
  PRODUCTION_ORDERS_COMPANIES,
  PRODUCTION_ORDERS_CREATE_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const EntriesPage = lazy(() => import('./pages/EntriesPage'));
const InSapPage = lazy(() => import('./pages/InSapPage'));
const EntryPage = lazy(() => import('./pages/EntryPage'));
const PlanStepPage = lazy(() => import('./pages/PlanStepPage'));
const ReleaseStepPage = lazy(() => import('./pages/ReleaseStepPage'));
const IssueStepPage = lazy(() => import('./pages/IssueStepPage'));
const ReceiptStepPage = lazy(() => import('./pages/ReceiptStepPage'));
const CloseStepPage = lazy(() => import('./pages/CloseStepPage'));

/** An entry's pages: open on any right; each page offers only what the caller may do. */
function entryRoute(path: string, element: React.ReactNode, label: string) {
  return {
    path,
    element,
    layout: 'main' as const,
    permissions: PRODUCTION_ORDERS_ACCESS,
    companies: PRODUCTION_ORDERS_COMPANIES,
    breadcrumb: { label },
  };
}

export const productionOrdersModuleConfig: ModuleConfig = {
  name: 'production-orders',
  routes: [
    entryRoute('/production-orders', <EntriesPage />, 'Production Orders'),
    // The breadcrumb of an entry's page links here.
    entryRoute('/production-orders/entries', <EntriesPage />, 'Entries'),
    // SAP's own orders, read only, whoever made them.
    entryRoute('/production-orders/in-sap', <InSapPage />, 'In SAP'),
    {
      path: '/production-orders/new',
      element: <PlanStepPage />,
      layout: 'main',
      permissions: PRODUCTION_ORDERS_CREATE_ACCESS,
      companies: PRODUCTION_ORDERS_COMPANIES,
      breadcrumb: { label: 'New FG entry' },
    },
    entryRoute('/production-orders/entries/:id', <EntryPage />, 'Entry'),
    entryRoute('/production-orders/entries/:id/plan', <PlanStepPage />, 'Plan'),
    entryRoute('/production-orders/entries/:id/release', <ReleaseStepPage />, 'Release'),
    entryRoute('/production-orders/entries/:id/issue', <IssueStepPage />, 'Issue'),
    entryRoute('/production-orders/entries/:id/receipt', <ReceiptStepPage />, 'Receipt'),
    entryRoute('/production-orders/entries/:id/close', <CloseStepPage />, 'Close'),
  ],
  // No sidebar group of its own: the menu entry is under Production
  // (modules/production/module.config.tsx).
  navigation: [],
};
