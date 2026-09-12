/**
 * The board's tunables, and the vocabulary its four bands are drawn in.
 *
 * Almost nothing here is a business figure — those all live server-side, in
 * `plant_board/constants.py`, because a wall board must not be able to disagree
 * with its own API about what a tile means. What is here is how often the board
 * re-reads, when it stops believing itself, and which rights open the route.
 */

import { DASHBOARDS_PERMISSIONS, PLANNING_PURCHASE_PERMISSIONS } from '@/config/permissions';

/**
 * Fallback poll interval, in ms.
 *
 * The real interval comes from `meta.refresh_seconds` on every response, so it
 * can be slowed down from the server if HANA is struggling without shipping a
 * frontend release. This is only what the first request uses.
 */
export const PLANT_BOARD_REFRESH_MS = 60_000;

/**
 * How long the board waits before it stops believing its own numbers.
 *
 * A wall board has no reader to notice a dead feed, so past this age the header
 * stops saying LIVE and says how stale it is instead. Three missed refreshes:
 * long enough to ride out one slow SAP round trip, short enough that nobody
 * reads a frozen screen as this morning's.
 */
export const PLANT_BOARD_STALE_AFTER_MS = PLANT_BOARD_REFRESH_MS * 3;

/** Rows a creeping list carries before it repeats. */
export const PLANT_BOARD_MAX_ROWS = 8;

/**
 * Colour is NOT configured here, on purpose.
 *
 * Each band's hue comes from its domain class in `styles/plant-board.css`, and
 * every bar inside a band is a tint of that same hue, chosen by a fill class
 * rather than by an inline value. That is rule one of the operations colour
 * system: a hex in a component is how a second palette gets in.
 *
 * The band order is the order material moves through the plant, and it is
 * expressed by the markup rather than by a list — the page reads down it.
 */

/**
 * The stores the Store band covers, and the ones its settings page configures.
 *
 * Mirrors the backend's `STORE_WAREHOUSES`. Duplicated rather than fetched
 * because the settings page has to render a card per store before any request
 * lands, and a settings screen that appears one field at a time as an API
 * answers is worse than one that is simply correct.
 */
export const PLANT_BOARD_STORES: readonly string[] = ['BH-PM', 'BH-BS', 'BH-NM', 'BH-PC'];

/**
 * Rights that open the board.
 *
 * It mints none of its own, matching the API: the board is four existing
 * reports on one screen, so holding any of their rights already means being
 * allowed to read it. A new right would have to be created as a row on the live
 * database and added to every group before anyone could open the page, and it
 * would buy nothing.
 *
 * These must ALSO be present on the parent `/dashboards` navigation entry, or
 * the whole Dashboards menu hides from a user who holds only one of them.
 */
export const PLANT_BOARD_VIEW_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
  DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
  DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
  PLANNING_PURCHASE_PERMISSIONS.VIEW,
];
