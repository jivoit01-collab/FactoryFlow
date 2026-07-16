import { FlaskConical } from 'lucide-react';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';

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
const PrintDocumentsPage = lazy(() => import('./pages/masterdata/PrintDocumentsPage'));

// Line Clearance QA submodule
const LineClearanceQAPage = lazy(() => import('./pages/LineClearanceQAPage'));

// Production QC submodule
const ProductionQCDashboardPage = lazy(
  () => import('./pages/production/ProductionQCDashboardPage'),
);
const ProductionQCRunPage = lazy(() => import('./pages/production/ProductionQCRunPage'));
const ProductionQCSessionPage = lazy(() => import('./pages/production/ProductionQCSessionPage'));
const ProductionQCApprovalPage = lazy(() => import('./pages/production/ProductionQCApprovalPage'));
const CustomerReturnQCDashboardPage = lazy(
  () => import('./pages/customerReturns/CustomerReturnQCDashboardPage'),
);
const CustomerReturnQCDetailPage = lazy(
  () => import('./pages/customerReturns/CustomerReturnQCDetailPage'),
);

const lineClearanceQCPermissions = [
  QC_PERMISSIONS.LINE_CLEARANCE_QC.VIEW,
  QC_PERMISSIONS.LINE_CLEARANCE_QC.APPROVE,
];

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
        ...lineClearanceQCPermissions,
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
    {
      path: '/qc/production/approvals',
      element: <ProductionQCApprovalPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.APPROVE],
    },
    // ==================== Line Clearance QA Submodule ====================
    {
      path: '/qc/line-clearance',
      element: <LineClearanceQAPage />,
      layout: 'main',
      permissions: lineClearanceQCPermissions,
    },

    // ==================== Customer Return QC Submodule ====================
    {
      path: '/qc/customer-returns',
      element: <CustomerReturnQCDashboardPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
      breadcrumb: { label: 'Customer Return QC' },
    },
    {
      path: '/qc/customer-returns/:returnId',
      element: <CustomerReturnQCDetailPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
      breadcrumb: { label: 'Return QC' },
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
    {
      path: '/qc/master/print-documents',
      element: <PrintDocumentsPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
      breadcrumb: { label: 'Print Docs' },
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
      // Gate the QC module on inspection/arrival-slip perms (QC team) plus the
      // line-clearance-QC perms (the dedicated Production QC group). Line-clearance
      // QC — not production-QC — is used as the second gate on purpose: the
      // shop-floor `production_execution` group holds can_view_production_qc for
      // in-run QC, so gating on that would wrongly surface the whole QC module to
      // them; only the Production QC group holds the line-clearance-QC perms.
      // Children below are still filtered per-permission, so a Production QC user
      // sees only the Production QC + Line Clearance QA items.
      permissions: [
        QC_PERMISSIONS.INSPECTION.VIEW,
        QC_PERMISSIONS.ARRIVAL_SLIP.VIEW,
        ...lineClearanceQCPermissions,
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
            ...lineClearanceQCPermissions,
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
          path: '/qc/production/approvals',
          title: 'Production QC Approvals',
          permissions: [QC_PERMISSIONS.PRODUCTION_QC.APPROVE],
        },
        {
          path: '/qc/line-clearance',
          title: 'Line Clearance QA',
          permissions: lineClearanceQCPermissions,
        },
        {
          path: '/qc/customer-returns',
          title: 'Customer Return QC',
          permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
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
        {
          path: '/qc/master/print-documents',
          title: 'Print Documents',
          permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
        },
      ],
    },
  ],
};
