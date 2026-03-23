import { FlaskConical } from 'lucide-react';
import { lazy } from 'react';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// Lazy load QC pages
const QCDashboardPage = lazy(() => import('./pages/QCDashboardPage'));

// Arrival Slips submodule
const PendingInspectionsPage = lazy(() => import('./pages/PendingInspectionsPage'));
const InspectionDetailPage = lazy(() => import('./pages/InspectionDetailPage'));
const ApprovalQueuePage = lazy(() => import('./pages/ApprovalQueuePage'));

// Master Data (shared)
const MaterialTypesPage = lazy(() => import('./pages/masterdata/MaterialTypesPage'));
const QCParametersPage = lazy(() => import('./pages/masterdata/QCParametersPage'));

// Production QC submodule
const ProductionQCDashboardPage = lazy(() => import('./pages/production/ProductionQCDashboardPage'));
const ProductionQCRunPage = lazy(() => import('./pages/production/ProductionQCRunPage'));
const ProductionQCSessionPage = lazy(() => import('./pages/production/ProductionQCSessionPage'));

/**
 * Quality Control module configuration
 *
 * Submodules:
 * 1. Arrival Slips — Raw material inspection workflow
 * 2. Production QC — Production run quality control
 * 3. Master Data — Material types & QC parameters (shared)
 */
export const qcModuleConfig: ModuleConfig = {
  name: 'qc',
  routes: [
    // ==================== QC Dashboard ====================
    {
      path: '/qc',
      element: <QCDashboardPage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.INSPECTION.VIEW,
        QC_PERMISSIONS.ARRIVAL_SLIP.VIEW,
        QC_PERMISSIONS.PRODUCTION_QC.VIEW,
      ],
    },

    // ==================== Arrival Slips Submodule ====================
    {
      path: '/qc/arrival-slips',
      element: <PendingInspectionsPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
    },
    {
      path: '/qc/arrival-slips/inspections/:slipId/new',
      element: <InspectionDetailPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.CREATE],
    },
    {
      path: '/qc/arrival-slips/inspections/:inspectionId',
      element: <InspectionDetailPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
    },
    {
      path: '/qc/arrival-slips/approvals',
      element: <ApprovalQueuePage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST,
        QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM,
      ],
    },

    // ==================== Production QC Submodule ====================
    {
      path: '/qc/production',
      element: <ProductionQCDashboardPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.VIEW],
    },
    {
      path: '/qc/production/runs/:runId',
      element: <ProductionQCRunPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.VIEW],
    },
    {
      path: '/qc/production/sessions/:sessionId',
      element: <ProductionQCSessionPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.VIEW],
    },
    // ==================== Shared Master Data ====================
    {
      path: '/qc/master/material-types',
      element: <MaterialTypesPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES],
      breadcrumb: { label: 'Materials' },
    },
    {
      path: '/qc/master/parameters',
      element: <QCParametersPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
      breadcrumb: { label: 'Params' },
    },

    // ==================== Legacy route redirects ====================
    // Keep old routes working (redirect via same components)
    {
      path: '/qc/pending',
      element: <PendingInspectionsPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
    },
    {
      path: '/qc/inspections/:slipId/new',
      element: <InspectionDetailPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.CREATE],
    },
    {
      path: '/qc/inspections/:inspectionId',
      element: <InspectionDetailPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
    },
    {
      path: '/qc/approvals',
      element: <ApprovalQueuePage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST,
        QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM,
      ],
    },
  ],
  navigation: [
    {
      path: '/qc',
      title: 'Quality Control',
      icon: FlaskConical,
      showInSidebar: true,
      permissions: [
        QC_PERMISSIONS.INSPECTION.VIEW,
        QC_PERMISSIONS.ARRIVAL_SLIP.VIEW,
        QC_PERMISSIONS.PRODUCTION_QC.VIEW,
      ],
      hasSubmenu: true,
      children: [
        {
          path: '/qc',
          title: 'Dashboard',
          permissions: [
            QC_PERMISSIONS.INSPECTION.VIEW,
            QC_PERMISSIONS.ARRIVAL_SLIP.VIEW,
            QC_PERMISSIONS.PRODUCTION_QC.VIEW,
          ],
        },
        {
          path: '/qc/arrival-slips',
          title: 'Arrival Slips',
          permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
        },
        {
          path: '/qc/arrival-slips/approvals',
          title: 'Arrival Slip Approvals',
          permissions: [
            QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST,
            QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM,
          ],
        },
        {
          path: '/qc/production',
          title: 'Production QC',
          permissions: [QC_PERMISSIONS.PRODUCTION_QC.VIEW],
        },
        {
          path: '/qc/master/material-types',
          title: 'Material Types',
          permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES],
        },
        {
          path: '/qc/master/parameters',
          title: 'QC Parameters',
          permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
        },
      ],
    },
  ],
};
