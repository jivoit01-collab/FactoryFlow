/**
 * The board's tunables and the rights that open it.
 *
 * No business figure lives here. What counts as "on the rolls", what counts as
 * a labourer entering, and the whole intake-versus-allocation rule are decided
 * server-side in `hr_board/constants.py` and `hr_board/services.py`, because a
 * board must not be able to disagree with its own API about what a tile means.
 */

import {
  BOARD_FEED_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  GATE_PERMISSIONS,
} from '@/config/permissions';

/**
 * Fallback poll interval, in ms.
 *
 * The real cadence comes from `meta.refresh_seconds` on every response, so it
 * can be slowed from the server without a frontend release. This is only what
 * the first request uses.
 *
 * Slower than the operational boards on purpose: the directory changes when HR
 * types something and the gate books labour in two bursts a day, so a minute's
 * cadence would be twelve hundred reads a day to watch a number that moves
 * twice.
 */
export const HR_BOARD_REFRESH_MS = 300_000;

/**
 * How long the board waits before it stops believing its own numbers.
 *
 * Three missed refreshes, matching its neighbours: long enough to ride out one
 * slow round trip, short enough that nobody reads a frozen screen as today's.
 */
export const HR_BOARD_STALE_AFTER_MS = HR_BOARD_REFRESH_MS * 3;

/**
 * Days of labour intake drawn as columns.
 *
 * The API sends thirty. Fourteen are drawn, because a wall screen cannot carry
 * thirty labelled columns at a legible width — the fortnight shows two Sundays,
 * which is enough for the weekly shape to be visible. The month still drives
 * the average and the peak, which are read off the whole window server-side.
 */
export const HR_BOARD_TREND_COLUMNS = 14;

/**
 * Cards a ranked tile shows before it folds the rest into one line.
 *
 * Set by the GRID, not by the data: two columns of cards at a size a figure can
 * be read at from four metres gives three rows in the space a tile has under
 * its headline. A seventh card does not overflow the tile — the card grid is
 * clipped by its own tile — it silently shrinks all six others to fit, which is
 * the worse failure because nothing about it looks wrong.
 *
 * Rows past the fold are never dropped. They join the tail line, so the cards
 * plus the tail still add up to the figure above them.
 */
export const HR_CARD_LIMIT = 6;

/**
 * Rights that open the board.
 *
 * It mints none of its own, matching the API: the board is two existing
 * registers on one screen, so holding either module's read right already means
 * being allowed to read it. A new right would have to be created as a row on
 * the live database and added to every group before anybody could open the
 * page.
 *
 * These must ALSO be present on the parent `/dashboards` navigation entry, or
 * the whole Dashboards menu hides from a user who holds only one of them.
 *
 * THE FEED RIGHTS COME FIRST, AND THE OPERATIONAL ONES STAY.
 * The two `BOARD_FEED_PERMISSIONS` entries are what a dashboard-only login
 * holds: they open this composed board on the server and reach no operational
 * endpoint, so granting them puts nothing in the sidebar. The rights below them
 * are the ones today's readers already hold, kept so nobody's access narrows.
 *
 * Holding only one opens the board and withholds the other band; the server
 * reports which in `meta.withheld`.
 *
 * NO SALARY RIGHT APPEARS HERE, and none is read by the API. Pay is a separate,
 * narrower family in `employee_hierarchy`, and this board shows head counts
 * only — so opening it can never reveal a figure of anybody's.
 */
export const HR_BOARD_VIEW_PERMISSIONS: readonly string[] = [
  BOARD_FEED_PERMISSIONS.WORKFORCE,
  BOARD_FEED_PERMISSIONS.LABOUR,
  EMPLOYEE_PERMISSIONS.VIEW,
  EMPLOYEE_PERMISSIONS.VIEW_REPORTS,
  GATE_PERMISSIONS.LABOUR_GATE.VIEW,
  GATE_PERMISSIONS.LABOUR_GATE.RECORD_IN,
  GATE_PERMISSIONS.LABOUR_GATE.ALLOCATE,
];
