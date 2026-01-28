import { lazy } from 'react'
import { ClipboardCheck } from 'lucide-react'
import type { ModuleConfig } from '@/core/types'

// Lazy load quality check pages
const QualityCheckListPage = lazy(() => import('./pages/QualityCheckListPage'))
const QualityCheckDetailPage = lazy(() => import('./pages/QualityCheckDetailPage'))

/**
 * Quality Check module configuration
 */
export const qualityCheckModuleConfig: ModuleConfig = {
  name: 'qualityCheck',
  routes: [
    {
      path: '/quality-check',
      element: <QualityCheckListPage />,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      layout: 'main',
    },
    {
      path: '/quality-check/new',
      element: <QualityCheckDetailPage />,
      permissions: ['qualitycheck.add_qualitycheckentry'],
      layout: 'main',
    },
    {
      path: '/quality-check/:id',
      element: <QualityCheckDetailPage />,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/quality-check',
      title: 'Quality Check',
      icon: ClipboardCheck,
      permissions: ['qualitycheck.view_qualitycheckentry'],
      modulePrefix: 'qualitycheck',
      showInSidebar: true,
    },
  ],
}
