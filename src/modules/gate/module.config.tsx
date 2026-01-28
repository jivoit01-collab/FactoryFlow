import { lazy } from 'react'
import { Truck } from 'lucide-react'
import type { ModuleConfig } from '@/core/types'

// Lazy load all gate pages
const GateDashboardPage = lazy(() => import('./pages/GateDashboardPage'))
const RawMaterialsDashboard = lazy(() => import('./pages/RawMaterialsDashboard'))
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

// Other gate entry type pages
const DailyNeedsPage = lazy(() => import('./pages/DailyNeedsPage'))
const DailyNeedsAllPage = lazy(() => import('./pages/DailyNeedsAllPage'))
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'))
const ConstructionPage = lazy(() => import('./pages/ConstructionPage'))
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
    // Other Gate Entry Types
    {
      path: '/gate/maintenance',
      element: <MaintenancePage />,
      layout: 'main',
    },
    {
      path: '/gate/construction',
      element: <ConstructionPage />,
      layout: 'main',
    },
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
