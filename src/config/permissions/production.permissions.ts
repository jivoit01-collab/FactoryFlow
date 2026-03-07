/**
 * Production Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 */

export const PRODUCTION_PERMISSIONS = {
  /** Create a new production plan */
  CREATE_PLAN: 'production_planning.can_create_production_plan',
  /** Edit an existing production plan (DRAFT only) */
  EDIT_PLAN: 'production_planning.can_edit_production_plan',
  /** Delete a production plan (DRAFT only) */
  DELETE_PLAN: 'production_planning.can_delete_production_plan',
  /** Post a plan to SAP */
  POST_TO_SAP: 'production_planning.can_post_plan_to_sap',
  /** View production plans */
  VIEW_PLAN: 'production_planning.can_view_production_plan',
  /** Create, edit, delete weekly plans */
  MANAGE_WEEKLY: 'production_planning.can_manage_weekly_plan',
  /** Add daily production entries */
  ADD_DAILY: 'production_planning.can_add_daily_production',
  /** View daily production entries */
  VIEW_DAILY: 'production_planning.can_view_daily_production',
  /** Close a production plan */
  CLOSE_PLAN: 'production_planning.can_close_production_plan',
} as const;

/** Module prefix for sidebar filtering */
export const PRODUCTION_MODULE_PREFIX = 'production_planning';

/**
 * Type for Production permission values
 */
export type ProductionPermission =
  (typeof PRODUCTION_PERMISSIONS)[keyof typeof PRODUCTION_PERMISSIONS];

/**
 * Production Execution Module Permissions
 *
 * These constants map to Django permissions defined in the production_execution app.
 * Format: 'app_label.permission_codename'
 */
export const EXECUTION_PERMISSIONS = {
  // Production Runs
  /** View production runs */
  VIEW_RUN: 'production_execution.can_view_production_run',
  /** Create a production run */
  CREATE_RUN: 'production_execution.can_create_production_run',
  /** Edit a production run */
  EDIT_RUN: 'production_execution.can_edit_production_run',
  /** Complete a production run */
  COMPLETE_RUN: 'production_execution.can_complete_production_run',

  // Hourly Logs
  /** View hourly production logs */
  VIEW_LOG: 'production_execution.can_view_production_log',
  /** Create/edit hourly production logs */
  EDIT_LOG: 'production_execution.can_edit_production_log',

  // Breakdowns
  /** View breakdowns */
  VIEW_BREAKDOWN: 'production_execution.can_view_breakdown',
  /** Create breakdowns */
  CREATE_BREAKDOWN: 'production_execution.can_create_breakdown',
  /** Edit/delete breakdowns */
  EDIT_BREAKDOWN: 'production_execution.can_edit_breakdown',

  // Material Usage
  /** View material usage */
  VIEW_MATERIAL: 'production_execution.can_view_material_usage',
  /** Create material usage */
  CREATE_MATERIAL: 'production_execution.can_create_material_usage',
  /** Edit material usage */
  EDIT_MATERIAL: 'production_execution.can_edit_material_usage',

  // Machine Runtime
  /** View machine runtime */
  VIEW_RUNTIME: 'production_execution.can_view_machine_runtime',
  /** Create/edit machine runtime */
  CREATE_RUNTIME: 'production_execution.can_create_machine_runtime',

  // Manpower
  /** View manpower entries */
  VIEW_MANPOWER: 'production_execution.can_view_manpower',
  /** Create/edit manpower entries */
  CREATE_MANPOWER: 'production_execution.can_create_manpower',

  // Line Clearance
  /** View line clearance */
  VIEW_CLEARANCE: 'production_execution.can_view_line_clearance',
  /** Create/edit line clearance */
  CREATE_CLEARANCE: 'production_execution.can_create_line_clearance',
  /** QA approve/reject line clearance */
  APPROVE_CLEARANCE_QA: 'production_execution.can_approve_line_clearance_qa',

  // Machine Checklists
  /** View machine checklists */
  VIEW_CHECKLIST: 'production_execution.can_view_machine_checklist',
  /** Create/edit machine checklist entries */
  CREATE_CHECKLIST: 'production_execution.can_create_machine_checklist',
  /** Manage checklist templates */
  MANAGE_TEMPLATES: 'production_execution.can_manage_checklist_templates',

  // Production Lines & Machines (master data)
  /** Manage production lines */
  MANAGE_LINES: 'production_execution.can_manage_production_lines',
  /** Manage machines */
  MANAGE_MACHINES: 'production_execution.can_manage_machines',

  // Waste Management
  /** View waste logs */
  VIEW_WASTE: 'production_execution.can_view_waste_log',
  /** Create waste logs */
  CREATE_WASTE: 'production_execution.can_create_waste_log',
  /** Approve waste - Engineer */
  APPROVE_WASTE_ENGINEER: 'production_execution.can_approve_waste_engineer',
  /** Approve waste - AM */
  APPROVE_WASTE_AM: 'production_execution.can_approve_waste_am',
  /** Approve waste - Store */
  APPROVE_WASTE_STORE: 'production_execution.can_approve_waste_store',
  /** Approve waste - HOD */
  APPROVE_WASTE_HOD: 'production_execution.can_approve_waste_hod',

  // Reports
  /** View reports and analytics */
  VIEW_REPORTS: 'production_execution.can_view_reports',
} as const;

export const EXECUTION_MODULE_PREFIX = 'production_execution';

/**
 * Type for Execution permission values
 */
export type ExecutionPermission =
  (typeof EXECUTION_PERMISSIONS)[keyof typeof EXECUTION_PERMISSIONS];
