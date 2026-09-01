import { FlaskConical } from 'lucide-react';

import { QC_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

// Lazy load QC pages
const QCDashboardPage = lazy(() => import('./pages/QCDashboardPage'));

// Arrival Slips submodule
const PendingInspectionsPage = lazy(() => import('./pages/PendingInspectionsPage'));
const InspectionDetailPage = lazy(() => import('./pages/InspectionDetailPage'));
const ApprovalQueuePage = lazy(() => import('./pages/ApprovalQueuePage'));
const DecisionChangedInspectionsPage = lazy(
  () => import('./pages/DecisionChangedInspectionsPage'),
);

// Procedures submodule — controlled testing procedures
const QCProceduresPage = lazy(() => import('./pages/procedures/QCProceduresPage'));

// PDF library — controlled documents kept as the original file
const QCPdfLibraryPage = lazy(() => import('./pages/pdfLibrary/QCPdfLibraryPage'));

// Documents submodule — fillable QC record sheets
const QCDocumentsPage = lazy(() => import('./pages/documents/QCDocumentsPage'));
const QCRecordDetailPage = lazy(() => import('./pages/documents/QCRecordDetailPage'));

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
// Online Quality Monitoring submodule
const OnlineMonitoringListPage = lazy(
  () => import('./pages/onlineMonitoring/OnlineMonitoringListPage'),
);
const OnlineMonitoringRecordPage = lazy(
  () => import('./pages/onlineMonitoring/OnlineMonitoringRecordPage'),
);
const OnlineMonitoringSpecMasterPage = lazy(
  () => import('./pages/onlineMonitoring/SpecMasterPage'),
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
    {
      path: '/qc/arrival-slips/decision-changed',
      element: <DecisionChangedInspectionsPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
      breadcrumb: { label: 'Decision Changes' },
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
    // ==================== Online Quality Monitoring Submodule ====================
    {
      path: '/qc/online-monitoring',
      element: <OnlineMonitoringListPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.ONLINE_MONITORING.VIEW],
      breadcrumb: { label: 'Online Monitoring' },
    },
    {
      path: '/qc/online-monitoring/specifications',
      element: <OnlineMonitoringSpecMasterPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.ONLINE_MONITORING.VIEW],
      breadcrumb: { label: 'Specifications' },
    },
    {
      path: '/qc/online-monitoring/:recordId',
      element: <OnlineMonitoringRecordPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.ONLINE_MONITORING.VIEW],
      breadcrumb: { label: 'Record' },
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
    // ==================== Procedures Submodule ====================
    {
      path: '/qc/procedures',
      element: <QCProceduresPage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.TESTING_PROCEDURE.VIEW,
        QC_PERMISSIONS.TESTING_PROCEDURE.MANAGE,
      ],
      breadcrumb: { label: 'Procedures' },
    },

    // ==================== Documents Submodule ====================
    {
      path: '/qc/documents',
      element: <QCDocumentsPage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.QC_RECORD.VIEW,
        QC_PERMISSIONS.QC_RECORD.FILL,
        QC_PERMISSIONS.QC_RECORD.APPROVE,
      ],
      breadcrumb: { label: 'Documents' },
    },
    {
      path: '/qc/documents/records/:recordId',
      element: <QCRecordDetailPage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.QC_RECORD.VIEW,
        QC_PERMISSIONS.QC_RECORD.FILL,
        QC_PERMISSIONS.QC_RECORD.APPROVE,
      ],
      breadcrumb: { label: 'Record' },
    },

    // ==================== PDF Document Library ====================
    {
      path: '/qc/pdf-documents',
      element: <QCPdfLibraryPage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.DOCUMENT_FILE.VIEW,
        QC_PERMISSIONS.DOCUMENT_FILE.MANAGE,
      ],
      breadcrumb: { label: 'PDF Documents' },
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
        // Procedures is reachable on its own perm so a QA documentation user
        // who holds nothing else still gets the module in the sidebar. Safe to
        // add to the gate above: no existing group holds this permission.
        QC_PERMISSIONS.TESTING_PROCEDURE.VIEW,
        // Same reasoning for the record sheets: a QA operator who only fills
        // daily records still needs the module to appear.
        QC_PERMISSIONS.QC_RECORD.VIEW,
        QC_PERMISSIONS.DOCUMENT_FILE.VIEW,
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
          path: '/qc/arrival-slips/decision-changed',
          title: 'Decision Changes',
          permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
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
          path: '/qc/online-monitoring',
          title: 'Online Quality Monitoring',
          permissions: [QC_PERMISSIONS.ONLINE_MONITORING.VIEW],
        },
        {
          path: '/qc/online-monitoring/specifications',
          title: 'Water Quality Specs',
          permissions: [QC_PERMISSIONS.ONLINE_MONITORING.VIEW],
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
          path: '/qc/procedures',
          title: 'Procedures',
          permissions: [
            QC_PERMISSIONS.TESTING_PROCEDURE.VIEW,
            QC_PERMISSIONS.TESTING_PROCEDURE.MANAGE,
          ],
        },
        {
          path: '/qc/documents',
          title: 'Documents',
          permissions: [
            QC_PERMISSIONS.QC_RECORD.VIEW,
            QC_PERMISSIONS.QC_RECORD.FILL,
            QC_PERMISSIONS.QC_RECORD.APPROVE,
          ],
        },
        {
          path: '/qc/pdf-documents',
          title: 'PDF Documents',
          permissions: [
            QC_PERMISSIONS.DOCUMENT_FILE.VIEW,
            QC_PERMISSIONS.DOCUMENT_FILE.MANAGE,
          ],
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
