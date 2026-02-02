import { lazy } from 'react'
import { ClipboardCheck } from 'lucide-react'
import type { ModuleConfig } from '@/core/types'

// Lazy load quality check pages
const QCDashboardPage = lazy(() => import('./pages/QCDashboardPage'))
const QCInspectionPage = lazy(() => import('./pages/QCInspectionPage'))

/**
 * Factory Quality Check module configuration
 * QC Inspection for Raw Materials & Packaging Materials
 */
export const qualityCheckModuleConfig: ModuleConfig = {
  name: 'qualityCheck',
  routes: [
    {
      path: '/quality-check',
      element: <QCDashboardPage />,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      layout: 'main',
    },
    {
      path: '/quality-check/:id',
      element: <QCInspectionPage />,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/quality-check',
      title: 'Factory QC',
      icon: ClipboardCheck,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      modulePrefix: 'qualitycheck',
      showInSidebar: true,
    },
  ],
}
