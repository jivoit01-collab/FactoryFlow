import { lazy } from 'react'
import { LayoutDashboard } from 'lucide-react'
import type { ModuleConfig } from '@/core/types'

// Lazy load pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

/**
 * Dashboard module configuration
 */
export const dashboardModuleConfig: ModuleConfig = {
  name: 'dashboard',
  routes: [
    {
      path: '/',
      element: <DashboardPage />,
      permissions: ['gatein.view_dashboard'],
      layout: 'main',
    },
  ],
  navigation: [
    {
      path: '/',
      title: 'Dashboard',
      icon: LayoutDashboard,
      permissions: ['gatein.view_dashboard'],
      modulePrefix: 'gatein',
      showInSidebar: true,
    },
  ],
}
