/**
 * Issue Tracker Permissions
 *
 * These map 1:1 to the custom Django permissions on `issues.IssuePermission`.
 *
 * The split that matters is CREATE vs TRIAGE. `CREATE` is meant to be handed to
 * everybody who uses the software -- if someone can hit a bug they should be
 * able to report it -- while labelling, assigning and closing other people's
 * issues sits behind `TRIAGE`. A reporter can still edit and close their own
 * issue; the backend enforces that as an object-level rule, and the detail
 * response reports it back as `permissions.can_edit`.
 */

export const ISSUE_PERMISSIONS = {
  /** Open the tracker and read issues */
  VIEW: 'issues.can_view_issues',
  /** File a new issue, comment, edit and close your own */
  CREATE: 'issues.can_create_issues',
  /** Label, assign, close, reopen, pin and delete anyone's issue */
  TRIAGE: 'issues.can_triage_issues',
  /** Maintain the labels, and the support number every user sees */
  MANAGE_SETTINGS: 'issues.can_manage_issue_settings',
} as const;

export const ISSUES_MODULE_PREFIX = 'issues';

/** Anything that should reveal the tracker. */
export const ISSUE_ACCESS: readonly string[] = [
  ISSUE_PERMISSIONS.VIEW,
  ISSUE_PERMISSIONS.CREATE,
  ISSUE_PERMISSIONS.TRIAGE,
  ISSUE_PERMISSIONS.MANAGE_SETTINGS,
];

/** Anything that should reveal the "New issue" button and form. */
export const ISSUE_CREATE_ACCESS: readonly string[] = [
  ISSUE_PERMISSIONS.CREATE,
  ISSUE_PERMISSIONS.TRIAGE,
];

/** The issue tracker's settings screen. */
export const ISSUE_SETTINGS_ACCESS: readonly string[] = [
  ISSUE_PERMISSIONS.MANAGE_SETTINGS,
];

export type IssuePermission = (typeof ISSUE_PERMISSIONS)[keyof typeof ISSUE_PERMISSIONS];
