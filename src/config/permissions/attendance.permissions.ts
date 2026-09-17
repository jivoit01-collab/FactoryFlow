/**
 * Attendance Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * The important line here is between **viewing** the daily sheet and
 * **overriding** a status. They are separate grants, not a ladder, so they are
 * listed separately and gated on individually — a prefix match would hand the
 * correction right to every supervisor who can open the page.
 *
 * Changing a status contradicts a punching machine, on a day that has already
 * closed, and payroll is run from the result. That is an HR act.
 *
 * @see factory_app/attendance/permissions.py — these strings must match exactly
 */

export const ATTENDANCE_PERMISSIONS = {
  /** See the daily sheet: who the machine says turned up */
  VIEW_DAILY: 'attendance.can_view_daily_attendance',
  /** The older dashboard permission, kept because live groups still hold it */
  VIEW_DASHBOARD: 'attendance.can_view_attendance_dashboard',
  /** Change a status away from what the machine recorded */
  OVERRIDE: 'attendance.can_override_attendance_status',
  /** Pull fresh punches from the machines on demand */
  SYNC: 'attendance.can_sync_attendance',
  /** Download the sheet */
  EXPORT: 'attendance.can_export_attendance',
  /** Mark somebody present by hand, when the machine itself is down */
  MARK: 'attendance.add_attendancerecord',
  /** Read the manual, photographed gate marks */
  VIEW_RECORDS: 'attendance.view_attendancerecord',
} as const;

export const ATTENDANCE_MODULE_PREFIX = 'attendance';

/** Anything that should reveal the module in the sidebar. */
export const ATTENDANCE_ACCESS: readonly string[] = [
  ATTENDANCE_PERMISSIONS.VIEW_DAILY,
  ATTENDANCE_PERMISSIONS.VIEW_DASHBOARD,
  ATTENDANCE_PERMISSIONS.VIEW_RECORDS,
  ATTENDANCE_PERMISSIONS.OVERRIDE,
];

/**
 * Who may correct a status. Deliberately one permission: this is the grant the
 * whole audit trail exists to constrain, and widening it here would widen it
 * silently.
 */
export const ATTENDANCE_OVERRIDE_ACCESS: readonly string[] = [
  ATTENDANCE_PERMISSIONS.OVERRIDE,
];

/** Who may trigger a pull from the punch machines. */
export const ATTENDANCE_SYNC_ACCESS: readonly string[] = [
  ATTENDANCE_PERMISSIONS.SYNC,
  ATTENDANCE_PERMISSIONS.OVERRIDE,
];

/** Who may mark attendance by hand when the machine is down. */
export const ATTENDANCE_MARK_ACCESS: readonly string[] = [ATTENDANCE_PERMISSIONS.MARK];

export type AttendancePermission =
  (typeof ATTENDANCE_PERMISSIONS)[keyof typeof ATTENDANCE_PERMISSIONS];
