/**
 * SAP Reports module — the saved queries from SAP's Query Manager.
 *
 * A catalogue page and one generic run page: because every report is discovered
 * from SAP (`OUQR`) rather than coded here, a report added or edited in SAP
 * appears after a sync with no release. The run page builds its filter form from
 * the parameters the server describes, so the same screen serves a two-date
 * report and a four-warehouse one.
 *
 * Nav lives elsewhere: these screens sit under the "Dashboards" group owned by
 * the dashboards module, because they are the same job as the dashboards —
 * cross-domain, read-only numbers — in tabular rather than visual form. The
 * routes stay here so the module remains self-contained; only the
 * sidebar entry is declared over there, the way the gate module declares
 * Marketplace Gate. Permission gating (`SAP_REPORTS_ACCESS`) is applied in both
 * places.
 */
import { SAP_REPORTS_ACCESS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { LegacySapReportsRedirect } from './LegacySapReportsRedirect';

const SapReportsListPage = lazy(() => import('./pages/SapReportsListPage'));
const SapReportPage = lazy(() => import('./pages/SapReportPage'));

export const sapReportsModuleConfig: ModuleConfig = {
  name: 'sap-reports',
  routes: [
    {
      path: '/dashboards/sap-reports',
      element: <SapReportsListPage />,
      layout: 'main',
      permissions: SAP_REPORTS_ACCESS,
      breadcrumb: { label: 'SAP Reports' },
    },
    {
      path: '/dashboards/sap-reports/:slug',
      element: <SapReportPage />,
      layout: 'main',
      permissions: SAP_REPORTS_ACCESS,
      breadcrumb: { label: 'Report' },
    },
    // Pre-move paths. The screens shipped on 22 Aug at `/sap-reports`, so
    // anything already bookmarked or linked keeps working.
    {
      path: '/sap-reports',
      element: <LegacySapReportsRedirect />,
      layout: 'main',
      permissions: SAP_REPORTS_ACCESS,
    },
    {
      path: '/sap-reports/*',
      element: <LegacySapReportsRedirect />,
      layout: 'main',
      permissions: SAP_REPORTS_ACCESS,
    },
  ],
};
