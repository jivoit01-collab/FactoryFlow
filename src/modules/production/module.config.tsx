import { Factory } from 'lucide-react';
import { lazy } from 'react';

import type { ModuleConfig } from '@/core/types';

// Lazy load all production pages
const ProductionDashboardPage = lazy(() => import('./pages/ProductionDashboardPage'));
const PlanningDashboardPage = lazy(() => import('./pages/planningPages/PlanningDashboardPage'));
const MaterialDashboardPage = lazy(() => import('./pages/materialPages/MaterialDashboardPage'));
const ProductionHistoryPage = lazy(() => import('./pages/productionPages/ProductionHistoryPage'));
const QCInProcessPage = lazy(() => import('./pages/qcPages/QCInProcessPage'));
const ReturnEntryPage = lazy(() => import('./pages/returnWastagePages/ReturnEntryPage'));
const MaintenanceDashboardPage = lazy(
  () => import('./pages/maintenancePages/MaintenanceDashboardPage'),
);
const LabourDashboardPage = lazy(() => import('./pages/labourPages/LabourDashboardPage'));
const ReportsDashboardPage = lazy(() => import('./pages/reportsPages/ReportsDashboardPage'));

/**
 * Production module configuration
 */
export const productionModuleConfig: ModuleConfig = {
  name: 'production',
  routes: [
    // Production Dashboard
    {
      path: '/production',
      element: <ProductionDashboardPage />,
      layout: 'main',
    },

    // ── Planning ─────────────────────────────────────────────────
    {
      path: '/production/planning',
      element: <PlanningDashboardPage />,
      layout: 'main',
    },

    // ── Material Acquisition ──────────────────────────────────────
    {
      path: '/production/material',
      element: <MaterialDashboardPage />,
      layout: 'main',
    },

    // ── Manufacturing Execution ───────────────────────────────────
    {
      path: '/production/manufacturing',
      element: <ProductionHistoryPage />,
      layout: 'main',
    },

    // ── QC (In-Process) ───────────────────────────────────────────
    {
      path: '/production/qc',
      element: <QCInProcessPage />,
      layout: 'main',
    },

    // ── Return & Wastage ──────────────────────────────────────────
    {
      path: '/production/return-wastage',
      element: <ReturnEntryPage />,
      layout: 'main',
    },

    // ── Maintenance ───────────────────────────────────────────────
    {
      path: '/production/maintenance',
      element: <MaintenanceDashboardPage />,
      layout: 'main',
    },

    // ── Labour ───────────────────────────────────────────────────
    {
      path: '/production/labour',
      element: <LabourDashboardPage />,
      layout: 'main',
    },

    // ── Reports ───────────────────────────────────────────────────
    {
      path: '/production/reports',
      element: <ReportsDashboardPage />,
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/production',
      title: 'Production',
      icon: Factory,
      showInSidebar: true,
      hasSubmenu: true,
      children: [
        {
          path: '/production/planning',
          title: 'Planning',
        },
        {
          path: '/production/material',
          title: 'Material Acquisition',
        },
        {
          path: '/production/manufacturing',
          title: 'Production',
        },
        {
          path: '/production/qc',
          title: 'QC (In-Process)',
        },
        {
          path: '/production/return-wastage',
          title: 'Return & Wastage',
        },
        {
          path: '/production/maintenance',
          title: 'Maintenance',
        },
        {
          path: '/production/labour',
          title: 'Labour',
        },
        {
          path: '/production/reports',
          title: 'Reports',
        },
      ],
    },
  ],
};
