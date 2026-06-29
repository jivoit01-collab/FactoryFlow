import { Truck } from 'lucide-react';
import { lazy } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { BARCODE_PERMISSIONS, GATE_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

import {
  GATE_ENTRY_CREATE_PERMISSIONS,
  GATE_ENTRY_VIEW_PERMISSIONS,
} from './constants/gateEntryTypes';

// Lazy load all gate pages
const GateDashboardPage = lazy(() => import('./pages/GateDashboardPage'));
const GateNewEntryPage = lazy(() => import('./pages/GateNewEntryPage'));
const RawMaterialsDashboard = lazy(() => import('./pages/rawMaterialPages/RawMaterialsDashboard'));
const RawMaterialsPage = lazy(() => import('./pages/RawMaterialsPage'));

// Raw Materials wizard pages
const RMStep1Page = lazy(() => import('./pages/rawMaterialPages/Step1Page'));
const RMStep3Page = lazy(() => import('./pages/rawMaterialPages/Step3Page'));
const RMArrivalSlipPage = lazy(() => import('./pages/rawMaterialPages/ArrivalSlipPage'));
const RMWeighmentPage = lazy(() => import('./pages/rawMaterialPages/Step4Page'));
const RMAttachmentsPage = lazy(() => import('./pages/rawMaterialPages/AttachmentsPage'));
const RMReviewPage = lazy(() => import('./pages/rawMaterialPages/ReviewPage'));

// Daily Needs wizard pages
const DNStep1Page = lazy(() => import('./pages/dailyNeedsPages/Step1Page'));
const DNStep3Page = lazy(() => import('./pages/dailyNeedsPages/Step3Page'));
const DNAttachmentsPage = lazy(() => import('./pages/dailyNeedsPages/AttachmentsPage'));
const DNReviewPage = lazy(() => import('./pages/dailyNeedsPages/ReviewPage'));

// Maintenance wizard pages
const MaintenanceDashboard = lazy(() => import('./pages/maintenancePages/MaintenanceDashboard'));
const MaintenanceAllPage = lazy(() => import('./pages/maintenancePages/MaintenanceAllPage'));
const MNStep1Page = lazy(() => import('./pages/maintenancePages/Step1Page'));
const MNStep3Page = lazy(() => import('./pages/maintenancePages/Step3Page'));
const MNAttachmentsPage = lazy(() => import('./pages/maintenancePages/AttachmentsPage'));
const MNReviewPage = lazy(() => import('./pages/maintenancePages/ReviewPage'));

// Construction wizard pages
const ConstructionDashboard = lazy(() => import('./pages/constructionPages/ConstructionDashboard'));
const ConstructionAllPage = lazy(() => import('./pages/constructionPages/ConstructionAllPage'));
const COStep1Page = lazy(() => import('./pages/constructionPages/Step1Page'));
const COStep3Page = lazy(() => import('./pages/constructionPages/Step3Page'));
const COAttachmentsPage = lazy(() => import('./pages/constructionPages/AttachmentsPage'));
const COReviewPage = lazy(() => import('./pages/constructionPages/ReviewPage'));

// Person Gate-In pages (Visitor/Labour)
const PersonGateInDashboard = lazy(() => import('./pages/personGateInPages/PersonGateInDashboard'));
const PersonGateInAllPage = lazy(() => import('./pages/personGateInPages/PersonGateInAllPage'));
const InsideListPage = lazy(() => import('./pages/personGateInPages/InsideListPage'));
const NewEntryPage = lazy(() => import('./pages/personGateInPages/NewEntryPage'));
const EntryDetailPage = lazy(() => import('./pages/personGateInPages/EntryDetailPage'));
const VisitorsPage = lazy(() => import('./pages/personGateInPages/VisitorsPage'));
const LaboursPage = lazy(() => import('./pages/personGateInPages/LaboursPage'));
const ContractorsPage = lazy(() => import('./pages/personGateInPages/ContractorsPage'));
const ContractorLaboursPage = lazy(() => import('./pages/personGateInPages/ContractorLaboursPage'));

// Standalone gate form pages
const RejectedQCReturnDashboardPage = lazy(
  () => import('./pages/rejectedMaterialPages/RejectedQCReturnDashboardPage'),
);
const RejectedQCReturnVehiclePage = lazy(
  () => import('./pages/rejectedMaterialPages/RejectedQCReturnVehiclePage'),
);
const RejectedQCReturnItemsPage = lazy(
  () => import('./pages/rejectedMaterialPages/RejectedQCReturnItemsPage'),
);
const RejectedQCReturnWeighmentPage = lazy(
  () => import('./pages/rejectedMaterialPages/RejectedQCReturnWeighmentPage'),
);
const EmptyVehicleOutPage = lazy(() => import('./pages/emptyVehicleOutPages/EmptyVehicleOutPage'));
const EmptyVehicleOutNewPage = lazy(
  () => import('./pages/emptyVehicleOutPages/EmptyVehicleOutNewPage'),
);
const EmptyVehicleOutWeighmentPage = lazy(
  () => import('./pages/emptyVehicleOutPages/EmptyVehicleOutWeighmentPage'),
);
const EmptyVehicleOutDetailPage = lazy(
  () => import('./pages/emptyVehicleOutPages/EmptyVehicleOutDetailPage'),
);
const EmptyVehicleInPage = lazy(() => import('./pages/emptyVehicleInPages/EmptyVehicleInPage'));
const EmptyVehicleInNewPage = lazy(
  () => import('./pages/emptyVehicleInPages/EmptyVehicleInNewPage'),
);
const EmptyVehicleInWeighmentPage = lazy(
  () => import('./pages/emptyVehicleInPages/EmptyVehicleInWeighmentPage'),
);
const EmptyVehicleInAttachmentsPage = lazy(
  () => import('./pages/emptyVehicleInPages/EmptyVehicleInAttachmentsPage'),
);
const EmptyVehicleInReviewPage = lazy(
  () => import('./pages/emptyVehicleInPages/EmptyVehicleInReviewPage'),
);
const BSTOutDashboardPage = lazy(() => import('./pages/bstOutPages/BSTOutDashboardPage'));
const BSTOutNewPage = lazy(() => import('./pages/bstOutPages/BSTOutNewPage'));
const BSTOutWeighmentPage = lazy(() => import('./pages/bstOutPages/BSTOutWeighmentPage'));
const BSTOutAttachmentsPage = lazy(() => import('./pages/bstOutPages/BSTOutAttachmentsPage'));
const BSTOutReviewPage = lazy(() => import('./pages/bstOutPages/BSTOutReviewPage'));
const BSTInDashboardPage = lazy(() => import('./pages/bstInPages/BSTInDashboardPage'));
const BSTInNewPage = lazy(() => import('./pages/bstInPages/BSTInNewPage'));
const BSTInAttachmentsPage = lazy(() => import('./pages/bstInPages/BSTInAttachmentsPage'));
const BSTInReviewPage = lazy(() => import('./pages/bstInPages/BSTInReviewPage'));
const BSTReturnDashboardPage = lazy(() => import('./pages/bstReturnPages/BSTReturnDashboardPage'));
const BSTReturnNewPage = lazy(() => import('./pages/bstReturnPages/BSTReturnNewPage'));
const BSTReturnAttachmentsPage = lazy(
  () => import('./pages/bstReturnPages/BSTReturnAttachmentsPage'),
);
const BSTReturnReviewPage = lazy(() => import('./pages/bstReturnPages/BSTReturnReviewPage'));
const CustomerReturnDashboardPage = lazy(
  () => import('./pages/customerSalesFlow/CustomerReturnDashboardPage'),
);
const CustomerReturnNewPage = lazy(() => import('./pages/customerSalesFlow/CustomerReturnNewPage'));
const CustomerReturnAttachmentsPage = lazy(
  () => import('./pages/customerSalesFlow/CustomerReturnAttachmentsPage'),
);
const CustomerReturnDetailPage = lazy(
  () => import('./pages/customerSalesFlow/CustomerReturnDetailPage'),
);
const SalesDispatchDashboardPage = lazy(
  () => import('./pages/customerSalesFlow/SalesDispatchDashboardPage'),
);
const SalesDispatchGateOutWeighmentPage = lazy(
  () => import('./pages/customerSalesFlow/SalesDispatchGateOutWeighmentPage'),
);
const SalesDispatchGatepassPage = lazy(
  () => import('./pages/customerSalesFlow/SalesDispatchGatepassPage'),
);
const SalesDispatchDetailPage = lazy(
  () => import('./pages/customerSalesFlow/SalesDispatchDetailPage'),
);
const BarcodeDispatchReportsPage = lazy(
  () => import('@/modules/barcode/pages/BarcodeDispatchReportsPage'),
);
const RepairPartsOutDashboardPage = lazy(
  () => import('./pages/repairMovementPages/RepairPartsOutDashboardPage'),
);
const RepairPartsOutFormPage = lazy(
  () => import('./pages/repairMovementPages/RepairPartsOutFormPage'),
);
const RepairPartsDetailPage = lazy(
  () => import('./pages/repairMovementPages/RepairPartsDetailPage'),
);
const RepairPartsInDashboardPage = lazy(
  () => import('./pages/repairMovementPages/RepairPartsInDashboardPage'),
);
const RepairPartsInFormPage = lazy(
  () => import('./pages/repairMovementPages/RepairPartsInFormPage'),
);
const JobWorkDashboardPage = lazy(() => import('./pages/jobWorkPages/JobWorkDashboardPage'));
const JobWorkNewPage = lazy(() => import('./pages/jobWorkPages/JobWorkNewPage'));
const JobWorkWeighmentPage = lazy(() => import('./pages/jobWorkPages/JobWorkWeighmentPage'));
const JobWorkAttachmentsPage = lazy(() => import('./pages/jobWorkPages/JobWorkAttachmentsPage'));
const JobWorkReviewPage = lazy(() => import('./pages/jobWorkPages/JobWorkReviewPage'));

// Other gate entry type pages
const DailyNeedsPage = lazy(() => import('./pages/DailyNeedsPage'));
const DailyNeedsAllPage = lazy(() => import('./pages/dailyNeedsPages/DailyNeedsAllPage'));

const GATE_DASHBOARD_ACCESS_PERMISSIONS = Array.from(
  new Set([
    GATE_PERMISSIONS.DASHBOARD.VIEW,
    GATE_PERMISSIONS.GATE_ENTRY.VIEW,
    ...GATE_ENTRY_VIEW_PERMISSIONS,
  ]),
);

const GATE_NAVIGATION_PERMISSIONS = Array.from(
  new Set([
    ...GATE_DASHBOARD_ACCESS_PERMISSIONS,
    ...GATE_ENTRY_CREATE_PERMISSIONS,
    BARCODE_PERMISSIONS.VIEW_DISPATCH_REPORTS,
  ]),
);

function RedirectWithSearch({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

/**
 * Gate module configuration
 */
export const gateModuleConfig: ModuleConfig = {
  name: 'gate',
  routes: [
    // Gate Dashboard — requires gate dashboard or gate entry view permission
    {
      path: '/gate',
      element: <GateDashboardPage />,
      layout: 'main',
      permissions: GATE_DASHBOARD_ACCESS_PERMISSIONS,
      breadcrumb: { label: 'Gate' },
    },
    {
      path: '/gate/new',
      element: <GateNewEntryPage />,
      layout: 'main',
      permissions: GATE_ENTRY_CREATE_PERMISSIONS,
      breadcrumb: { label: 'New Gate Entry' },
    },

    // ── Raw Materials ────────────────────────────────────────────
    {
      path: '/gate/raw-materials',
      element: <RawMaterialsDashboard />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.VIEW, GATE_PERMISSIONS.RAW_MATERIAL.VIEW_FULL],
      breadcrumb: { label: 'RM' },
    },
    {
      path: '/gate/raw-materials/all',
      element: <RawMaterialsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.VIEW, GATE_PERMISSIONS.RAW_MATERIAL.VIEW_FULL],
    },
    // New Raw Material Entry - Steps
    {
      path: '/gate/raw-materials/new',
      element: <RMStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.CREATE, GATE_PERMISSIONS.RAW_MATERIAL.RECEIVE_PO],
    },
    {
      path: '/gate/raw-materials/new/step2',
      element: <RMStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.CREATE, GATE_PERMISSIONS.RAW_MATERIAL.RECEIVE_PO],
    },
    {
      path: '/gate/raw-materials/new/step3',
      element: <RMArrivalSlipPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.CREATE, GATE_PERMISSIONS.RAW_MATERIAL.RECEIVE_PO],
    },
    {
      path: '/gate/raw-materials/new/step4',
      element: <RMWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.CREATE, GATE_PERMISSIONS.RAW_MATERIAL.RECEIVE_PO],
    },
    {
      path: '/gate/raw-materials/new/attachments',
      element: <RMAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.CREATE, GATE_PERMISSIONS.RAW_MATERIAL.RECEIVE_PO],
    },
    {
      path: '/gate/raw-materials/new/review',
      element: <RMReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.CREATE, GATE_PERMISSIONS.RAW_MATERIAL.RECEIVE_PO],
    },
    // Edit Raw Material Entry - Steps
    {
      path: '/gate/raw-materials/edit/:entryId/step1',
      element: <RMStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.EDIT],
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step2',
      element: <RMStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.EDIT],
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step3',
      element: <RMArrivalSlipPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.EDIT],
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step4',
      element: <RMWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.EDIT],
    },
    {
      path: '/gate/raw-materials/edit/:entryId/attachments',
      element: <RMAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.EDIT],
    },
    {
      path: '/gate/raw-materials/edit/:entryId/review',
      element: <RMReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RAW_MATERIAL.EDIT],
    },

    // ── Daily Needs ──────────────────────────────────────────────
    {
      path: '/gate/daily-needs',
      element: <DailyNeedsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.VIEW, GATE_PERMISSIONS.DAILY_NEEDS.VIEW_FULL],
      breadcrumb: { label: 'Daily' },
    },
    {
      path: '/gate/daily-needs/all',
      element: <DailyNeedsAllPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.VIEW, GATE_PERMISSIONS.DAILY_NEEDS.VIEW_FULL],
    },
    // New Daily Needs Entry - Steps
    {
      path: '/gate/daily-needs/new',
      element: <DNStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.CREATE],
    },
    {
      path: '/gate/daily-needs/new/step2',
      element: <DNStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.CREATE],
    },
    {
      path: '/gate/daily-needs/new/attachments',
      element: <DNAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.CREATE],
    },
    {
      path: '/gate/daily-needs/new/review',
      element: <DNReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.CREATE],
    },
    // Edit Daily Needs Entry - Steps
    {
      path: '/gate/daily-needs/edit/:entryId/step1',
      element: <DNStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.EDIT],
    },
    {
      path: '/gate/daily-needs/edit/:entryId/step2',
      element: <DNStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.EDIT],
    },
    {
      path: '/gate/daily-needs/edit/:entryId/attachments',
      element: <DNAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.EDIT],
    },
    {
      path: '/gate/daily-needs/edit/:entryId/review',
      element: <DNReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DAILY_NEEDS.EDIT],
    },

    // ── Maintenance ──────────────────────────────────────────────
    {
      path: '/gate/maintenance',
      element: <MaintenanceDashboard />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
      breadcrumb: { label: 'Maint.' },
    },
    {
      path: '/gate/maintenance/all',
      element: <MaintenanceAllPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
    },
    // New Maintenance Entry - Steps
    {
      path: '/gate/maintenance/new',
      element: <MNStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.CREATE],
    },
    {
      path: '/gate/maintenance/new/step2',
      element: <MNStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.CREATE],
    },
    {
      path: '/gate/maintenance/new/attachments',
      element: <MNAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.CREATE],
    },
    {
      path: '/gate/maintenance/new/review',
      element: <MNReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.CREATE],
    },
    // Edit Maintenance Entry - Steps
    {
      path: '/gate/maintenance/edit/:entryId/step1',
      element: <MNStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.EDIT],
    },
    {
      path: '/gate/maintenance/edit/:entryId/step2',
      element: <MNStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.EDIT],
    },
    {
      path: '/gate/maintenance/edit/:entryId/attachments',
      element: <MNAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.EDIT],
    },
    {
      path: '/gate/maintenance/edit/:entryId/review',
      element: <MNReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.MAINTENANCE.EDIT],
    },

    // ── Construction ─────────────────────────────────────────────
    {
      path: '/gate/construction/new',
      element: <COStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.CREATE],
    },
    {
      path: '/gate/construction/new/step2',
      element: <COStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.CREATE],
    },
    {
      path: '/gate/construction/new/attachments',
      element: <COAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.CREATE],
    },
    {
      path: '/gate/construction/new/review',
      element: <COReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.CREATE],
    },
    // Edit Construction Entry - Steps
    {
      path: '/gate/construction/edit/:entryId/step1',
      element: <COStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.EDIT],
    },
    {
      path: '/gate/construction/edit/:entryId/step2',
      element: <COStep3Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.EDIT],
    },
    {
      path: '/gate/construction/edit/:entryId/attachments',
      element: <COAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.EDIT],
    },
    {
      path: '/gate/construction/edit/:entryId/review',
      element: <COReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.EDIT],
    },
    {
      path: '/gate/construction',
      element: <ConstructionDashboard />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.VIEW, GATE_PERMISSIONS.CONSTRUCTION.VIEW_FULL],
      breadcrumb: { label: 'Const.' },
    },
    {
      path: '/gate/construction/all',
      element: <ConstructionAllPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CONSTRUCTION.VIEW, GATE_PERMISSIONS.CONSTRUCTION.VIEW_FULL],
    },

    // ── Person Gate-In (Visitor/Labour) ──────────────────────────
    {
      path: '/gate/visitor-labour',
      element: <PersonGateInDashboard />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
      breadcrumb: { label: 'Visitors' },
    },
    {
      path: '/gate/visitor-labour/all',
      element: <PersonGateInAllPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    },
    {
      path: '/gate/visitor-labour/inside',
      element: <InsideListPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    },
    {
      path: '/gate/visitor-labour/new',
      element: <NewEntryPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.CREATE],
    },
    {
      path: '/gate/visitor-labour/entry/:entryId',
      element: <EntryDetailPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    },
    {
      path: '/gate/visitor-labour/visitors',
      element: <VisitorsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    },
    {
      path: '/gate/visitor-labour/labours',
      element: <LaboursPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    },
    {
      path: '/gate/visitor-labour/contractors',
      element: <ContractorsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    },
    {
      path: '/gate/visitor-labour/contractor/:contractorId/labours',
      element: <ContractorLaboursPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    },

    // New standalone gate submodule forms
    {
      path: '/gate/rejected-qc-return',
      element: <RejectedQCReturnDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW],
      breadcrumb: { label: 'Rejected QC' },
    },
    {
      path: '/gate/rejected-qc-return/new',
      element: <RejectedQCReturnVehiclePage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
        GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
      ],
      breadcrumb: { label: 'Rejected QC' },
    },
    {
      path: '/gate/rejected-qc-return/new/items',
      element: <RejectedQCReturnItemsPage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
        GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
      ],
      breadcrumb: { label: 'Rejected QC Items' },
    },
    {
      path: '/gate/rejected-qc-return/new/weighment',
      element: <RejectedQCReturnWeighmentPage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
        GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
      ],
      breadcrumb: { label: 'Rejected QC Weighment' },
    },
    {
      path: '/gate/rejected-materials',
      element: <RejectedQCReturnDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW],
      breadcrumb: { label: 'Rejected QC' },
    },
    {
      path: '/gate/rejected-materials/new',
      element: <RejectedQCReturnVehiclePage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
        GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
      ],
      breadcrumb: { label: 'Rejected QC' },
    },
    {
      path: '/gate/rejected-materials/new/items',
      element: <RejectedQCReturnItemsPage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
        GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
      ],
      breadcrumb: { label: 'Rejected QC Items' },
    },
    {
      path: '/gate/rejected-materials/new/weighment',
      element: <RejectedQCReturnWeighmentPage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
        GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
      ],
      breadcrumb: { label: 'Rejected QC Weighment' },
    },
    {
      path: '/gate/empty-vehicle-in',
      element: <EmptyVehicleInPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.VIEW],
      breadcrumb: { label: 'Empty Vehicle In' },
    },
    {
      path: '/gate/empty-vehicle-in/new',
      element: <EmptyVehicleInNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE],
      breadcrumb: { label: 'New Empty Vehicle In' },
    },
    {
      path: '/gate/empty-vehicle-in/new/weighment',
      element: <EmptyVehicleInWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE],
      breadcrumb: { label: 'Empty Vehicle In Weighment' },
    },
    {
      path: '/gate/empty-vehicle-in/new/attachments',
      element: <EmptyVehicleInAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE],
      breadcrumb: { label: 'Empty Vehicle In Attachments' },
    },
    {
      path: '/gate/empty-vehicle-in/new/review',
      element: <EmptyVehicleInReviewPage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE,
        GATE_PERMISSIONS.EMPTY_VEHICLE_IN.VIEW,
      ],
      breadcrumb: { label: 'Empty Vehicle In Review' },
    },
    {
      path: '/gate/empty-vehicle-out',
      element: <EmptyVehicleOutPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.VIEW],
      breadcrumb: { label: 'Empty Vehicle Out' },
    },
    {
      path: '/gate/empty-vehicle-out/new',
      element: <EmptyVehicleOutNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.CREATE],
      breadcrumb: { label: 'New Empty Vehicle Out' },
    },
    {
      path: '/gate/empty-vehicle-out/new/weighment',
      element: <EmptyVehicleOutWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.CREATE],
      breadcrumb: { label: 'Empty Vehicle Out Weighment' },
    },
    {
      path: '/gate/empty-vehicle-out/:entryId',
      element: <EmptyVehicleOutDetailPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.VIEW],
      breadcrumb: { label: 'Empty Vehicle Out Entry' },
    },
    {
      path: '/gate/bst-out',
      element: <BSTOutDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.VIEW],
      breadcrumb: { label: 'BST Out' },
    },
    {
      path: '/gate/bst-out/new/gatepass',
      element: <SalesDispatchGatepassPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.VIEW],
      breadcrumb: { label: 'BST Out' },
    },
    {
      path: '/gate/bst-out/new/weighment',
      element: <SalesDispatchGateOutWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.VIEW],
      breadcrumb: { label: 'BST Out Weighment' },
    },
    {
      path: '/gate/bst-out/new',
      element: <Navigate to="/dispatch/docking/new?documentType=STOCK_TRANSFER" replace />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.CREATE],
      breadcrumb: { label: 'New Docking' },
    },
    {
      path: '/gate/bst-out/new/step2',
      element: <BSTOutWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.CREATE],
      breadcrumb: { label: 'BST Weighment' },
    },
    {
      path: '/gate/bst-out/new/attachments',
      element: <BSTOutAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.CREATE],
      breadcrumb: { label: 'BST Attachments' },
    },
    {
      path: '/gate/bst-out/new/review',
      element: <BSTOutReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.CREATE, GATE_PERMISSIONS.BST_OUT.COMPLETE],
      breadcrumb: { label: 'BST Review' },
    },
    {
      path: '/gate/bst-in',
      element: <BSTInDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_IN.VIEW],
      breadcrumb: { label: 'BST In' },
    },
    {
      path: '/gate/bst-in/new',
      element: <BSTInNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_IN.CREATE],
      breadcrumb: { label: 'New BST In' },
    },
    {
      path: '/gate/bst-in/new/step1',
      element: <BSTInNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_IN.CREATE],
      breadcrumb: { label: 'New BST In' },
    },
    {
      path: '/gate/bst-in/new/attachments',
      element: <BSTInAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_IN.CREATE],
      breadcrumb: { label: 'BST In Attachments' },
    },
    {
      path: '/gate/bst-in/new/review',
      element: <BSTInReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_IN.CREATE, GATE_PERMISSIONS.BST_IN.COMPLETE],
      breadcrumb: { label: 'BST In Review' },
    },
    {
      path: '/gate/bst-return',
      element: <BSTReturnDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_RETURN.VIEW],
      breadcrumb: { label: 'BST Return' },
    },
    {
      path: '/gate/bst-return/new',
      element: <BSTReturnNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_RETURN.CREATE],
      breadcrumb: { label: 'New BST Return' },
    },
    {
      path: '/gate/bst-return/new/step1',
      element: <BSTReturnNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_RETURN.CREATE],
      breadcrumb: { label: 'New BST Return' },
    },
    {
      path: '/gate/bst-return/new/attachments',
      element: <BSTReturnAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_RETURN.CREATE],
      breadcrumb: { label: 'BST Return Attachments' },
    },
    {
      path: '/gate/bst-return/new/review',
      element: <BSTReturnReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_RETURN.CREATE, GATE_PERMISSIONS.BST_RETURN.COMPLETE],
      breadcrumb: { label: 'BST Return Review' },
    },
    {
      path: '/gate/customer-return',
      element: <CustomerReturnDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CUSTOMER_RETURN.VIEW],
      breadcrumb: { label: 'Goods Return' },
    },
    {
      path: '/gate/customer-return/new',
      element: <CustomerReturnNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CUSTOMER_RETURN.CREATE],
      breadcrumb: { label: 'New Goods Return' },
    },
    {
      path: '/gate/customer-return/new/attachments',
      element: <CustomerReturnAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CUSTOMER_RETURN.CREATE],
      breadcrumb: { label: 'Goods Return Attachments' },
    },
    {
      path: '/gate/customer-return/:entryId',
      element: <CustomerReturnDetailPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.CUSTOMER_RETURN.VIEW],
      breadcrumb: { label: 'Goods Return Entry' },
    },
    {
      path: '/gate/sales-dispatch',
      element: <SalesDispatchDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
      breadcrumb: { label: 'Sales Dispatch Out' },
    },
    {
      path: '/gate/sales-dispatch/new',
      element: <RedirectWithSearch to="/dispatch/docking/new" />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'New Docking' },
    },
    {
      path: '/gate/sales-dispatch/new/weighment',
      element: <SalesDispatchGateOutWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.DISPATCH],
      breadcrumb: { label: 'Sales Dispatch Out Weighment' },
    },
    {
      path: '/gate/sales-dispatch/new/barcode-scan',
      element: <RedirectWithSearch to="/dispatch/docking/new/barcode-scan" />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'Docking Box Scanning' },
    },
    {
      path: '/gate/sales-dispatch/new/attachments',
      element: <RedirectWithSearch to="/dispatch/docking/new/attachments" />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.CREATE],
      breadcrumb: { label: 'Docking Attachments' },
    },
    {
      path: '/gate/sales-dispatch/new/gatepass',
      element: <SalesDispatchGatepassPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
      breadcrumb: { label: 'Sales Dispatch Out' },
    },
    {
      path: '/gate/sales-dispatch/barcode-reports',
      element: <BarcodeDispatchReportsPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_DISPATCH_REPORTS],
      breadcrumb: { label: 'Barcode Dispatch Reports' },
    },
    {
      path: '/gate/sales-dispatch/:entryId',
      element: <SalesDispatchDetailPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
      breadcrumb: { label: 'Docking Entry' },
    },
    {
      path: '/gate/repair-movement',
      element: <Navigate to="/gate/repair-parts-out" replace />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
      breadcrumb: { label: 'Repair' },
    },
    {
      path: '/gate/repair-parts-out',
      element: <RepairPartsOutDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
      breadcrumb: { label: 'Repair Parts Out' },
    },
    {
      path: '/gate/repair-parts-out/new',
      element: <RepairPartsOutFormPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
      breadcrumb: { label: 'New Repair Parts Out' },
    },
    {
      path: '/gate/repair-parts-out/:entryId',
      element: <RepairPartsDetailPage direction="out" />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
      breadcrumb: { label: 'Repair Parts Out Entry' },
    },
    {
      path: '/gate/repair-parts-in',
      element: <RepairPartsInDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
      breadcrumb: { label: 'Repair Parts In' },
    },
    {
      path: '/gate/repair-parts-in/new',
      element: <RepairPartsInFormPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
      breadcrumb: { label: 'New Repair Parts In' },
    },
    {
      path: '/gate/repair-parts-in/:entryId',
      element: <RepairPartsDetailPage direction="in" />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
      breadcrumb: { label: 'Repair Parts In Entry' },
    },
    {
      path: '/gate/job-work',
      element: <JobWorkDashboardPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DASHBOARD.VIEW, GATE_PERMISSIONS.JOB_WORK.VIEW],
      breadcrumb: { label: 'Job Work' },
    },
    {
      path: '/gate/job-work/new',
      element: <JobWorkNewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DASHBOARD.VIEW, GATE_PERMISSIONS.JOB_WORK.CREATE],
      breadcrumb: { label: 'New Job Work' },
    },
    {
      path: '/gate/job-work/new/step2',
      element: <JobWorkWeighmentPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DASHBOARD.VIEW, GATE_PERMISSIONS.JOB_WORK.CREATE],
      breadcrumb: { label: 'Job Work Weighment' },
    },
    {
      path: '/gate/job-work/new/attachments',
      element: <JobWorkAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.DASHBOARD.VIEW, GATE_PERMISSIONS.JOB_WORK.CREATE],
      breadcrumb: { label: 'Job Work Attachments' },
    },
    {
      path: '/gate/job-work/new/review',
      element: <JobWorkReviewPage />,
      layout: 'main',
      permissions: [
        GATE_PERMISSIONS.DASHBOARD.VIEW,
        GATE_PERMISSIONS.JOB_WORK.VIEW,
        GATE_PERMISSIONS.JOB_WORK.CREATE,
        GATE_PERMISSIONS.JOB_WORK.COMPLETE,
      ],
      breadcrumb: { label: 'Job Work Review' },
    },
  ],
  navigation: [
    {
      path: '/gate',
      title: 'Gate',
      icon: Truck,
      showInSidebar: true,
      permissions: GATE_NAVIGATION_PERMISSIONS,
      hasSubmenu: true,
      children: [
        {
          path: '/gate',
          title: 'Dashboard',
          permissions: GATE_DASHBOARD_ACCESS_PERMISSIONS,
        },
        {
          path: '/gate/new',
          title: 'New Entry',
          permissions: GATE_ENTRY_CREATE_PERMISSIONS,
        },
        {
          path: '/gate/sales-dispatch/barcode-reports',
          title: 'Barcode Dispatch Reports',
          permissions: [BARCODE_PERMISSIONS.VIEW_DISPATCH_REPORTS],
        },
      ],
    },
  ],
};
