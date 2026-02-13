import { PackageCheck } from 'lucide-react'
import { lazy } from 'react'

import { GRPO_MODULE_PREFIX, GRPO_PERMISSIONS } from '@/config/permissions'
import type { ModuleConfig } from '@/core/types'

// Lazy load GRPO pages
const GRPODashboardPage = lazy(() => import('./pages/GRPODashboardPage'))
const PendingEntriesPage = lazy(() => import('./pages/PendingEntriesPage'))
const GRPOPreviewPage = lazy(() => import('./pages/GRPOPreviewPage'))
const GRPOHistoryPage = lazy(() => import('./pages/GRPOHistoryPage'))
const GRPOHistoryDetailPage = lazy(() => import('./pages/GRPOHistoryDetailPage'))

/**
 * GRPO module configuration
 *
 * Route permissions: Controls who can access each page (ProtectedRoute)
 * Navigation permissions: Controls what appears in sidebar submenu
 * Module prefix: Controls visibility of entire module in sidebar
 */
export const grpoModuleConfig: ModuleConfig = {
  name: 'grpo',
  routes: [
    // Dashboard - requires pending view permission
    {
      path: '/grpo',
      element: <GRPODashboardPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    // Pending entries list
    {
      path: '/grpo/pending',
      element: <PendingEntriesPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
    },
    // Preview and post GRPO
    {
      path: '/grpo/preview/:vehicleEntryId',
      element: <GRPOPreviewPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.PREVIEW],
    },
    // Posting history
    {
      path: '/grpo/history',
      element: <GRPOHistoryPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
    },
    // Posting detail
    {
      path: '/grpo/history/:postingId',
      element: <GRPOHistoryDetailPage />,
      layout: 'main',
      permissions: [GRPO_PERMISSIONS.VIEW_POSTING],
    },
  ],
  navigation: [
    {
      path: '/grpo',
      title: 'GRPO',
      icon: PackageCheck,
      showInSidebar: true,
      modulePrefix: GRPO_MODULE_PREFIX,
      hasSubmenu: true,
      children: [
        {
          path: '/grpo',
          title: 'Dashboard',
        },
        {
          path: '/grpo/pending',
          title: 'Pending Entries',
          permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
        },
        {
          path: '/grpo/history',
          title: 'Posting History',
          permissions: [GRPO_PERMISSIONS.VIEW_HISTORY],
        },
      ],
    },
  ],
}
