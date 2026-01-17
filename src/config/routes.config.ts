/**
 * Route configuration with permission-based access control
 * Permissions are Django permission strings: 'app_label.permission_codename'
 */

export interface RouteConfig {
  path: string
  title: string
  /** Required permissions (Django format: 'app_label.permission_codename') - permissions come from backend API */
  permissions?: readonly string[]
  /** Required groups */
  groups?: readonly string[]
  /** If true, user must have ALL permissions. If false (default), ANY permission grants access */
  requireAll?: boolean
  icon?: string
  showInSidebar?: boolean
  /** Module prefix for dynamic sidebar filtering (e.g., 'gatein' to show if user has any 'gatein.*' permission) */
  modulePrefix?: string
  children?: Record<string, RouteConfig>
}

export const ROUTES = {
  // Public routes
  LOGIN: {
    path: '/login',
    title: 'Login',
    showInSidebar: false,
  },

  COMPANY_SELECTION: {
    path: '/select-company',
    title: 'Select Company',
    showInSidebar: false,
  },

  LOADING_USER: {
    path: '/loading-user',
    title: 'Loading User',
    showInSidebar: false,
  },

  UNAUTHORIZED: {
    path: '/unauthorized',
    title: 'Unauthorized',
    showInSidebar: false,
  },

  // Protected routes
  // Dashboard permission: 'gatein.view_dashboard' - shown if user has any gatein permissions
  DASHBOARD: {
    path: '/',
    title: 'Dashboard',
    permissions: ['gatein.view_dashboard'],
    icon: 'LayoutDashboard',
    showInSidebar: true,
    // Module prefix for dynamic sidebar filtering
    modulePrefix: 'gatein',
  },

  // Gate In - shown if user has any 'gatein.*' permissions
  GATE_IN: {
    path: '/gate-in',
    title: 'Gate In',
    permissions: ['gatein.view_gateinentry'],
    icon: 'Truck',
    showInSidebar: true,
    // Module prefix for dynamic sidebar filtering
    modulePrefix: 'gatein',
    children: {
      LIST: {
        path: '/gate-in',
        title: 'Gate In List',
        permissions: ['gatein.view_gateinentry'],
      },
      DETAIL: {
        path: '/gate-in/:id',
        title: 'Gate In Detail',
        permissions: ['gatein.view_gateinentry'],
      },
      CREATE: {
        path: '/gate-in/new',
        title: 'New Gate In',
        permissions: ['gatein.add_gateinentry'],
      },
    },
  },

  // Quality Check - shown if user has any 'qualitycheck.*' permissions
  QUALITY_CHECK: {
    path: '/quality-check',
    title: 'Quality Check',
    permissions: ['qualitycheck.view_qualitycheckentry'],
    icon: 'ClipboardCheck',
    showInSidebar: true,
    // Module prefix for dynamic sidebar filtering
    modulePrefix: 'qualitycheck',
    children: {
      LIST: {
        path: '/quality-check',
        title: 'Quality Check List',
        permissions: ['qualitycheck.view_qualitycheckentry'],
      },
      DETAIL: {
        path: '/quality-check/:id',
        title: 'Quality Check Detail',
        permissions: ['qualitycheck.view_qualitycheckentry'],
      },
      CREATE: {
        path: '/quality-check/new',
        title: 'New Quality Check',
        permissions: ['qualitycheck.add_qualitycheckentry'],
      },
    },
  },

  PROFILE: {
    path: '/profile',
    title: 'Profile',
    showInSidebar: false,
  },
} as const

export type RouteName = keyof typeof ROUTES
