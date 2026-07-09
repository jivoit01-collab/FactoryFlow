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
// Warehouse-driven BST gate-out (verify warehouse approval + mark vehicle out).
const BSTGateOutListPage = lazy(() => import('./pages/bstGate/BSTGateOutListPage'));
const BSTGateOutReviewPage = lazy(() => import('./pages/bstGate/BSTGateOutReviewPage'));
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

// Fixed Assets wizard pages
const FixedAssetsDashboard = lazy(() => import('./pages/fixedAssetsPages/FixedAssetsDashboard'));
const FixedAssetsAllPage = lazy(() => import('./pages/fixedAssetsPages/FixedAssetsAllPage'));
const FAStep1Page = lazy(() => import('./pages/fixedAssetsPages/Step1Page'));
const FAStep2Page = lazy(() => import('./pages/fixedAssetsPages/Step2Page'));
const FAAttachmentsPage = lazy(() => import('./pages/fixedAssetsPages/AttachmentsPage'));
const FAReviewPage = lazy(() => import('./pages/fixedAssetsPages/ReviewPage'));

// Labour count (casual daily-labour register)
const LabourCountPage = lazy(() => import('./pages/labourPages/LabourCountPage'));
const LabourGatePage = lazy(() => import('./pages/labourPages/LabourGatePage'));

// Labour gate — entry (department + contractor + count) and the out board.
// The same entry screen is also exposed by the top-level Labour module.
const GateLabourInPage = lazy(() => import('./pages/labourGatePages/GateLabourInPage'));
const LabourOutPage = lazy(() => import('./pages/labourGatePages/LabourOutPage'));

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
const CrossCompanyArrivalPage = lazy(
  () => import('./pages/emptyVehicleInPages/CrossCompanyArrivalPage'),
);
const ArrivalGatepassPage = lazy(
  () => import('./pages/emptyVehicleInPages/ArrivalGatepassPage'),
);
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
const ReturnOutListPage = lazy(() => import('./pages/returnablePages/ReturnOutListPage'));
const ReturnOutFormPage = lazy(() => import('./pages/returnablePages/ReturnOutFormPage'));
const ReturnInListPage = lazy(() => import('./pages/returnablePages/ReturnInListPage'));
const ReturnInFormPage = lazy(() => import('./pages/returnablePages/ReturnInFormPage'));
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

    // ── Fixed Assets ─────────────────────────────────────────────
    {
      path: '/gate/fixed-assets/new',
      element: <FAStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.CREATE],
    },
    {
      path: '/gate/fixed-assets/new/step2',
      element: <FAStep2Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.CREATE],
    },
    {
      path: '/gate/fixed-assets/new/attachments',
      element: <FAAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.CREATE],
    },
    {
      path: '/gate/fixed-assets/new/review',
      element: <FAReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.CREATE],
    },
    // Edit Fixed Asset Entry - Steps
    {
      path: '/gate/fixed-assets/edit/:entryId/step1',
      element: <FAStep1Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.EDIT],
    },
    {
      path: '/gate/fixed-assets/edit/:entryId/step2',
      element: <FAStep2Page />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.EDIT],
    },
    {
      path: '/gate/fixed-assets/edit/:entryId/attachments',
      element: <FAAttachmentsPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.EDIT],
    },
    {
      path: '/gate/fixed-assets/edit/:entryId/review',
      element: <FAReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.EDIT],
    },
    {
      path: '/gate/fixed-assets',
      element: <FixedAssetsDashboard />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.VIEW],
      breadcrumb: { label: 'Assets' },
    },
    {
      path: '/gate/fixed-assets/all',
      element: <FixedAssetsAllPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.FIXED_ASSET.VIEW],
    },

    // ── Daily Labour Count ───────────────────────────────────────
    {
      path: '/gate/labour',
      element: <LabourCountPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.LABOUR_COUNT.SUBMIT],
      breadcrumb: { label: 'Labour' },
    },
    {
      path: '/gate/labour/verify',
      element: <LabourGatePage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.LABOUR_COUNT.VERIFY],
      breadcrumb: { label: 'Labour Verify' },
    },

    // ── Labour In (entry) + Labour Out (gate board) ──────────────
    {
      path: '/gate/labour-in',
      element: <GateLabourInPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.LABOUR_GATE.RECORD_IN, GATE_PERMISSIONS.LABOUR_GATE.VIEW],
      breadcrumb: { label: 'Labour In' },
    },
    {
      path: '/gate/labour-out',
      element: <LabourOutPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.LABOUR_GATE.RECORD_OUT, GATE_PERMISSIONS.LABOUR_GATE.VIEW],
      breadcrumb: { label: 'Labour Out' },
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
      path: '/gate/arrivals',
      element: <CrossCompanyArrivalPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE],
      breadcrumb: { label: 'Cross-Company Arrival' },
    },
    {
      path: '/gate/arrivals/:arrivalId/gatepass',
      element: <ArrivalGatepassPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE],
      breadcrumb: { label: 'Combined Gatepass' },
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
      element: <BSTGateOutListPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.VIEW],
      breadcrumb: { label: 'BST Out' },
    },
    {
      path: '/gate/bst-out/:transferId',
      element: <BSTGateOutReviewPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.BST_OUT.VIEW],
      breadcrumb: { label: 'BST Out' },
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
    // Returnable gate pass — the gate-side halves of a document the department owns.
    {
      path: '/gate/return-out',
      element: <ReturnOutListPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RETURNABLE.GATE_OUT],
      breadcrumb: { label: 'Returnable Gate Out' },
    },
    {
      path: '/gate/return-out/:passId',
      element: <ReturnOutFormPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RETURNABLE.GATE_OUT],
      breadcrumb: { label: 'Gate Out Returnable' },
    },
    {
      path: '/gate/return-in',
      element: <ReturnInListPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RETURNABLE.GATE_IN],
      breadcrumb: { label: 'Returnable Gate In' },
    },
    {
      path: '/gate/return-in/:passId',
      element: <ReturnInFormPage />,
      layout: 'main',
      permissions: [GATE_PERMISSIONS.RETURNABLE.GATE_IN],
      breadcrumb: { label: 'Record Returnable Return' },
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
          path: '/gate/arrivals',
          title: 'Cross-Company Arrivals',
          permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.CREATE],
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
