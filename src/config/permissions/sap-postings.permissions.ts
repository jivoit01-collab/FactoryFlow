/**
 * SAP Postings Permissions
 *
 * Django's own model permissions on `sap_postings.SapPosting`, so superusers
 * hold them without being given anything and anyone else is given them in the
 * admin. VIEW reads the SAP posting log; CHANGE sends a posting again or cancels
 * it, which changes what the app will do in SAP.
 */

export const SAP_POSTINGS_PERMISSIONS = {
  VIEW: 'sap_postings.view_sapposting',
  CHANGE: 'sap_postings.change_sapposting',
} as const;

export type SapPostingsPermission =
  (typeof SAP_POSTINGS_PERMISSIONS)[keyof typeof SAP_POSTINGS_PERMISSIONS];
