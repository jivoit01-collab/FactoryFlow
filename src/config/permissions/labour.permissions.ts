/**
 * Labour Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * The standalone Labour module (the "Labour Department" / "labour depart" group)
 * is backed by the `labour_count` Django app — the daily man-day register where a
 * department supervisor submits headcounts and a gate operator verifies them. A
 * subset of `production_execution.resourcelabour` permissions is also granted so
 * labour recorded here can flow through to production runs.
 *
 * This mirrors the permissions actually assigned to the `labour depart` group in
 * the admin panel; keep the two in sync.
 *
 * Note: the older `labour_gate` in/out headcount feature is a separate concern and
 * is surfaced under `GATE_PERMISSIONS.LABOUR_GATE`.
 *
 * @see gate.permissions.ts (GATE_PERMISSIONS.LABOUR_COUNT, GATE_PERMISSIONS.LABOUR_GATE)
 */

export const LABOUR_PERMISSIONS = {
  // ============================================
  // LABOUR COUNT SHEET (the daily man-day register)
  // ============================================
  /** View labour count sheets */
  VIEW: 'labour_count.view_labourcountsheet',
  /** Create labour count sheets */
  CREATE: 'labour_count.add_labourcountsheet',
  /** Edit labour count sheets */
  EDIT: 'labour_count.change_labourcountsheet',
  /** Delete labour count sheets */
  DELETE: 'labour_count.delete_labourcountsheet',
  /** Department supervisor: enter/submit labour counts */
  SUBMIT: 'labour_count.can_submit_labour_count',
  /** Gate operator: verify (OK) submitted counts */
  VERIFY: 'labour_count.can_verify_labour_count',

  // ============================================
  // LABOUR COUNT ITEM (per-line entries within a sheet)
  // ============================================
  VIEW_ITEM: 'labour_count.view_labourcountitem',
  CREATE_ITEM: 'labour_count.add_labourcountitem',
  EDIT_ITEM: 'labour_count.change_labourcountitem',
  DELETE_ITEM: 'labour_count.delete_labourcountitem',

  // ============================================
  // LABOUR VERIFICATION
  // ============================================
  VIEW_VERIFICATION: 'labour_count.view_labourverification',
  CREATE_VERIFICATION: 'labour_count.add_labourverification',
  EDIT_VERIFICATION: 'labour_count.change_labourverification',
  DELETE_VERIFICATION: 'labour_count.delete_labourverification',

  // ============================================
  // LABOUR OUT BATCH (labour leaving in batches)
  // ============================================
  VIEW_OUT_BATCH: 'labour_count.view_labouroutbatch',
  CREATE_OUT_BATCH: 'labour_count.add_labouroutbatch',
  EDIT_OUT_BATCH: 'labour_count.change_labouroutbatch',
  DELETE_OUT_BATCH: 'labour_count.delete_labouroutbatch',

  // ============================================
  // LABOUR SHIFT WINDOW (shift definitions/time windows)
  // ============================================
  VIEW_SHIFT_WINDOW: 'labour_count.view_labourshiftwindow',
  CREATE_SHIFT_WINDOW: 'labour_count.add_labourshiftwindow',
  EDIT_SHIFT_WINDOW: 'labour_count.change_labourshiftwindow',
  DELETE_SHIFT_WINDOW: 'labour_count.delete_labourshiftwindow',

  // ============================================
  // RESOURCE LABOUR (labour entries on production runs)
  // ============================================
  VIEW_RESOURCE_LABOUR: 'production_execution.view_resourcelabour',
  CREATE_RESOURCE_LABOUR: 'production_execution.add_resourcelabour',
  EDIT_RESOURCE_LABOUR: 'production_execution.change_resourcelabour',
  DELETE_RESOURCE_LABOUR: 'production_execution.delete_resourcelabour',
} as const;

/**
 * Module prefixes for sidebar filtering. The standalone Labour module maps to the
 * `labour_count` Django app, so granting anything under it lights up the module.
 */
export const LABOUR_MODULE_PREFIX = ['labour_count'] as const;

/**
 * Type for Labour permission values
 */
export type LabourPermission = (typeof LABOUR_PERMISSIONS)[keyof typeof LABOUR_PERMISSIONS];
