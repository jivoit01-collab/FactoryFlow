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
    /** Create new material arrival slips (Django default: add_materialarrivalslip) */
    CREATE: 'quality_control.add_materialarrivalslip',
    /** Edit existing material arrival slips (Django default: change_materialarrivalslip) */
    EDIT: 'quality_control.change_materialarrivalslip',
    /** Submit arrival slips to QA for inspection (custom permission) */
    SUBMIT: 'quality_control.can_submit_arrival_slip',
    /** View material arrival slips (Django default: view_materialarrivalslip) */
    VIEW: 'quality_control.view_materialarrivalslip',
  },

  // ============================================
  // INSPECTION PERMISSIONS
  // ============================================
  INSPECTION: {
    /** Create new raw material inspections (Django default: add_rawmaterialinspection) */
    CREATE: 'quality_control.add_rawmaterialinspection',
    /** Edit existing raw material inspections (Django default: change_rawmaterialinspection) */
    EDIT: 'quality_control.change_rawmaterialinspection',
    /** Submit inspections for approval (custom permission) */
    SUBMIT: 'quality_control.can_submit_inspection',
    /** View raw material inspections (Django default: view_rawmaterialinspection) */
    VIEW: 'quality_control.view_rawmaterialinspection',
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
} as const;

/** Module prefix for sidebar filtering */
export const QC_MODULE_PREFIX = 'quality_control';

/**
 * Type for QC permission values
 * Useful for type-safe permission checking
 */
export type QCPermission =
  | (typeof QC_PERMISSIONS.ARRIVAL_SLIP)[keyof typeof QC_PERMISSIONS.ARRIVAL_SLIP]
  | (typeof QC_PERMISSIONS.INSPECTION)[keyof typeof QC_PERMISSIONS.INSPECTION]
  | (typeof QC_PERMISSIONS.APPROVAL)[keyof typeof QC_PERMISSIONS.APPROVAL]
  | (typeof QC_PERMISSIONS.MASTER_DATA)[keyof typeof QC_PERMISSIONS.MASTER_DATA];
