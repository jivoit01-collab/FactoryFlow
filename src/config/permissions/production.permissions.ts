/**
 * Production Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 */

export const PRODUCTION_PERMISSIONS = {
  // ============================================
  // DASHBOARD
  // ============================================
  DASHBOARD: {
    /** View production dashboard */
    VIEW: 'production.can_view_dashboard',
  },

  // ============================================
  // PLANNING
  // ============================================
  PLANNING: {
    /** View production plans */
    VIEW: 'production.view_productionplan',
    /** Create production plans */
    CREATE: 'production.add_productionplan',
    /** Edit production plans */
    EDIT: 'production.change_productionplan',
    /** Delete production plans */
    DELETE: 'production.delete_productionplan',
  },

  // ============================================
  // MATERIAL ACQUISITION
  // ============================================
  MATERIAL: {
    /** View material requisitions */
    VIEW: 'production.view_materialrequisition',
    /** Create material requisitions */
    CREATE: 'production.add_materialrequisition',
    /** Edit material requisitions */
    EDIT: 'production.change_materialrequisition',
  },

  // ============================================
  // MANUFACTURING / PRODUCTION EXECUTION
  // ============================================
  MANUFACTURING: {
    /** View production entries */
    VIEW: 'production.view_productionentry',
    /** Create production entries */
    CREATE: 'production.add_productionentry',
    /** Edit production entries */
    EDIT: 'production.change_productionentry',
  },

  // ============================================
  // QC (IN-PROCESS)
  // ============================================
  QC: {
    /** View QC holds */
    VIEW: 'production.view_qchold',
    /** Create QC holds */
    CREATE: 'production.add_qchold',
    /** Edit QC holds */
    EDIT: 'production.change_qchold',
  },

  // ============================================
  // RETURN & WASTAGE
  // ============================================
  RETURN_WASTAGE: {
    /** View return & wastage records */
    VIEW: 'production.view_returnwastage',
    /** Create return & wastage records */
    CREATE: 'production.add_returnwastage',
    /** Edit return & wastage records */
    EDIT: 'production.change_returnwastage',
  },

  // ============================================
  // MAINTENANCE
  // ============================================
  MAINTENANCE: {
    /** View maintenance tasks */
    VIEW: 'production.view_maintenancetask',
    /** Create maintenance tasks */
    CREATE: 'production.add_maintenancetask',
    /** Edit maintenance tasks */
    EDIT: 'production.change_maintenancetask',
  },

  // ============================================
  // LABOUR
  // ============================================
  LABOUR: {
    /** View labour allocation */
    VIEW: 'production.view_labourallocation',
    /** Create labour allocation */
    CREATE: 'production.add_labourallocation',
  },

  // ============================================
  // REPORTS
  // ============================================
  REPORTS: {
    /** View production reports */
    VIEW: 'production.view_reports',
  },
} as const;

/**
 * Module prefix for sidebar filtering.
 */
export const PRODUCTION_MODULE_PREFIX = 'production' as const;

/**
 * Type for Production permission values
 */
export type ProductionPermission =
  | (typeof PRODUCTION_PERMISSIONS.DASHBOARD)[keyof typeof PRODUCTION_PERMISSIONS.DASHBOARD]
  | (typeof PRODUCTION_PERMISSIONS.PLANNING)[keyof typeof PRODUCTION_PERMISSIONS.PLANNING]
  | (typeof PRODUCTION_PERMISSIONS.MATERIAL)[keyof typeof PRODUCTION_PERMISSIONS.MATERIAL]
  | (typeof PRODUCTION_PERMISSIONS.MANUFACTURING)[keyof typeof PRODUCTION_PERMISSIONS.MANUFACTURING]
  | (typeof PRODUCTION_PERMISSIONS.QC)[keyof typeof PRODUCTION_PERMISSIONS.QC]
  | (typeof PRODUCTION_PERMISSIONS.RETURN_WASTAGE)[keyof typeof PRODUCTION_PERMISSIONS.RETURN_WASTAGE]
  | (typeof PRODUCTION_PERMISSIONS.MAINTENANCE)[keyof typeof PRODUCTION_PERMISSIONS.MAINTENANCE]
  | (typeof PRODUCTION_PERMISSIONS.LABOUR)[keyof typeof PRODUCTION_PERMISSIONS.LABOUR]
  | (typeof PRODUCTION_PERMISSIONS.REPORTS)[keyof typeof PRODUCTION_PERMISSIONS.REPORTS];
