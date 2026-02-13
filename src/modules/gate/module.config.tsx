import { Truck } from 'lucide-react'
import { lazy } from 'react'

import type { ModuleConfig } from '@/core/types'

// Lazy load all gate pages
const GateDashboardPage = lazy(() => import('./pages/GateDashboardPage'))
const RawMaterialsDashboard = lazy(() => import('./pages/rawMaterialPages/RawMaterialsDashboard'))
const RawMaterialsPage = lazy(() => import('./pages/RawMaterialsPage'))

// Raw Materials wizard pages
const RMStep1Page = lazy(() => import('./pages/rawMaterialPages/Step1Page'))
const RMStep2Page = lazy(() => import('./pages/rawMaterialPages/Step2Page'))
const RMStep3Page = lazy(() => import('./pages/rawMaterialPages/Step3Page'))
const RMArrivalSlipPage = lazy(() => import('./pages/rawMaterialPages/ArrivalSlipPage'))
const RMWeighmentPage = lazy(() => import('./pages/rawMaterialPages/Step4Page'))
const RMAttachmentsPage = lazy(() => import('./pages/rawMaterialPages/AttachmentsPage'))
const RMReviewPage = lazy(() => import('./pages/rawMaterialPages/ReviewPage'))

// Daily Needs wizard pages
const DNStep1Page = lazy(() => import('./pages/dailyNeedsPages/Step1Page'))
const DNStep2Page = lazy(() => import('./pages/dailyNeedsPages/Step2Page'))
const DNStep3Page = lazy(() => import('./pages/dailyNeedsPages/Step3Page'))
const DNAttachmentsPage = lazy(() => import('./pages/dailyNeedsPages/AttachmentsPage'))
const DNReviewPage = lazy(() => import('./pages/dailyNeedsPages/ReviewPage'))

// Maintenance wizard pages
const MaintenanceDashboard = lazy(() => import('./pages/maintenancePages/MaintenanceDashboard'))
const MaintenanceAllPage = lazy(() => import('./pages/maintenancePages/MaintenanceAllPage'))
const MNStep1Page = lazy(() => import('./pages/maintenancePages/Step1Page'))
const MNStep2Page = lazy(() => import('./pages/maintenancePages/Step2Page'))
const MNStep3Page = lazy(() => import('./pages/maintenancePages/Step3Page'))
const MNAttachmentsPage = lazy(() => import('./pages/maintenancePages/AttachmentsPage'))
const MNReviewPage = lazy(() => import('./pages/maintenancePages/ReviewPage'))

// Construction wizard pages
const ConstructionDashboard = lazy(() => import('./pages/constructionPages/ConstructionDashboard'))
const ConstructionAllPage = lazy(() => import('./pages/constructionPages/ConstructionAllPage'))
const COStep1Page = lazy(() => import('./pages/constructionPages/Step1Page'))
const COStep2Page = lazy(() => import('./pages/constructionPages/Step2Page'))
const COStep3Page = lazy(() => import('./pages/constructionPages/Step3Page'))
const COAttachmentsPage = lazy(() => import('./pages/constructionPages/AttachmentsPage'))
const COReviewPage = lazy(() => import('./pages/constructionPages/ReviewPage'))

// Person Gate-In pages (Visitor/Labour)
const PersonGateInDashboard = lazy(() => import('./pages/personGateInPages/PersonGateInDashboard'))
const PersonGateInAllPage = lazy(() => import('./pages/personGateInPages/PersonGateInAllPage'))
const InsideListPage = lazy(() => import('./pages/personGateInPages/InsideListPage'))
const NewEntryPage = lazy(() => import('./pages/personGateInPages/NewEntryPage'))
const EntryDetailPage = lazy(() => import('./pages/personGateInPages/EntryDetailPage'))
const VisitorsPage = lazy(() => import('./pages/personGateInPages/VisitorsPage'))
const LaboursPage = lazy(() => import('./pages/personGateInPages/LaboursPage'))
const ContractorsPage = lazy(() => import('./pages/personGateInPages/ContractorsPage'))

// Other gate entry type pages
const DailyNeedsPage = lazy(() => import('./pages/DailyNeedsPage'))
const DailyNeedsAllPage = lazy(() => import('./pages/dailyNeedsPages/DailyNeedsAllPage'))

/**
 * Gate module configuration
 */
export const gateModuleConfig: ModuleConfig = {
  name: 'gate',
  routes: [
    // Gate Dashboard
    {
      path: '/gate',
      element: <GateDashboardPage />,
      layout: 'main',
    },
    // Raw Materials Dashboard
    {
      path: '/gate/raw-materials',
      element: <RawMaterialsDashboard />,
      layout: 'main',
    },
    // Raw Materials List
    {
      path: '/gate/raw-materials/all',
      element: <RawMaterialsPage />,
      layout: 'main',
    },
    // New Raw Material Entry - Steps
    {
      path: '/gate/raw-materials/new',
      element: <RMStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/new/step2',
      element: <RMStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/new/step3',
      element: <RMStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/new/step4',
      element: <RMArrivalSlipPage />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/new/step5',
      element: <RMWeighmentPage />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/new/attachments',
      element: <RMAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/new/review',
      element: <RMReviewPage />,
      layout: 'main',
    },
    // Edit Raw Material Entry - Steps
    {
      path: '/gate/raw-materials/edit/:entryId/step1',
      element: <RMStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step2',
      element: <RMStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step3',
      element: <RMStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step4',
      element: <RMArrivalSlipPage />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step5',
      element: <RMWeighmentPage />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/edit/:entryId/attachments',
      element: <RMAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/edit/:entryId/review',
      element: <RMReviewPage />,
      layout: 'main',
    },
    // Daily Needs Dashboard/Landing
    {
      path: '/gate/daily-needs',
      element: <DailyNeedsPage />,
      layout: 'main',
    },
    // Daily Needs All Entries List
    {
      path: '/gate/daily-needs/all',
      element: <DailyNeedsAllPage />,
      layout: 'main',
    },
    // New Daily Needs Entry - Steps
    {
      path: '/gate/daily-needs/new',
      element: <DNStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/new/step2',
      element: <DNStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/new/step3',
      element: <DNStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/new/attachments',
      element: <DNAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/new/review',
      element: <DNReviewPage />,
      layout: 'main',
    },
    // Edit Daily Needs Entry - Steps
    {
      path: '/gate/daily-needs/edit/:entryId/step1',
      element: <DNStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/edit/:entryId/step2',
      element: <DNStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/edit/:entryId/step3',
      element: <DNStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/edit/:entryId/attachments',
      element: <DNAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/daily-needs/edit/:entryId/review',
      element: <DNReviewPage />,
      layout: 'main',
    },
    // Maintenance Dashboard
    {
      path: '/gate/maintenance',
      element: <MaintenanceDashboard />,
      layout: 'main',
    },
    // Maintenance List
    {
      path: '/gate/maintenance/all',
      element: <MaintenanceAllPage />,
      layout: 'main',
    },
    // New Maintenance Entry - Steps
    {
      path: '/gate/maintenance/new',
      element: <MNStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/new/step2',
      element: <MNStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/new/step3',
      element: <MNStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/new/attachments',
      element: <MNAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/new/review',
      element: <MNReviewPage />,
      layout: 'main',
    },
    // Edit Maintenance Entry - Steps
    {
      path: '/gate/maintenance/edit/:entryId/step1',
      element: <MNStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/edit/:entryId/step2',
      element: <MNStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/edit/:entryId/step3',
      element: <MNStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/edit/:entryId/attachments',
      element: <MNAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/maintenance/edit/:entryId/review',
      element: <MNReviewPage />,
      layout: 'main',
    },
    // New Construction Entry - Steps
    {
      path: '/gate/construction/new',
      element: <COStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/construction/new/step2',
      element: <COStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/construction/new/step3',
      element: <COStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/construction/new/attachments',
      element: <COAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/construction/new/review',
      element: <COReviewPage />,
      layout: 'main',
    },
    // Edit Construction Entry - Steps
    {
      path: '/gate/construction/edit/:entryId/step1',
      element: <COStep1Page />,
      layout: 'main',
    },
    {
      path: '/gate/construction/edit/:entryId/step2',
      element: <COStep2Page />,
      layout: 'main',
    },
    {
      path: '/gate/construction/edit/:entryId/step3',
      element: <COStep3Page />,
      layout: 'main',
    },
    {
      path: '/gate/construction/edit/:entryId/attachments',
      element: <COAttachmentsPage />,
      layout: 'main',
    },
    {
      path: '/gate/construction/edit/:entryId/review',
      element: <COReviewPage />,
      layout: 'main',
    },
    // Construction Dashboard
    {
      path: '/gate/construction',
      element: <ConstructionDashboard />,
      layout: 'main',
    },
    // Construction List
    {
      path: '/gate/construction/all',
      element: <ConstructionAllPage />,
      layout: 'main',
    },
    // Person Gate-In (Visitor/Labour) Routes
    {
      path: '/gate/visitor-labour',
      element: <PersonGateInDashboard />,
      layout: 'main',
    },
    {
      path: '/gate/visitor-labour/all',
      element: <PersonGateInAllPage />,
      layout: 'main',
    },
    {
      path: '/gate/visitor-labour/inside',
      element: <InsideListPage />,
      layout: 'main',
    },
    {
      path: '/gate/visitor-labour/new',
      element: <NewEntryPage />,
      layout: 'main',
    },
    {
      path: '/gate/visitor-labour/entry/:entryId',
      element: <EntryDetailPage />,
      layout: 'main',
    },
    {
      path: '/gate/visitor-labour/visitors',
      element: <VisitorsPage />,
      layout: 'main',
    },
    {
      path: '/gate/visitor-labour/labours',
      element: <LaboursPage />,
      layout: 'main',
    },
    {
      path: '/gate/visitor-labour/contractors',
      element: <ContractorsPage />,
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/gate',
      title: 'Gate',
      icon: Truck,
      showInSidebar: true,
      hasSubmenu: true,
      children: [
        {
          path: '/gate/raw-materials',
          title: 'Raw Materials (RM/PM/Assets)',
        },
        {
          path: '/gate/daily-needs',
          title: 'Daily Needs (Food/Consumables)',
        },
        {
          path: '/gate/maintenance',
          title: 'Maintenance (Spare parts/Tools)',
        },
        {
          path: '/gate/construction',
          title: 'Construction (Civil/Building Work)',
        },
        {
          path: '/gate/visitor-labour',
          title: 'Visitor/Labour',
        },
      ],
    },
  ],
}
