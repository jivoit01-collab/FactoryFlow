/**
 * Customer support contact.
 *
 * The number itself is **configuration, not a constant**: it lives in one row
 * in the backend (`issues.SupportContact`, edited in the Django admin) and is
 * read through `useSupportContact`. A support line moves, and whoever answers
 * it should not have to wait for a frontend release.
 *
 * What stays here is the plumbing, plus a last-resort number for the case
 * where the browser has never once reached the API — see the resolution order
 * in `useSupportContact`.
 */

/** Public endpoint; reachable from the login screen without a token. */
export const SUPPORT_CONTACT_ENDPOINT = '/issues/support-contact/';

/** One query key, so the header, the login screen and the settings form all
 *  read one fetch — and one invalidation refreshes every one of them. */
export const SUPPORT_CONTACT_QUERY_KEY = ['support-contact'] as const;

/** Where the last number the API served is remembered, so an offline login
 *  screen still shows the current one rather than the one from the build. */
export const SUPPORT_CONTACT_CACHE_KEY = 'support-contact:last-known';

export interface SupportContactPayload {
  /** Shown to the user exactly as it was typed on the settings screen. */
  phone: string;
  /** Dialling form: a leading `+` and digits only. Derived server-side. */
  dial: string;
  /** When it last changed. Null on a row no deploy has ever seeded. */
  updated_at?: string | null;
  /** Who changed it last, for the settings screen. */
  updated_by_name?: string;
}

/**
 * The number as of this build. Used only when the API has never answered on
 * this browser — a fresh install talking to a backend that is down. Worth
 * updating when the real number changes, but it is the floor, not the source.
 */
export const SUPPORT_CONTACT_FALLBACK: SupportContactPayload = {
  phone: '+91 9218179324',
  dial: '+919218179324',
};
