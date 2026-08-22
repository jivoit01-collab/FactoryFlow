/**
 * SAP Reports module — the saved queries from SAP's Query Manager.
 *
 * A catalogue page and one generic run page: because every report is discovered
 * from SAP (`OUQR`) rather than coded here, a report added or edited in SAP
 * appears after a sync with no release. The run page builds its filter form from
 * the parameters the server describes, so the same screen serves a two-date
 * report and a four-warehouse one.
 *
 * Sidebar hides the module from users with no `sap_reports.*` permission
 * (`modulePrefix`).
 */
import { FileSpreadsheet } from 'lucide-react';

import { SAP_REPORTS_ACCESS, SAP_REPORTS_MODULE_PREFIX } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const SapReportsListPage = lazy(() => import('./pages/SapReportsListPage'));
const SapReportPage = lazy(() => import('./pages/SapReportPage'));

export const sapReportsModuleConfig: ModuleConfig = {
  name: 'sap-reports',
  routes: [
    {
      path: '/sap-reports',
      element: <SapReportsListPage />,
      layout: 'main',
      permissions: SAP_REPORTS_ACCESS,
      breadcrumb: { label: 'SAP Reports' },
    },
    {
      path: '/sap-reports/:slug',
      element: <SapReportPage />,
      layout: 'main',
      permissions: SAP_REPORTS_ACCESS,
      breadcrumb: { label: 'Report' },
    },
  ],
  navigation: [
    {
      path: '/sap-reports',
      title: 'SAP Reports',
      icon: FileSpreadsheet,
      showInSidebar: true,
      modulePrefix: SAP_REPORTS_MODULE_PREFIX,
    },
  ],
};
