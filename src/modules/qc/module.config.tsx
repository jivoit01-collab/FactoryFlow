import { FlaskConical } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { QC_PERMISSIONS } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import {
  LineClearanceQABadge,
  PendingApprovalsBadge,
  ProductionQCBadge,
} from './components/QCSidebarBadges';
import { RedirectPathPrefix } from './components/RedirectPathPrefix';
import { RedirectWithSearch } from './components/RedirectWithSearch';
import {
  APPROVAL_PERMISSIONS,
  LINE_CLEARANCE_QC_PERMISSIONS,
  MASTER_PERMISSIONS,
  MASTER_TABS,
  PRINT_DOCUMENT_PERMISSIONS,
  PRODUCTION_QC_ENTRY_PERMISSIONS,
  QA_PROCEDURES_PERMISSIONS,
  QC_HOME_CANDIDATES,
} from './constants/qcSections';

// `/qc` and `/qc/master` open the first page of their section the user may see
const QCSectionRedirect = lazy(() => import('./pages/QCSectionRedirect'));

// Arrival Slips submodule
const PendingInspectionsPage = lazy(() => import('./pages/PendingInspectionsPage'));
const InspectionDetailPage = lazy(() => import('./pages/InspectionDetailPage'));
const ApprovalQueuePage = lazy(() => import('./pages/ApprovalQueuePage'));
const DecisionChangedInspectionsPage = lazy(() => import('./pages/DecisionChangedInspectionsPage'));

// QA Reports submodule — the records QC maintains, approved by a QC lead
const ProductionQCDashboardPage = lazy(
  () => import('./pages/productionQC/ProductionQCDashboardPage'),
);
const ProductionQCEntryPage = lazy(() => import('./pages/productionQC/ProductionQCEntryPage'));
const ProductionQCEntryDetailPage = lazy(
  () => import('./pages/productionQC/ProductionQCEntryDetailPage'),
);
const ProductionParameterTypesPage = lazy(
  () => import('./pages/productionQC/ProductionParameterTypesPage'),
);
const ProductionParameterTypePage = lazy(
  () => import('./pages/productionQC/ProductionParameterTypePage'),
);

// QA Procedures — controlled documents kept as the original PDF file
const QAProceduresPage = lazy(() => import('./pages/qaProcedures/QAProceduresPage'));
const QAProcedureLogPage = lazy(() => import('./pages/qaProcedures/QAProcedureLogPage'));

// Master Data (shared)
const MaterialTypesPage = lazy(() => import('./pages/masterdata/MaterialTypesPage'));
const QCParametersPage = lazy(() => import('./pages/masterdata/QCParametersPage'));
const PrintDocumentsPage = lazy(() => import('./pages/masterdata/PrintDocumentsPage'));

// Line Clearance QA submodule
const LineClearanceQAPage = lazy(() => import('./pages/LineClearanceQAPage'));

// Everything the module's pages are gated on. The sidebar shows the module to
// exactly these users, so nobody gets a Quality Control menu with nothing in it.
const QC_MODULE_PERMISSIONS = [
  QC_PERMISSIONS.INSPECTION.VIEW,
  ...APPROVAL_PERMISSIONS,
  ...PRODUCTION_QC_ENTRY_PERMISSIONS,
  QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS,
  ...LINE_CLEARANCE_QC_PERMISSIONS,
  ...QA_PROCEDURES_PERMISSIONS,
  // The audit log is deliberately held on its own, without the rights to view
  // or manage the library. It has no sidebar item: it is opened from the
  // Audit log button on QA Procedures, and a user holding only this lands on
  // it from `/qc`.
  QC_PERMISSIONS.DOCUMENT_FILE.VIEW_AUDIT,
  ...MASTER_PERMISSIONS,
];

/**
 * Quality Control module configuration
 *
 * Sidebar areas (one item each; an area of several pages has a tab bar across
 * them, see constants/qcSections.ts):
 * 1. Arrival Slips — inspections, the chemist / QAM approval queues, decision
 *    changes, and the masters they run on: material types and QC parameters
 * 2. QA Reports — the records QC maintains and their approval; the report types
 * 3. Line Clearance — QA approval of pre-production line clearances
 * 4. QA Procedures — controlled procedures kept as the original PDF
 * 5. Master Data — print documents: every printed form's document number
 */
export const qcModuleConfig: ModuleConfig = {
  name: 'qc',
  routes: [
    {
      path: '/qc',
      element: <QCSectionRedirect candidates={QC_HOME_CANDIDATES} />,
      layout: 'main',
      permissions: QC_MODULE_PERMISSIONS,
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
      permissions: APPROVAL_PERMISSIONS,
      breadcrumb: { label: 'Approvals' },
    },
    {
      path: '/qc/arrival-slips/decision-changed',
      element: <DecisionChangedInspectionsPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
      breadcrumb: { label: 'Decision Changes' },
    },
    {
      path: '/qc/arrival-slips/material-types',
      element: <MaterialTypesPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES],
      breadcrumb: { label: 'Material Types' },
    },
    {
      path: '/qc/arrival-slips/parameters',
      element: <QCParametersPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
      breadcrumb: { label: 'QC Parameters' },
    },

    // ==================== QA Reports Submodule ====================
    // The records QC maintains ("production QC" in code). Not tied to production.
    {
      path: '/qc/qa-reports',
      element: <ProductionQCDashboardPage />,
      layout: 'main',
      permissions: PRODUCTION_QC_ENTRY_PERMISSIONS,
      breadcrumb: { label: 'QA Reports' },
    },
    {
      // Opened from the New dialog as ?type=<report type id>
      path: '/qc/qa-reports/new',
      element: <ProductionQCEntryPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.FILL],
      breadcrumb: { label: 'New Entry' },
    },
    {
      path: '/qc/qa-reports/entries/:entryId',
      element: <ProductionQCEntryDetailPage />,
      layout: 'main',
      permissions: PRODUCTION_QC_ENTRY_PERMISSIONS,
      breadcrumb: { label: 'Entry' },
    },
    {
      // The same form as a new entry; saving sends it back for approval.
      path: '/qc/qa-reports/entries/:entryId/edit',
      element: <ProductionQCEntryPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.FILL],
      breadcrumb: { label: 'Edit' },
    },
    {
      path: '/qc/qa-reports/types',
      element: <ProductionParameterTypesPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS],
      breadcrumb: { label: 'Report Types' },
    },
    {
      // One report type and its parameters.
      path: '/qc/qa-reports/types/:typeId',
      element: <ProductionParameterTypePage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS],
      breadcrumb: { label: 'Type' },
    },
    // The submodule was Production QC at /qc/production, then Documents at
    // /qc/documents; both sets of old addresses redirect.
    ...[
      '/qc/documents',
      '/qc/documents/new',
      '/qc/documents/entries/:entryId',
      '/qc/documents/entries/:entryId/edit',
    ].map((path) => ({
      path,
      element: <RedirectPathPrefix from="/qc/documents" to="/qc/qa-reports" />,
      layout: 'main' as const,
      permissions: PRODUCTION_QC_ENTRY_PERMISSIONS,
    })),
    ...['/qc/documents/types', '/qc/documents/types/:typeId'].map((path) => ({
      path,
      element: <RedirectPathPrefix from="/qc/documents" to="/qc/qa-reports" />,
      layout: 'main' as const,
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS],
    })),
    ...[
      '/qc/production',
      '/qc/production/new',
      '/qc/production/entries/:entryId',
      '/qc/production/entries/:entryId/edit',
    ].map((path) => ({
      path,
      element: <RedirectPathPrefix from="/qc/production" to="/qc/qa-reports" />,
      layout: 'main' as const,
      permissions: PRODUCTION_QC_ENTRY_PERMISSIONS,
    })),
    ...['/qc/production/parameter-types', '/qc/production/parameter-types/:typeId'].map((path) => ({
      path,
      element: (
        <RedirectPathPrefix from="/qc/production/parameter-types" to="/qc/qa-reports/types" />
      ),
      layout: 'main' as const,
      permissions: [QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS],
    })),

    // ==================== Line Clearance QA Submodule ====================
    {
      path: '/qc/line-clearance',
      element: <LineClearanceQAPage />,
      layout: 'main',
      permissions: LINE_CLEARANCE_QC_PERMISSIONS,
    },

    // ==================== QA Procedures (PDF library) ====================
    {
      path: '/qc/qa-procedures',
      element: <QAProceduresPage />,
      layout: 'main',
      permissions: QA_PROCEDURES_PERMISSIONS,
      breadcrumb: { label: 'QA Procedures' },
    },
    {
      // Gated on the audit permission alone: whoever may upload a procedure is
      // not thereby entitled to read the trail of who changed it.
      path: '/qc/qa-procedures/log',
      element: <QAProcedureLogPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.DOCUMENT_FILE.VIEW_AUDIT],
      breadcrumb: { label: 'Audit Log' },
    },

    // ==================== Masters ====================
    {
      path: '/qc/master',
      element: <QCSectionRedirect candidates={MASTER_TABS} />,
      layout: 'main',
      permissions: PRINT_DOCUMENT_PERMISSIONS,
      breadcrumb: { label: 'Master Data' },
    },
    // Material types and QC parameters are tabs of Arrival Slips now; the old
    // addresses redirect, keeping `?materialType=` and the like.
    {
      path: '/qc/master/material-types',
      element: <RedirectWithSearch to="/qc/arrival-slips/material-types" />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES],
    },
    {
      path: '/qc/master/parameters',
      element: <RedirectWithSearch to="/qc/arrival-slips/parameters" />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
    },
    {
      path: '/qc/master/print-documents',
      element: <PrintDocumentsPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
      breadcrumb: { label: 'Print Documents' },
    },

    // ==================== Legacy routes ====================
    // Old bookmarks keep working. The list pages redirect, so the tab bar and
    // sidebar light up; the detail pages render in place (their ids are params).
    {
      path: '/qc/pending',
      element: <Navigate to="/qc/arrival-slips" replace />,
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
      element: <Navigate to="/qc/arrival-slips/approvals" replace />,
      layout: 'main',
      permissions: APPROVAL_PERMISSIONS,
    },
    // The PDF library used to live at /qc/pdf-documents.
    {
      path: '/qc/pdf-documents',
      element: <Navigate to="/qc/qa-procedures" replace />,
      layout: 'main',
      permissions: QA_PROCEDURES_PERMISSIONS,
    },
  ],
  navigation: [
    {
      path: '/qc',
      title: 'Quality Control',
      icon: FlaskConical,
      showInSidebar: true,
      // The line-clearance-QC perms are held only by QC groups (Production QC,
      // qc_manager) — not by the shop-floor `production_execution` group — so
      // gating on them does not surface this module to the shop floor.
      permissions: QC_MODULE_PERMISSIONS,
      hasSubmenu: true,
      children: [
        {
          path: '/qc/arrival-slips',
          title: 'Arrival Slips',
          permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
          badge: PendingApprovalsBadge,
        },
        {
          path: '/qc/qa-reports',
          title: 'QA Reports',
          permissions: PRODUCTION_QC_ENTRY_PERMISSIONS,
          badge: ProductionQCBadge,
        },
        {
          path: '/qc/line-clearance',
          title: 'Line Clearance',
          permissions: LINE_CLEARANCE_QC_PERMISSIONS,
          badge: LineClearanceQABadge,
        },
        {
          path: '/qc/qa-procedures',
          title: 'QA Procedures',
          permissions: QA_PROCEDURES_PERMISSIONS,
        },
        {
          path: '/qc/master',
          title: 'Master Data',
          permissions: PRINT_DOCUMENT_PERMISSIONS,
        },
      ],
    },
  ],
};
