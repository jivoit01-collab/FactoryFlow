/**
 * Partner Onboarding Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * Three rights per kind of registration, as SAP Portal split the work: a
 * verifier checks (and may edit and reject), an approver creates the partner in
 * SAP (and may reject). Verifying or approving implies viewing. The public
 * registration forms need no right at all.
 *
 * @see factory_app/partner_onboarding/permissions.py — these strings must match exactly
 * @see factory_app/partner_onboarding/models.py (Meta.permissions)
 */

export const PARTNER_ONBOARDING_PERMISSIONS = {
  VIEW_CUSTOMERS: 'partner_onboarding.can_view_customer_registrations',
  /** Verify, edit and reject customer registrations. */
  VERIFY_CUSTOMERS: 'partner_onboarding.can_verify_customer_registrations',
  /** Create the customer in SAP (and reject). */
  APPROVE_CUSTOMERS: 'partner_onboarding.can_approve_customer_registrations',
  VIEW_VENDORS: 'partner_onboarding.can_view_vendor_registrations',
  /** Verify, edit and reject vendor registrations. */
  VERIFY_VENDORS: 'partner_onboarding.can_verify_vendor_registrations',
  /** Create the vendor in SAP (and reject). */
  APPROVE_VENDORS: 'partner_onboarding.can_approve_vendor_registrations',
} as const;

export const PARTNER_ONBOARDING_MODULE_PREFIX = 'partner_onboarding';

/** Any customer right opens the customer queue. */
export const CUSTOMER_REGISTRATIONS_ACCESS: readonly string[] = [
  PARTNER_ONBOARDING_PERMISSIONS.VIEW_CUSTOMERS,
  PARTNER_ONBOARDING_PERMISSIONS.VERIFY_CUSTOMERS,
  PARTNER_ONBOARDING_PERMISSIONS.APPROVE_CUSTOMERS,
];

/** Any vendor right opens the vendor queue. */
export const VENDOR_REGISTRATIONS_ACCESS: readonly string[] = [
  PARTNER_ONBOARDING_PERMISSIONS.VIEW_VENDORS,
  PARTNER_ONBOARDING_PERMISSIONS.VERIFY_VENDORS,
  PARTNER_ONBOARDING_PERMISSIONS.APPROVE_VENDORS,
];

/** Anything that should reveal the module in the sidebar. */
export const PARTNER_ONBOARDING_ACCESS: readonly string[] = [
  ...CUSTOMER_REGISTRATIONS_ACCESS,
  ...VENDOR_REGISTRATIONS_ACCESS,
];

export type PartnerOnboardingPermission =
  (typeof PARTNER_ONBOARDING_PERMISSIONS)[keyof typeof PARTNER_ONBOARDING_PERMISSIONS];
