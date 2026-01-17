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
  /** Whether this route has a submenu in the sidebar */
  hasSubmenu?: boolean
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

  // Gate - dropdown menu with multiple gate entry types
  GATE: {
    path: '/gate',
    title: 'Gate',
    icon: 'Truck',
    showInSidebar: true,
    hasSubmenu: true,
    children: {
      RAW_MATERIALS: {
        path: '/gate/raw-materials',
        title: 'Raw Materials (RM/PM/Assets)',
      },
      DAILY_NEEDS: {
        path: '/gate/daily-needs',
        title: 'Daily Needs (Food/Consumables)',
      },
      MAINTENANCE: {
        path: '/gate/maintenance',
        title: 'Maintenance (Spare parts/Tools)',
      },
      CONSTRUCTION: {
        path: '/gate/construction',
        title: 'Construction (Civil/Building Work)',
      },
      RETURNABLE_ITEMS: {
        path: '/gate/returnable-items',
        title: 'Returnable Items (Tools /Equipments)',
      },
      VISITOR: {
        path: '/gate/visitor',
        title: 'Visitor',
      },
      EMPLOYEE: {
        path: '/gate/employee',
        title: 'Employee',
      },
      CONTRACTOR_LABOR: {
        path: '/gate/contractor-labor',
        title: 'Contractor/Labor',
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
