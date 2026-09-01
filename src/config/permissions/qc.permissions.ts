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
    /** Send arrival slip back to gate for correction (custom permission) */
    SEND_BACK: 'quality_control.can_send_back_arrival_slip',
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
    /** Inspect against a vendor other than the one on the PO (custom permission) */
    OVERRIDE_VENDOR: 'quality_control.can_override_qc_vendor',
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
  // TESTING PROCEDURE (PROCEDURES) PERMISSIONS
  // ============================================
  TESTING_PROCEDURE: {
    /** View controlled testing procedures */
    VIEW: 'quality_control.can_view_testing_procedures',
    /** Create / edit / retire controlled testing procedures */
    MANAGE: 'quality_control.can_manage_testing_procedures',
  },

  // ============================================
  // QC RECORD FORMS (DOCUMENTS) PERMISSIONS
  // ============================================
  QC_RECORD: {
    /** View record forms and filled records */
    VIEW: 'quality_control.can_view_qc_records',
    /** Open and fill records */
    FILL: 'quality_control.can_fill_qc_records',
    /** Approve records and maintain the forms themselves */
    APPROVE: 'quality_control.can_approve_qc_records',
  },

  // ============================================
  // QC PDF DOCUMENT LIBRARY PERMISSIONS
  // ============================================
  DOCUMENT_FILE: {
    /** View the PDF library */
    VIEW: 'quality_control.can_view_document_files',
    /** Upload / edit / retire PDFs */
    MANAGE: 'quality_control.can_manage_document_files',
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

  // ============================================
  // PRODUCTION QC PERMISSIONS
  // ============================================
  PRODUCTION_QC: {
    /** View production QC sessions */
    VIEW: 'quality_control.can_view_production_qc',
    /** Create production QC sessions */
    CREATE: 'quality_control.can_create_production_qc',
    /** Submit production QC for approval */
    SUBMIT: 'quality_control.can_submit_production_qc',
    /** Approve/reject production QC sessions */
    APPROVE: 'quality_control.can_approve_production_qc',
  },

  // ============================================
  // ONLINE QUALITY MONITORING PERMISSIONS
  // ============================================
  ONLINE_MONITORING: {
    /** View online monitoring records */
    VIEW: 'quality_control.can_view_online_monitoring',
    /** Create / edit draft records */
    CREATE: 'quality_control.can_create_online_monitoring',
    /** Submit a record for approval */
    SUBMIT: 'quality_control.can_submit_online_monitoring',
    /** Approve / reject records */
    APPROVE: 'quality_control.can_approve_online_monitoring',
  },

  // ============================================
  // LINE CLEARANCE QC PERMISSIONS
  // ============================================
  LINE_CLEARANCE_QC: {
    /** View line clearance QA records from the QC module */
    VIEW: 'quality_control.can_view_line_clearance_qc',
    /** Approve/reject line clearance QA records from the QC module */
    APPROVE: 'quality_control.can_approve_line_clearance_qc',
    /** Manager override — change any decision until the line has started */
    MANAGE: 'production_execution.can_manage_line_clearance',
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
  | (typeof QC_PERMISSIONS.MASTER_DATA)[keyof typeof QC_PERMISSIONS.MASTER_DATA]
  | (typeof QC_PERMISSIONS.TESTING_PROCEDURE)[keyof typeof QC_PERMISSIONS.TESTING_PROCEDURE]
  | (typeof QC_PERMISSIONS.QC_RECORD)[keyof typeof QC_PERMISSIONS.QC_RECORD]
  | (typeof QC_PERMISSIONS.PRODUCTION_QC)[keyof typeof QC_PERMISSIONS.PRODUCTION_QC]
  | (typeof QC_PERMISSIONS.LINE_CLEARANCE_QC)[keyof typeof QC_PERMISSIONS.LINE_CLEARANCE_QC];
