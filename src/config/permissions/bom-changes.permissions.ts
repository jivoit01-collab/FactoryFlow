/**
 * BOM Changes Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * SAP Portal's BOM roles, as rights: manager → level 1, sr_manager → level 2,
 * sap_adder → the push that writes SAP, admin → a direct push with no
 * approvals. Which right a request needs next depends on the server's
 * configured number of levels, so the page never works that out itself — each
 * request row says what the caller may do (`can_approve`, `can_push`, …).
 *
 * @see factory_app/bom_changes/permissions.py — these strings must match exactly
 */

export const BOM_CHANGES_PERMISSIONS = {
  /** Requests, their history and the SAP BOM viewer. Every other right implies it. */
  VIEW: 'bom_changes.can_view_bom_changes',
  /** Raise a request for a new BOM or a change to one. */
  REQUEST: 'bom_changes.can_request_bom_changes',
  /** Approve or reject at level 1 (the portal's manager). */
  APPROVE_LEVEL_1: 'bom_changes.can_approve_bom_level_1',
  /** Approve or reject at level 2 (the portal's senior manager). */
  APPROVE_LEVEL_2: 'bom_changes.can_approve_bom_level_2',
  /** The last approval, which writes the BOM to SAP (the portal's SAP adder). */
  PUSH: 'bom_changes.can_push_bom_to_sap',
  /** Write a new or changed BOM to SAP at once, with no approvals (the portal's admin). */
  PUSH_DIRECTLY: 'bom_changes.can_push_bom_directly',
} as const;

export const BOM_CHANGES_MODULE_PREFIX = 'bom_changes';

/** Anything that should reveal the module in the sidebar (every right implies viewing). */
export const BOM_CHANGES_ACCESS: readonly string[] = Object.values(BOM_CHANGES_PERMISSIONS);

/** Someone who signs a level: the "My turn" tab is theirs. */
export const BOM_CHANGES_APPROVER_ACCESS: readonly string[] = [
  BOM_CHANGES_PERMISSIONS.APPROVE_LEVEL_1,
  BOM_CHANGES_PERMISSIONS.APPROVE_LEVEL_2,
  BOM_CHANGES_PERMISSIONS.PUSH,
];

export type BomChangesPermission =
  (typeof BOM_CHANGES_PERMISSIONS)[keyof typeof BOM_CHANGES_PERMISSIONS];
