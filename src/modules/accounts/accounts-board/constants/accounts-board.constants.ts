import { CASH_BOOK_ACCESS } from '@/config/permissions';

/**
 * Who is offered the accounts dashboard.
 *
 * The same list the rest of the module uses. The board mints no right of its
 * own: it is the register summarised, so being allowed to read the register is
 * being allowed to read this.
 *
 * The board feed right (`control_boards.can_read_cash_book_feed`) is NOT listed
 * here on purpose. It exists for a dashboard-only login — the carousel display
 * user — which reaches the screen by its URL rather than through this sidebar,
 * and which the API answers with the names masked. Adding it here would put an
 * "Accounts" section in the sidebar of a login that can open exactly one page
 * in it, which is the parent-nav trap in reverse.
 */
export const ACCOUNTS_BOARD_VIEW_PERMISSIONS = CASH_BOOK_ACCESS;

/**
 * First poll interval, in milliseconds.
 *
 * Only the first: every later one comes from `meta.refresh_seconds`, so the
 * cadence is the server's to change without a frontend release.
 */
export const ACCOUNTS_BOARD_REFRESH_MS = 5 * 60 * 1000;

/**
 * The colour each breakdown line is drawn in.
 *
 * Four hues that stay apart for the two commonest colour-vision deficiencies —
 * the one pair that would collide, red and green, is never adjacent here — and
 * that read on the cream ground the page uses. Keyed by the server's bucket
 * key so a renamed label cannot silently recolour a line.
 */
export const BUCKET_COLOURS: Record<string, string> = {
  vendor_ap: 'var(--ab-bar-1)',
  expenses: 'var(--ab-bar-2)',
  salary_adjustment: 'var(--ab-bar-3)',
  payment_pending: 'var(--ab-bar-4)',
};

/** Fallback for a bucket the server adds before the frontend knows its colour. */
export const BUCKET_COLOUR_FALLBACK = 'var(--ab-bar-other)';
