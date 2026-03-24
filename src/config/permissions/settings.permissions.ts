/**
 * Settings Module Permissions
 *
 * These constants map to Django permissions defined in the workflow_rules app.
 * Format: 'app_label.permission_codename'
 */

export const SETTINGS_PERMISSIONS = {
  /** View workflow rules and audit log */
  VIEW_RULES: 'workflow_rules.can_view_workflow_rules',
  /** Create, edit, delete, toggle workflow rules */
  MANAGE_RULES: 'workflow_rules.can_manage_workflow_rules',
} as const;

export const SETTINGS_MODULE_PREFIX = 'workflow_rules';

/**
 * Type for Settings permission values
 */
export type SettingsPermission =
  (typeof SETTINGS_PERMISSIONS)[keyof typeof SETTINGS_PERMISSIONS];
