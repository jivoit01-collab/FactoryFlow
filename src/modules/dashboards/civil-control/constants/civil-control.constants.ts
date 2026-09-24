/**
 * The civil board's tunables and the rights that open it.
 *
 * The worked-example rows that used to live at the bottom of this file are
 * gone. The board reads the construction register now, and leaving four
 * invented projects here as a fallback would mean an outage quietly restoring
 * fictional capex to a screen people have started trusting — see
 * `hooks/useCivilBoard.ts`, which reports a failed read as a failed read.
 */

import {
  BOARD_FEED_PERMISSIONS,
  CONSTRUCTION_ACCESS,
  DASHBOARDS_PERMISSIONS,
} from '@/config/permissions';

import type { CivilStage } from '../types';

/**
 * Rights that open the board.
 *
 * It mints none of its own, matching every other board here: a new right would
 * have to be created as a row on the live database and added to each group
 * before anybody could open the page.
 *
 * THE CONSTRUCTION RIGHTS LEAD THE LIST because they are the ones that decide
 * what the page can actually show. `/construction/projects/` is gated on
 * `can_view_project`, and — through `services.visible_projects` — a reader
 * without `can_view_all_projects` is served only the projects they manage or
 * are site in-charge of. That is the register's rule and this board does not
 * get to overrule it: somebody holding the narrow right sees a real board with
 * their own projects on it, which is correct, and the header's totals say how
 * many rows they are adding up.
 *
 * The two budget rights are kept beside them so that nobody who could open
 * this board before the register was wired up loses it. They open the page;
 * without a construction right the register answers 403 and the board says the
 * feed is unreachable rather than drawing an empty campus.
 *
 * These must ALSO be present on the parent `/dashboards` navigation entry, or
 * the whole Dashboards menu hides from a user who holds only one of them.
 */
export const CIVIL_BOARD_VIEW_PERMISSIONS: readonly string[] = [
  ...CONSTRUCTION_ACCESS,
  BOARD_FEED_PERMISSIONS.BUDGET_APPROVALS,
  DASHBOARDS_PERMISSIONS.VIEW_BUDGET_APPROVALS,
];

/**
 * The statuses a project is on this board at, as the register's filter wants
 * them — a comma-separated list, which `ProjectListCreateAPI` splits.
 *
 * These are exactly `constants.ACTIVE_STATUSES` on the backend: the three at
 * which a project is loggable and spendable against. A draft is somebody's
 * half-filled form and a completed job is a building; neither belongs under a
 * heading that says "ongoing".
 *
 * A value that is not a status matches nothing rather than being dropped, so
 * a typo here empties the board instead of quietly widening it.
 */
export const CIVIL_ONGOING_STATUSES = 'APPROVED,IN_PROGRESS,ON_HOLD';

/**
 * How often the board re-reads the register, and how long a read stays fresh.
 *
 * Five minutes because this is a wall display of a register that moves when
 * somebody files a day's log — hourly in practice. A tighter loop would poll
 * the database all day to redraw the same six rows.
 *
 * The stale time is deliberately shorter than the interval: a manager who
 * opens the board from a menu should get today's register, not whatever was
 * cached when the Construction page was last open.
 */
export const CIVIL_BOARD_REFRESH_MS = 5 * 60 * 1000;
export const CIVIL_BOARD_STALE_MS = 60 * 1000;

/**
 * How long a project's revision history stays fresh.
 *
 * Revisions are decided by a director a few times a year, and the board reads
 * them only for the date a project was first committed to. Half an hour keeps
 * that off the board's own heartbeat — otherwise it would be one request per
 * project every five minutes for a figure that changes quarterly.
 */
export const CIVIL_REVISION_STALE_MS = 30 * 60 * 1000;

/**
 * How far a project may fall behind the calendar before the board says so.
 *
 * Two thresholds, in percentage points of "work certified" against "time
 * elapsed". A project is not late because it is at 38% — it is late because it
 * is at 38% of the work with 52% of the time gone. The gap is the only thing
 * that can be judged without knowing the trade.
 *
 * The slack exists because progress is certified in steps: a frame goes up over
 * a fortnight and is signed off on one day, so a project genuinely on programme
 * reads a few points behind for most of the month.
 */
export const CIVIL_SLIP_WARN_PCT = 5;
export const CIVIL_SLIP_BAD_PCT = 12;

/**
 * The stage word, as the site office says it.
 *
 * Four of these are reachable from the register today — see `CivilStage`. The
 * trade words below them are kept so that the day a daily log carries a stage,
 * the board already knows what to call it.
 */
export const CIVIL_STAGE_LABEL: Record<CivilStage, string> = {
  planning: 'Planning',
  // What the register says when work is under way and nothing says which
  // trade is on site. Not a trade, and deliberately not dressed as one.
  'in-progress': 'Under way',
  foundation: 'Foundation',
  structure: 'Structure',
  roofing: 'Roofing',
  finishing: 'Finishing',
  handover: 'Handover',
  'on-hold': 'On hold',
};
