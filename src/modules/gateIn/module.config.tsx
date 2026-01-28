import { lazy } from 'react'
import type { ModuleConfig } from '@/core/types'

// Lazy load gateIn pages
const GateInListPage = lazy(() => import('./pages/GateInListPage'))
const GateInDetailPage = lazy(() => import('./pages/GateInDetailPage'))

/**
 * GateIn module configuration
 * Note: This module handles gate-in entry operations
 * Routes are defined but may not be visible in sidebar if not currently active
 */
export const gateInModuleConfig: ModuleConfig = {
  name: 'gateIn',
  routes: [
    {
      path: '/gate-in',
      element: <GateInListPage />,
      layout: 'main',
    },
    {
      path: '/gate-in/:id',
      element: <GateInDetailPage />,
      layout: 'main',
    },
  ],
  // GateIn navigation is handled through the Gate module submenu
  // or can be enabled here if needed as a separate sidebar item
  navigation: [],
}
