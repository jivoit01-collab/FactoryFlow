import { lazy } from 'react'
import { Truck } from 'lucide-react'
import type { ModuleConfig } from '@/core/types'

// Lazy load all gate pages
const GateDashboardPage = lazy(() => import('./pages/GateDashboardPage'))
const RawMaterialsDashboard = lazy(() => import('./pages/rawmaterialpages/RawMaterialsDashboard'))
const RawMaterialsPage = lazy(() => import('./pages/RawMaterialsPage'))

// Raw Materials wizard pages
const RMStep1Page = lazy(() => import('./pages/rawmaterialpages/Step1Page'))
const RMStep2Page = lazy(() => import('./pages/rawmaterialpages/Step2Page'))
const RMStep3Page = lazy(() => import('./pages/rawmaterialpages/Step3Page'))
const RMStep4Page = lazy(() => import('./pages/rawmaterialpages/Step4Page'))
const RMStep5Page = lazy(() => import('./pages/rawmaterialpages/Step5Page'))
const RMReviewPage = lazy(() => import('./pages/rawmaterialpages/ReviewPage'))

// Daily Needs wizard pages
const DNStep1Page = lazy(() => import('./pages/dailyneedspages/Step1Page'))
const DNStep2Page = lazy(() => import('./pages/dailyneedspages/Step2Page'))
const DNStep3Page = lazy(() => import('./pages/dailyneedspages/Step3Page'))
const DNReviewPage = lazy(() => import('./pages/dailyneedspages/ReviewPage'))

// Maintenance wizard pages
const MaintenanceDashboard = lazy(() => import('./pages/maintenancepages/MaintenanceDashboard'))
const MaintenanceAllPage = lazy(() => import('./pages/maintenancepages/MaintenanceAllPage'))
const MNStep1Page = lazy(() => import('./pages/maintenancepages/Step1Page'))
const MNStep2Page = lazy(() => import('./pages/maintenancepages/Step2Page'))
const MNStep3Page = lazy(() => import('./pages/maintenancepages/Step3Page'))
const MNReviewPage = lazy(() => import('./pages/maintenancepages/ReviewPage'))

// Construction wizard pages
const ConstructionDashboard = lazy(() => import('./pages/constructionpages/ConstructionDashboard'))
const ConstructionAllPage = lazy(() => import('./pages/constructionpages/ConstructionAllPage'))
const COStep1Page = lazy(() => import('./pages/constructionpages/Step1Page'))
const COStep2Page = lazy(() => import('./pages/constructionpages/Step2Page'))
const COStep3Page = lazy(() => import('./pages/constructionpages/Step3Page'))
const COReviewPage = lazy(() => import('./pages/constructionpages/ReviewPage'))

// Other gate entry type pages
const DailyNeedsPage = lazy(() => import('./pages/DailyNeedsPage'))
const DailyNeedsAllPage = lazy(() => import('./pages/dailyneedspages/DailyNeedsAllPage'))
const ReturnableItemsPage = lazy(() => import('./pages/ReturnableItemsPage'))
const VisitorPage = lazy(() => import('./pages/VisitorPage'))
const EmployeePage = lazy(() => import('./pages/EmployeePage'))
const ContractorLaborPage = lazy(() => import('./pages/ContractorLaborPage'))

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
      element: <RMStep4Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/new/step5',
      element: <RMStep5Page />,
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
      element: <RMStep4Page />,
      layout: 'main',
    },
    {
      path: '/gate/raw-materials/edit/:entryId/step5',
      element: <RMStep5Page />,
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
    // Other Gate Entry Types
    {
      path: '/gate/returnable-items',
      element: <ReturnableItemsPage />,
      layout: 'main',
    },
    {
      path: '/gate/visitor',
      element: <VisitorPage />,
      layout: 'main',
    },
    {
      path: '/gate/employee',
      element: <EmployeePage />,
      layout: 'main',
    },
    {
      path: '/gate/contractor-labor',
      element: <ContractorLaborPage />,
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
          path: '/gate/returnable-items',
          title: 'Returnable Items (Tools/Equipments)',
        },
        {
          path: '/gate/visitor',
          title: 'Visitor',
        },
        {
          path: '/gate/employee',
          title: 'Employee',
        },
        {
          path: '/gate/contractor-labor',
          title: 'Contractor/Labor',
        },
      ],
    },
  ],
}
