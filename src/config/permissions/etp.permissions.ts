/**
 * ETP / STP Module Permissions
 *
 * These strings map 1:1 to the custom Django permissions declared on
 * `etp.EtpPermission` (`etp.can_*`). One view / one manage right per register,
 * so a plant operator can be given the daily log without the calibration
 * record, and the masters sit behind MANAGE_SETTINGS alone.
 */

export const ETP_PERMISSIONS = {
  /** See the module at all (the hub page) */
  VIEW_MODULE: 'etp.can_view_etp_module',
  /** Edit the masters: plants, chemicals, parameters, people, dropdowns */
  MANAGE_SETTINGS: 'etp.can_manage_etp_settings',

  VIEW_DAILY_LOG: 'etp.can_view_etp_daily_log',
  MANAGE_DAILY_LOG: 'etp.can_manage_etp_daily_log',

  VIEW_MONITORING: 'etp.can_view_etp_monitoring',
  MANAGE_MONITORING: 'etp.can_manage_etp_monitoring',
  /** Countersign a monitoring sheet (the QAM signature) */
  VERIFY_MONITORING: 'etp.can_verify_etp_monitoring',

  VIEW_CHEMICAL: 'etp.can_view_etp_chemical',
  MANAGE_CHEMICAL: 'etp.can_manage_etp_chemical',

  VIEW_SLUDGE: 'etp.can_view_etp_sludge',
  MANAGE_SLUDGE: 'etp.can_manage_etp_sludge',

  VIEW_BACKWASH: 'etp.can_view_etp_backwash',
  MANAGE_BACKWASH: 'etp.can_manage_etp_backwash',

  VIEW_CALIBRATION: 'etp.can_view_etp_calibration',
  MANAGE_CALIBRATION: 'etp.can_manage_etp_calibration',
} as const;

export const ETP_MODULE_PREFIX = 'etp';

/** Any permission that should reveal a register page (view or record it). */
export const ETP_DAILY_LOG_ACCESS: readonly string[] = [
  ETP_PERMISSIONS.VIEW_DAILY_LOG,
  ETP_PERMISSIONS.MANAGE_DAILY_LOG,
];
export const ETP_MONITORING_ACCESS: readonly string[] = [
  ETP_PERMISSIONS.VIEW_MONITORING,
  ETP_PERMISSIONS.MANAGE_MONITORING,
];
export const ETP_CHEMICAL_ACCESS: readonly string[] = [
  ETP_PERMISSIONS.VIEW_CHEMICAL,
  ETP_PERMISSIONS.MANAGE_CHEMICAL,
];
export const ETP_SLUDGE_ACCESS: readonly string[] = [
  ETP_PERMISSIONS.VIEW_SLUDGE,
  ETP_PERMISSIONS.MANAGE_SLUDGE,
];
export const ETP_BACKWASH_ACCESS: readonly string[] = [
  ETP_PERMISSIONS.VIEW_BACKWASH,
  ETP_PERMISSIONS.MANAGE_BACKWASH,
];
export const ETP_CALIBRATION_ACCESS: readonly string[] = [
  ETP_PERMISSIONS.VIEW_CALIBRATION,
  ETP_PERMISSIONS.MANAGE_CALIBRATION,
];

/** Anything that should reveal the module's hub page. */
export const ETP_ACCESS: readonly string[] = [
  ETP_PERMISSIONS.VIEW_MODULE,
  ...ETP_DAILY_LOG_ACCESS,
  ...ETP_MONITORING_ACCESS,
  ...ETP_CHEMICAL_ACCESS,
  ...ETP_SLUDGE_ACCESS,
  ...ETP_BACKWASH_ACCESS,
  ...ETP_CALIBRATION_ACCESS,
];

export type EtpPermission = (typeof ETP_PERMISSIONS)[keyof typeof ETP_PERMISSIONS];
