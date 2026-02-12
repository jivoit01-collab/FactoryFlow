import { lazy } from 'react'

import type { ModuleConfig } from '@/core/types'

// Eagerly load critical auth pages (always used on reload)
import LoadingUserPage from './pages/LoadingUserPage'

// Lazy load other auth pages
const LoginPage = lazy(() => import('./pages/LoginPage'))
const CompanySelectionPage = lazy(() => import('./pages/CompanySelectionPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

/**
 * Auth module configuration
 */
export const authModuleConfig: ModuleConfig = {
  name: 'auth',
  routes: [
    // Auth layout routes (public)
    {
      path: '/login',
      element: <LoginPage />,
      layout: 'auth',
      requiresAuth: false,
    },
    {
      path: '/select-company',
      element: <CompanySelectionPage />,
      layout: 'auth',
      requiresAuth: false,
    },
    {
      path: '/loading-user',
      element: <LoadingUserPage />,
      layout: 'auth',
      requiresAuth: false,
    },
    // Main layout routes (protected)
    {
      path: '/profile',
      element: <ProfilePage />,
      layout: 'main',
      requiresAuth: true,
    },
  ],
  // Auth module doesn't have sidebar navigation items
  navigation: [],
}
