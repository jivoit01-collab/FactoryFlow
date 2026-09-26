/**
 * SAP Approvals Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * SAP Portal had one `sap-approvals` module that let anyone mapped to a SAP user
 * approve, reject and withdraw; here the three are separate rights. Deciding and
 * withdrawing each imply viewing on the server. None of them lets anyone act as
 * someone else: SAP takes a decision only from the stage's own authorizer, and
 * the server checks the caller IS that SAP user first.
 *
 * @see factory_app/sap_approvals/permissions.py — these strings must match exactly
 */

export const SAP_APPROVALS_PERMISSIONS = {
  /** The inbox, one request, the badge. */
  VIEW_INBOX: 'sap_approvals.can_view_sap_approval_inbox',
  /** Approve or reject as the caller's own SAP user. Implies VIEW_INBOX. */
  DECIDE: 'sap_approvals.can_decide_sap_approvals',
  /** Withdraw a pending request the caller raised. Implies VIEW_INBOX. */
  WITHDRAW_OWN: 'sap_approvals.can_withdraw_own_sap_approvals',
} as const;

export const SAP_APPROVALS_MODULE_PREFIX = 'sap_approvals';

/** Anything that opens the inbox (either action right implies viewing). */
export const SAP_APPROVALS_ACCESS: readonly string[] = [
  SAP_APPROVALS_PERMISSIONS.VIEW_INBOX,
  SAP_APPROVALS_PERMISSIONS.DECIDE,
  SAP_APPROVALS_PERMISSIONS.WITHDRAW_OWN,
];

export type SapApprovalsPermission =
  (typeof SAP_APPROVALS_PERMISSIONS)[keyof typeof SAP_APPROVALS_PERMISSIONS];
