/**
 * SAP Documents Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * SAP Portal's document browser let any login open every document and every
 * attachment. Here browsing is one right and downloading the attached scans
 * another; the server needs both for a download.
 *
 * @see factory_app/sap_documents/permissions.py — these strings must match exactly
 */

export const SAP_DOCUMENTS_PERMISSIONS = {
  /** Document lists and detail, payment drafts, attachment lists. */
  VIEW: 'sap_documents.can_view_sap_documents',
  /** The attachment files themselves. Only useful together with VIEW. */
  DOWNLOAD_ATTACHMENTS: 'sap_documents.can_download_sap_attachments',
} as const;

export const SAP_DOCUMENTS_MODULE_PREFIX = 'sap_documents';

/** The browser page and its sidebar entry. */
export const SAP_DOCUMENTS_ACCESS: readonly string[] = [SAP_DOCUMENTS_PERMISSIONS.VIEW];

/** Both rights the download endpoint checks. */
export const SAP_DOCUMENTS_DOWNLOAD_ACCESS: readonly string[] = [
  SAP_DOCUMENTS_PERMISSIONS.VIEW,
  SAP_DOCUMENTS_PERMISSIONS.DOWNLOAD_ATTACHMENTS,
];

export type SapDocumentsPermission =
  (typeof SAP_DOCUMENTS_PERMISSIONS)[keyof typeof SAP_DOCUMENTS_PERMISSIONS];
