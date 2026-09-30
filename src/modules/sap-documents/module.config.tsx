/**
 * SAP Documents module — SAP Portal's document browser, merged into JI.
 *
 * Purchase and sales documents, inventory transfers, journal entries, outgoing
 * payments and the drafts waiting for approval, read live from SAP, each opening
 * to its lines, journal and attachments. Registered beside SAP Finance, the
 * other SAP Portal screen: that one is SAP's books, this one the documents
 * behind them, and each has its own audience.
 *
 * Gated on explicit rights, not a module prefix: in the sidebar a prefix
 * short-circuits `permissions` and would show the page to someone holding only
 * the download right, which opens nothing on its own. Download buttons are
 * gated inside the page on both rights (SAP_DOCUMENTS_DOWNLOAD_ACCESS).
 */
import { FileSearch } from 'lucide-react';

import { SAP_DOCUMENTS_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig, ModuleNavItem } from '@/core/types';

const SapDocumentsPage = lazy(() => import('./pages/SapDocumentsPage'));

export const sapDocumentsModuleConfig: ModuleConfig = {
  name: 'sap-documents',
  routes: [
    {
      path: '/sap-documents',
      element: <SapDocumentsPage />,
      layout: 'main',
      permissions: SAP_DOCUMENTS_ACCESS,
      breadcrumb: { label: 'SAP Documents' },
    },
  ],
};

/** Shown under SAP Portal in the sidebar (see modules/sap-portal). */
export const SAP_DOCUMENTS_NAV_ITEMS: ModuleNavItem[] = [
  {
    path: '/sap-documents',
    title: 'Documents',
    icon: FileSearch,
    permissions: SAP_DOCUMENTS_ACCESS,
  },
];
