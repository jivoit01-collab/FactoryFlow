/**
 * The board's tunables and the rights that open it.
 *
 * Almost nothing here is a business figure — the metric definitions, the alert
 * thresholds and the tonnage rule all live server-side in
 * `admin_board/constants.py` and `admin_board/alerts.py`, because a board must
 * not be able to disagree with its own API about what a tile means. What is
 * here is how often it re-reads, when it stops believing itself, and who may
 * look at it.
 */

import { DASHBOARDS_PERMISSIONS, PLANNING_PURCHASE_PERMISSIONS } from '@/config/permissions';

/**
 * Fallback poll interval, in ms.
 *
 * The real interval comes from `meta.refresh_seconds` on every response, so the
 * cadence can be slowed from the server if HANA is struggling without shipping
 * a frontend release. This is only what the first request uses.
 */
export const ADMIN_BOARD_REFRESH_MS = 60_000;

/**
 * How long the board waits before it stops believing its own numbers.
 *
 * Three missed refreshes: long enough to ride out one slow SAP round trip,
 * short enough that nobody reads a frozen screen as this morning's.
 */
export const ADMIN_BOARD_STALE_AFTER_MS = ADMIN_BOARD_REFRESH_MS * 3;

/** Alerts the action centre shows before it starts hiding them. */
export const ADMIN_BOARD_MAX_ALERTS = 7;

/**
 * The cost donut's four hues, in fixed order, keyed by the server's slice key.
 *
 * THE ONE LICENSED EXCEPTION to the operations colour system's rule that
 * composition is tints of a single domain hue. These four are not parts of one
 * quantity — they are four unrelated cost lines, which is categorical identity,
 * and tinting one hue four ways would say they are a breakdown of each other.
 *
 * Validated against the light chart surface for the lightness band, chroma
 * floor, colour-vision separation, normal-vision separation and contrast. The
 * pink/violet pair lands in the tritan floor band, which is legal ONLY with a
 * secondary encoding — hence every slice is direct-labelled in the legend with
 * its own value, and identity is never carried by colour alone.
 *
 * Order is fixed and never cycled: a slice keeps its hue when its neighbours
 * change size or drop to nil.
 */
export const ADMIN_COST_COLOURS: Record<string, string> = {
  labour: '#2563EB',
  electricity: '#0D9488',
  salary: '#7C3AED',
  maintenance: '#DB2777',
};

/**
 * Rights that open the board.
 *
 * It mints none of its own, matching the API: the board is four existing
 * reports on one screen, so holding any of their rights already means being
 * allowed to read it. A new right would have to be created as a row on the live
 * database and added to every group before anyone could open the page.
 *
 * These must ALSO be present on the parent `/dashboards` navigation entry, or
 * the whole Dashboards menu hides from a user who holds only one of them.
 */
export const ADMIN_BOARD_VIEW_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
  PLANNING_PURCHASE_PERMISSIONS.VIEW,
  DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
  DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
];
