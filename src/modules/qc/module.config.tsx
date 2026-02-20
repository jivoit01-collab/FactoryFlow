import { FlaskConical } from 'lucide-react';
import { lazy } from 'react';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// Lazy load QC pages
const QCDashboardPage = lazy(() => import('./pages/QCDashboardPage'));
const PendingInspectionsPage = lazy(() => import('./pages/PendingInspectionsPage'));
const InspectionDetailPage = lazy(() => import('./pages/InspectionDetailPage'));
const ApprovalQueuePage = lazy(() => import('./pages/ApprovalQueuePage'));
const MaterialTypesPage = lazy(() => import('./pages/masterdata/MaterialTypesPage'));
const QCParametersPage = lazy(() => import('./pages/masterdata/QCParametersPage'));

/**
 * Quality Control module configuration
 *
 * Route permissions: Controls who can access each page (ProtectedRoute)
 * Navigation permissions: Controls what appears in sidebar and dashboard cards
 */
export const qcModuleConfig: ModuleConfig = {
  name: 'qc',
  routes: [
    // Dashboard - requires any QC view permission
    {
      path: '/qc',
      element: <QCDashboardPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW, QC_PERMISSIONS.ARRIVAL_SLIP.VIEW],
    },
    // Pending Inspections - requires inspection view permission
    {
      path: '/qc/pending',
      element: <PendingInspectionsPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
    },
    // Create new inspection for arrival slip - requires create permission
    {
      path: '/qc/inspections/:slipId/new',
      element: <InspectionDetailPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.CREATE],
    },
    // View/Edit inspection - requires view permission (edit checked in component)
    {
      path: '/qc/inspections/:inspectionId',
      element: <InspectionDetailPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
    },
    // Approval Queue - requires any approval permission
    {
      path: '/qc/approvals',
      element: <ApprovalQueuePage />,
      layout: 'main',
      permissions: [
        QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST,
        QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM,
      ],
    },
    // Master Data - Material Types - requires master data permission
    {
      path: '/qc/master/material-types',
      element: <MaterialTypesPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES],
    },
    // Master Data - QC Parameters - requires master data permission
    {
      path: '/qc/master/parameters',
      element: <QCParametersPage />,
      layout: 'main',
      permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
    },
  ],
  navigation: [
    {
      path: '/qc',
      title: 'Quality Control',
      icon: FlaskConical,
      showInSidebar: true,
      permissions: [QC_PERMISSIONS.INSPECTION.VIEW, QC_PERMISSIONS.ARRIVAL_SLIP.VIEW],
      hasSubmenu: true,
      children: [
        {
          path: '/qc',
          title: 'Dashboard',
          permissions: [QC_PERMISSIONS.INSPECTION.VIEW, QC_PERMISSIONS.ARRIVAL_SLIP.VIEW],
        },
        {
          path: '/qc/pending',
          title: 'Pending Inspections',
          permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
        },
        {
          path: '/qc/approvals',
          title: 'Approvals',
          permissions: [
            QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST,
            QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM,
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
      ],
    },
  ],
};
