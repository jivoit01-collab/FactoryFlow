/**
 * Quality Control Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * @see API Documentation for permission requirements per endpoint
 */

export const QC_PERMISSIONS = {
  // ============================================
  // ARRIVAL SLIP PERMISSIONS
  // ============================================
  ARRIVAL_SLIP: {
    /** Create new material arrival slips */
    CREATE: 'quality_control.can_create_arrival_slip',
    /** Edit existing material arrival slips */
    EDIT: 'quality_control.can_edit_arrival_slip',
    /** Submit arrival slips to QA for inspection */
    SUBMIT: 'quality_control.can_submit_arrival_slip',
    /** View material arrival slips */
    VIEW: 'quality_control.can_view_arrival_slip',
  },

  // ============================================
  // INSPECTION PERMISSIONS
  // ============================================
  INSPECTION: {
    /** Create new raw material inspections */
    CREATE: 'quality_control.can_create_inspection',
    /** Edit existing raw material inspections */
    EDIT: 'quality_control.can_edit_inspection',
    /** Submit inspections for approval */
    SUBMIT: 'quality_control.can_submit_inspection',
    /** View raw material inspections */
    VIEW: 'quality_control.can_view_inspection',
  },

  // ============================================
  // APPROVAL PERMISSIONS
  // ============================================
  APPROVAL: {
    /** Approve inspections as QA Chemist */
    APPROVE_AS_CHEMIST: 'quality_control.can_approve_as_chemist',
    /** Approve inspections as QA Manager */
    APPROVE_AS_QAM: 'quality_control.can_approve_as_qam',
    /** Reject inspections */
    REJECT: 'quality_control.can_reject_inspection',
  },

  // ============================================
  // MASTER DATA PERMISSIONS
  // ============================================
  MASTER_DATA: {
    /** Manage material type master data */
    MANAGE_MATERIAL_TYPES: 'quality_control.can_manage_material_types',
    /** Manage QC parameter definitions */
    MANAGE_QC_PARAMETERS: 'quality_control.can_manage_qc_parameters',
  },
} as const

/** Module prefix for sidebar filtering */
export const QC_MODULE_PREFIX = 'quality_control'

/**
 * Type for QC permission values
 * Useful for type-safe permission checking
 */
export type QCPermission =
  | (typeof QC_PERMISSIONS.ARRIVAL_SLIP)[keyof typeof QC_PERMISSIONS.ARRIVAL_SLIP]
  | (typeof QC_PERMISSIONS.INSPECTION)[keyof typeof QC_PERMISSIONS.INSPECTION]
  | (typeof QC_PERMISSIONS.APPROVAL)[keyof typeof QC_PERMISSIONS.APPROVAL]
  | (typeof QC_PERMISSIONS.MASTER_DATA)[keyof typeof QC_PERMISSIONS.MASTER_DATA]
