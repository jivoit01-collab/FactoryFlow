/**
 * SAP Reports Module Permissions
 *
 * These strings map 1:1 to the custom Django permissions declared on the
 * `sap_reports.SapReport` model. VIEW lets a user run the reports the company
 * has published; SYNC adds the "Sync from SAP" button and nothing else; MANAGE
 * is the admin side — syncing the catalogue from SAP's Query Manager, renaming
 * reports, correcting filter labels, reading the SQL.
 *
 * MANAGE also shows every report, whether assigned or not. SYNC does not, so it
 * is the one to give someone who only needs to refresh the catalogue.
 */

export const SAP_REPORTS_PERMISSIONS = {
  /** List and run SAP reports — gates the module */
  VIEW: 'sap_reports.can_view_sap_reports',
  /** Sync from SAP only — still sees just the reports assigned to them */
  SYNC: 'sap_reports.can_sync_sap_reports',
  /** Sync from SAP, edit a report's setup, view its SQL, see every report */
  MANAGE: 'sap_reports.can_manage_sap_reports',
} as const;

export const SAP_REPORTS_MODULE_PREFIX = 'sap_reports';

/** Any permission that should reveal the module. */
export const SAP_REPORTS_ACCESS: readonly string[] = [
  SAP_REPORTS_PERMISSIONS.VIEW,
  SAP_REPORTS_PERMISSIONS.MANAGE,
];

export type SapReportsPermission =
  (typeof SAP_REPORTS_PERMISSIONS)[keyof typeof SAP_REPORTS_PERMISSIONS];
