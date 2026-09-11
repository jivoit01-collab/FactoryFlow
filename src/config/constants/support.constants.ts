/**
 * Customer support contact details.
 *
 * One place to change the number: the header support menu, the sidebar
 * settings menu and the login screen all read from here.
 */
export const SUPPORT_CONTACT = {
  /** Shown to the user, exactly as support publishes it. */
  phone: '+91 9218179324',
  /** Dialling form — a leading + and digits only, nothing else. */
  phoneE164: '+919218179324',
} as const;

/** Tapping this dials on a phone and opens the dialler app on a desktop. */
export const SUPPORT_TEL_HREF = `tel:${SUPPORT_CONTACT.phoneE164}`;
