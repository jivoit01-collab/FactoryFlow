/**
 * SAP Identity Permissions
 *
 * Maps 1:1 to the custom Django permission on
 * `sap_client.SapApproverIdentity`. The mapping decides who may take a SAP
 * approval decision in this app — SAP accepts one only from the authorizer its
 * template names, so the app offers Approve only to the person whose own SAP
 * account is that authorizer.
 *
 * There is no VIEW counterpart: the page is purely administrative, and every
 * approver screen reads the caller's own mapping through
 * `/sap-identity/me/`, which needs no permission (a screen cannot correctly
 * disable an action it is not allowed to ask about).
 */

export const SAP_IDENTITY_PERMISSIONS = {
  /** Map app users to SAP user accounts */
  MANAGE: 'sap_client.can_manage_sap_identities',
} as const;

export const SAP_IDENTITY_MODULE_PREFIX = 'sap_client';

export type SapIdentityPermission =
  (typeof SAP_IDENTITY_PERMISSIONS)[keyof typeof SAP_IDENTITY_PERMISSIONS];
