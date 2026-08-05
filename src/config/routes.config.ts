/**
 * Route configuration with permission-based access control
 * Permissions are Django permission strings: 'app_label.permission_codename'
 */

export interface RouteConfig {
  path: string;
  title: string;
  /** Required permissions (Django format: 'app_label.permission_codename') - permissions come from backend API */
  permissions?: readonly string[];
  /** Required groups */
  groups?: readonly string[];
  /** If true, user must have ALL permissions. If false (default), ANY permission grants access */
  requireAll?: boolean;
  icon?: string;
  showInSidebar?: boolean;
  /** Module prefix for dynamic sidebar filtering (e.g., 'gatein' to show if user has any 'gatein.*' permission) */
  modulePrefix?: string;
  /** Whether this route has a submenu in the sidebar */
  hasSubmenu?: boolean;
  children?: Record<string, RouteConfig>;
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
  // Dashboard is always visible for authenticated users
  DASHBOARD: {
    path: '/',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    showInSidebar: true,
  },

  // Gate - dropdown menu with multiple gate entry types
  GATE: {
    path: '/gate',
    title: 'Gate',
    icon: 'Truck',
    showInSidebar: true,
    hasSubmenu: true,
    children: {
      GATE_NEW: {
        path: '/gate/new',
        title: 'New Gate Entry',
      },
      RAW_MATERIALS: {
        path: '/gate/raw-materials',
        title: 'Raw Materials (RM/PM/Assets)',
      },
      RAW_MATERIALS_ALL: {
        path: '/gate/raw-materials/all',
        title: 'All Raw Material Entries',
      },
      RAW_MATERIALS_NEW: {
        path: '/gate/raw-materials/new',
        title: 'New Raw Material Entry - Step 1',
      },
      RAW_MATERIALS_NEW_STEP2: {
        path: '/gate/raw-materials/new/step2',
        title: 'New Raw Material Entry - Step 2',
      },
      RAW_MATERIALS_NEW_STEP3: {
        path: '/gate/raw-materials/new/step3',
        title: 'New Raw Material Entry - Step 3',
      },
      RAW_MATERIALS_NEW_STEP4: {
        path: '/gate/raw-materials/new/step4',
        title: 'New Raw Material Entry - Step 4',
      },
      RAW_MATERIALS_NEW_REVIEW: {
        path: '/gate/raw-materials/new/review',
        title: 'New Raw Material Entry - Review',
      },
      RAW_MATERIALS_EDIT_STEP1: {
        path: '/gate/raw-materials/edit/:entryId/step1',
        title: 'Edit Raw Material Entry - Step 1',
      },
      RAW_MATERIALS_EDIT_STEP2: {
        path: '/gate/raw-materials/edit/:entryId/step2',
        title: 'Edit Raw Material Entry - Step 2',
      },
      RAW_MATERIALS_EDIT_STEP3: {
        path: '/gate/raw-materials/edit/:entryId/step3',
        title: 'Edit Raw Material Entry - Step 3',
      },
      RAW_MATERIALS_EDIT_STEP4: {
        path: '/gate/raw-materials/edit/:entryId/step4',
        title: 'Edit Raw Material Entry - Step 4',
      },
      RAW_MATERIALS_EDIT_REVIEW: {
        path: '/gate/raw-materials/edit/:entryId/review',
        title: 'Edit Raw Material Entry - Review',
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
      CONTRACTOR_LABOR: {
        path: '/gate/visitor-labour',
        title: 'Visitor/Labour',
      },
      REJECTED_QC_RETURN: {
        path: '/gate/rejected-qc-return',
        title: 'Rejected QC Return',
      },
      EMPTY_VEHICLE_IN: {
        path: '/gate/empty-vehicle-in',
        title: 'Empty Vehicle In',
      },
      EMPTY_VEHICLE_IN_NEW: {
        path: '/gate/empty-vehicle-in/new',
        title: 'New Empty Vehicle In',
      },
      EMPTY_VEHICLE_OUT: {
        path: '/gate/empty-vehicle-out',
        title: 'Empty Vehicle Out',
      },
      EMPTY_VEHICLE_OUT_NEW: {
        path: '/gate/empty-vehicle-out/new',
        title: 'New Empty Vehicle Out',
      },
      BST_OUT: {
        path: '/gate/bst-out',
        title: 'BST Out',
      },
      BST_OUT_NEW: {
        path: '/gate/bst-out/new',
        title: 'New BST Out',
      },
      BST_IN: {
        path: '/gate/bst-in',
        title: 'BST In',
      },
      BST_IN_NEW: {
        path: '/gate/bst-in/new',
        title: 'New BST In',
      },
      BST_RETURN: {
        path: '/gate/bst-return',
        title: 'BST Return',
      },
      BST_RETURN_NEW: {
        path: '/gate/bst-return/new',
        title: 'New BST Return',
      },
      SALES_DISPATCH: {
        path: '/gate/sales-dispatch',
        title: 'Sales Dispatch Out',
      },
      SALES_DISPATCH_NEW: {
        path: '/gate/sales-dispatch/new',
        title: 'New Sales Dispatch Out Entry',
      },
      SALES_DISPATCH_BARCODE_SCAN: {
        path: '/gate/sales-dispatch/new/barcode-scan',
        title: 'Sales Dispatch Out Box Scanning',
      },
      SALES_DISPATCH_ATTACHMENTS: {
        path: '/gate/sales-dispatch/new/attachments',
        title: 'Sales Dispatch Out Attachments',
      },
      SALES_DISPATCH_GATEPASS: {
        path: '/gate/sales-dispatch/new/gatepass',
        title: 'Sales Dispatch Out Gatepass',
      },
      REPAIR_MOVEMENT: {
        path: '/gate/repair-movement',
        title: 'Repair Movement',
      },
      REPAIR_PARTS_OUT: {
        path: '/gate/repair-parts-out',
        title: 'Repair Parts Out',
      },
      REPAIR_PARTS_OUT_NEW: {
        path: '/gate/repair-parts-out/new',
        title: 'New Repair Parts Out',
      },
      REPAIR_PARTS_IN: {
        path: '/gate/repair-parts-in',
        title: 'Repair Parts In',
      },
      REPAIR_PARTS_IN_NEW: {
        path: '/gate/repair-parts-in/new',
        title: 'New Repair Parts In',
      },
      JOB_WORK: {
        path: '/gate/job-work',
        title: 'Job Work / Oil Refining',
      },
      JOB_WORK_NEW: {
        path: '/gate/job-work/new',
        title: 'New Job Work',
      },
    },
  },

  NOTIFICATIONS: {
    path: '/notifications',
    title: 'Notifications',
    showInSidebar: false,
  },

  PROFILE: {
    path: '/profile',
    title: 'Profile',
    showInSidebar: false,
  },

  SETTINGS: {
    path: '/settings',
    title: 'Settings',
    showInSidebar: false,
  },

  QC: {
    path: '/qc',
    title: 'Quality Control',
    icon: 'FlaskConical',
    showInSidebar: true,
    hasSubmenu: true,
    children: {
      CUSTOMER_RETURNS: {
        path: '/qc/customer-returns',
        title: 'Goods Return QC',
      },
    },
  },

  FINANCE: {
    path: '/finance',
    title: 'Sales / Finance',
    icon: 'IndianRupee',
    showInSidebar: true,
    hasSubmenu: true,
    children: {
      CREDIT_NOTES: {
        path: '/finance/credit-notes',
        title: 'Credit Notes',
      },
      CREDIT_NOTES_NEW: {
        path: '/finance/credit-notes/new',
        title: 'New Credit Note',
      },
      DEBIT_NOTES: {
        path: '/finance/debit-notes',
        title: 'Debit Notes',
      },
      DEBIT_NOTES_NEW: {
        path: '/finance/debit-notes/new',
        title: 'New Debit Note',
      },
    },
  },
} as const;

export type RouteName = keyof typeof ROUTES;
