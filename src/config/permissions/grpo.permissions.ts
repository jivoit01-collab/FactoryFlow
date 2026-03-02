/**
 * GRPO Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 */

export const GRPO_PERMISSIONS = {
  /** View pending GRPO entries */
  VIEW_PENDING: 'grpo.can_view_pending_grpo',
  /** Preview GRPO data before posting */
  PREVIEW: 'grpo.can_preview_grpo',
  /** Post GRPO to SAP */
  POST: 'grpo.add_grpoposting',
  /** View GRPO posting history */
  VIEW_HISTORY: 'grpo.can_view_grpo_history',
  /** View individual GRPO posting detail */
  VIEW_POSTING: 'grpo.view_grpoposting',
  /** Manage GRPO attachments (upload, delete, retry) */
  MANAGE_ATTACHMENTS: 'grpo.can_manage_grpo_attachments',
} as const;

/** Module prefix for sidebar filtering */
export const GRPO_MODULE_PREFIX = 'grpo';

/**
 * Type for GRPO permission values
 */
export type GRPOPermission = (typeof GRPO_PERMISSIONS)[keyof typeof GRPO_PERMISSIONS];
