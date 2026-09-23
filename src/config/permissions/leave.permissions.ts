/**
 * Leave Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * The line that matters here is between **applying**, **deciding for your own
 * team**, and **deciding for anybody**. Three audiences, not three rungs of one
 * ladder, so they are gated on individually and never by a module prefix.
 *
 * One thing this file cannot express, and which the UI must not try to: holding
 * `can_decide_leave` does **not** mean you may decide a given request. The
 * server scopes it by the applicant's reporting line, and every request it
 * returns carries `can_decide` / `my_authority` saying whether *you* may act on
 * *that* one. Gate the buttons on those fields, not on the permission — a
 * client that re-derives an authorisation rule is a client that gets it wrong.
 *
 * @see factory_app/leave/permissions.py — these strings must match exactly
 * @see factory_app/leave/routing.py — who may decide what, and why
 */

export const LEAVE_PERMISSIONS = {
  /** Apply for your own leave. Needs a login linked to an employee record. */
  APPLY: 'leave.can_apply_leave',
  /** The time office: raise an application for somebody who has no login. */
  APPLY_FOR_OTHERS: 'leave.can_apply_leave_for_others',
  /** See the leave of everyone below you in the reporting tree. */
  VIEW_TEAM: 'leave.can_view_team_leave',
  /** Approve or reject — scoped by the tree at the point of use. */
  DECIDE: 'leave.can_decide_leave',
  /** HR: decide for anybody, anywhere in the org. */
  DECIDE_ANY: 'leave.can_decide_any_leave',
  /** Take back an approval. Separate because it unpicks an attendance row. */
  CANCEL_APPROVED: 'leave.can_cancel_approved_leave',
  /** Maintain the leave types and the holiday calendar. */
  MANAGE_TYPES: 'leave.can_manage_leave_types',
} as const;

export const LEAVE_MODULE_PREFIX = 'leave';

/** Anything that should reveal the module in the sidebar. */
export const LEAVE_ACCESS: readonly string[] = [
  LEAVE_PERMISSIONS.APPLY,
  LEAVE_PERMISSIONS.APPLY_FOR_OTHERS,
  LEAVE_PERMISSIONS.VIEW_TEAM,
  LEAVE_PERMISSIONS.DECIDE,
  LEAVE_PERMISSIONS.DECIDE_ANY,
];

/** Who may raise an application at all. */
export const LEAVE_APPLY_ACCESS: readonly string[] = [
  LEAVE_PERMISSIONS.APPLY,
  LEAVE_PERMISSIONS.APPLY_FOR_OTHERS,
];

/**
 * Who sees the approvals queue. Not who may approve a given request — the
 * server says that per row.
 */
export const LEAVE_DECIDE_ACCESS: readonly string[] = [
  LEAVE_PERMISSIONS.DECIDE,
  LEAVE_PERMISSIONS.DECIDE_ANY,
];

/** Who sees the team calendar. */
export const LEAVE_TEAM_ACCESS: readonly string[] = [
  LEAVE_PERMISSIONS.VIEW_TEAM,
  LEAVE_PERMISSIONS.DECIDE,
  LEAVE_PERMISSIONS.DECIDE_ANY,
];

/** Who maintains the leave types and holidays. */
export const LEAVE_MANAGE_ACCESS: readonly string[] = [LEAVE_PERMISSIONS.MANAGE_TYPES];

export type LeavePermission = (typeof LEAVE_PERMISSIONS)[keyof typeof LEAVE_PERMISSIONS];
