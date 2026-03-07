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
