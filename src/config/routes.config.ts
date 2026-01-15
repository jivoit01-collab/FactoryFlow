/**
 * Route configuration with permission-based access control
 * Permissions are Django permission strings: 'app_label.permission_codename'
 */

export interface RouteConfig {
  path: string
  title: string
  /** Required permissions (Django format: 'app_label.permission_codename') */
  permissions?: readonly string[]
  /** Required groups */
  groups?: readonly string[]
  /** If true, user must have ALL permissions. If false (default), ANY permission grants access */
  requireAll?: boolean
  icon?: string
  showInSidebar?: boolean
  children?: Record<string, RouteConfig>
}

/**
 * Django permission constants for the application
 * Format: 'app_label.action_modelname'
 */
export const PERMISSIONS = {
  // Gate In
  GATE_IN: {
    VIEW: 'gatein.view_gateinentry',
    ADD: 'gatein.add_gateinentry',
    CHANGE: 'gatein.change_gateinentry',
    DELETE: 'gatein.delete_gateinentry',
  },
  // Quality Check
  QUALITY_CHECK: {
    VIEW: 'qualitycheck.view_qualitycheckentry',
    ADD: 'qualitycheck.add_qualitycheckentry',
    CHANGE: 'qualitycheck.change_qualitycheckentry',
    DELETE: 'qualitycheck.delete_qualitycheckentry',
  },
  // Dashboard (generic)
  DASHBOARD: {
    VIEW: 'core.view_dashboard',
  },
} as const

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
  DASHBOARD: {
    path: '/',
    title: 'Dashboard',
    permissions: [PERMISSIONS.DASHBOARD.VIEW],
    icon: 'LayoutDashboard',
    showInSidebar: true,
  },

  GATE_IN: {
    path: '/gate-in',
    title: 'Gate In',
    permissions: [PERMISSIONS.GATE_IN.VIEW],
    icon: 'Truck',
    showInSidebar: true,
    children: {
      LIST: {
        path: '/gate-in',
        title: 'Gate In List',
        permissions: [PERMISSIONS.GATE_IN.VIEW],
      },
      DETAIL: {
        path: '/gate-in/:id',
        title: 'Gate In Detail',
        permissions: [PERMISSIONS.GATE_IN.VIEW],
      },
      CREATE: {
        path: '/gate-in/new',
        title: 'New Gate In',
        permissions: [PERMISSIONS.GATE_IN.ADD],
      },
    },
  },

  QUALITY_CHECK: {
    path: '/quality-check',
    title: 'Quality Check',
    permissions: [PERMISSIONS.QUALITY_CHECK.VIEW],
    icon: 'ClipboardCheck',
    showInSidebar: true,
    children: {
      LIST: {
        path: '/quality-check',
        title: 'Quality Check List',
        permissions: [PERMISSIONS.QUALITY_CHECK.VIEW],
      },
      DETAIL: {
        path: '/quality-check/:id',
        title: 'Quality Check Detail',
        permissions: [PERMISSIONS.QUALITY_CHECK.VIEW],
      },
      CREATE: {
        path: '/quality-check/new',
        title: 'New Quality Check',
        permissions: [PERMISSIONS.QUALITY_CHECK.ADD],
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
