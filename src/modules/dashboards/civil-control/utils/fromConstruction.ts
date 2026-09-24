/**
 * The register, read as a board row.
 *
 * ONE FILE, BECAUSE EVERY LIE THIS BOARD COULD TELL WOULD BE TOLD HERE. The
 * construction register answers most of what the board asks and genuinely does
 * not answer the rest, and the gap between those two sets is the only thing
 * that decides whether a manager reads a real figure or an invented one. It is
 * therefore a pure function with its own tests rather than a `.map()` inside a
 * hook: the argument about what a null means is worth having once, in writing,
 * where it can be checked.
 *
 * NOTHING BELOW COMPUTES A BUSINESS FIGURE. Percentages drawn, slippage and
 * elapsed time are all worked out by the board from these fields; what happens
 * here is parsing, unit conversion and the decision of which register values
 * mean "not said".
 */

import type {
  DimensionUnit,
  ProjectListItem,
  ProjectRevision,
  ProjectStatus,
} from '@/modules/construction/types';

import type { CivilPlot, CivilProject, CivilStage } from '../types';

/** One foot in metres, the other way up. Exact by definition since 1959. */
const FEET_PER_METRE = 1 / 0.3048;

/**
 * A register decimal, as a number — or null where it will not parse.
 *
 * Every money and measurement value on the register is a STRING: the backend
 * quantises and stringifies so no amount is ever a float in transit. `Number`
 * is the right reader for those, but it also answers 0 for `''` and for null,
 * which on this board would turn "the register does not say" into "nil" — the
 * one substitution the whole screen is built to avoid.
 */
function decimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A length in feet, whatever the project was filed in. */
function feet(value: string | null | undefined, unit: DimensionUnit): number | null {
  const parsed = decimal(value);
  if (parsed === null) return null;
  return unit === 'M' ? parsed * FEET_PER_METRE : parsed;
}

/**
 * The status the register keeps, as the word the board prints.
 *
 * THE MAP IS TOTAL AND TWO OF ITS ENTRIES ARE UNREACHABLE. `REJECTED` and
 * `CANCELLED` never reach this board, which asks the register only for the
 * live statuses — but a partial map would mean a status added upstream lands
 * here as `undefined` and renders as a blank chip. They answer `planning`
 * because that is where such a project stopped: the money was never
 * sanctioned and no work was ever done.
 *
 * `IN_PROGRESS` is the honest limit of what the register knows. It says work
 * is under way and does not say which trade is on site, and this file will not
 * guess one from a percentage.
 */
const STAGE_FOR_STATUS: Record<ProjectStatus, CivilStage> = {
  DRAFT: 'planning',
  PENDING_APPROVAL: 'planning',
  APPROVED: 'planning',
  IN_PROGRESS: 'in-progress',
  ON_HOLD: 'on-hold',
  COMPLETED: 'handover',
  REJECTED: 'planning',
  CANCELLED: 'planning',
};

export function civilStage(status: ProjectStatus): CivilStage {
  return STAGE_FOR_STATUS[status] ?? 'planning';
}

/**
 * The plot, in feet, or null where the register holds fewer than two sides.
 *
 * A boundary wall has a length and no meaningful breadth, and half a plot
 * drawn as "120 × 0 ft" would be read as a mistake in the register rather than
 * as a shape that has none.
 */
export function civilPlot(item: ProjectListItem): CivilPlot | null {
  const length = feet(item.length, item.dimension_unit);
  const width = feet(item.breadth, item.dimension_unit);
  if (length === null || width === null) return null;
  return { length_ft: Math.round(length), width_ft: Math.round(width) };
}

/**
 * The date this project was FIRST committed to, or null if it still stands on
 * its original one.
 *
 * Read off the earliest approved revision that actually moved the end date —
 * the only place the register remembers what the date used to be. Three
 * filters, each of which is a way a programme could look re-baselined without
 * having been:
 *
 *   status APPROVED   — a requested extension is not an extension. A pending
 *                       revision that the board treated as granted would show
 *                       a slip the director has not agreed to.
 *   new_end_date set  — a revision may ask for money alone, and that snapshot
 *                       of the old date is not evidence the date changed.
 *   the date moved    — a revision that re-states the same date would print a
 *                       second identical date under the first and say nothing.
 *
 * Earliest by `revision_no`, never latest: after three extensions the honest
 * comparison is against the date originally promised, not against the last one
 * that was missed.
 */
export function baselineEnd(revisions: ProjectRevision[] | undefined): string | null {
  if (!revisions?.length) return null;
  const moved = revisions
    .filter(
      (revision) =>
        revision.status === 'APPROVED' &&
        !!revision.new_end_date &&
        !!revision.end_date_before &&
        revision.new_end_date !== revision.end_date_before,
    )
    .sort((a, b) => a.revision_no - b.revision_no);
  return moved.length ? moved[0].end_date_before : null;
}

/**
 * One register row, as one board row.
 *
 * `revisions` is optional and its absence is not an error: the histories are
 * fetched per project and a board whose rows waited for all of them would show
 * nothing while one slow project loaded. Without them `baseline_end` is null
 * and the timeline simply prints no original date — the board says so in its
 * header rather than implying the programme has never moved.
 */
export function civilProjectFromRegister(
  item: ProjectListItem,
  revisions?: ProjectRevision[],
): CivilProject {
  // A sanctioned budget is a roll-up that stays at zero until a project is
  // approved, so zero here means "nothing is sanctioned" and not "sanctioned
  // nil". Nobody approves a project for no money.
  const budget = decimal(item.sanctioned_budget);
  // Likewise zero spend: the register adds up recorded expense lines, and an
  // expense line for ₹0 does not exist. Zero is "no bill has been booked".
  const spent = decimal(item.spent_amount);
  // Area is length x breadth on the register, in the project's own unit; one
  // square metre is 10.7639 square feet, and the column is labelled sq ft.
  const area = decimal(item.area);
  const progress = decimal(item.progress_percent);

  return {
    id: String(item.id),
    code: item.code || null,
    name: item.name,
    location: item.location || null,
    manager: item.manager_name || null,
    // The register has no contractor column. Null is the truth, and the row
    // prints "contractor not recorded" rather than "not awarded" — the second
    // would claim a tender state nobody has entered anywhere.
    contractor: null,
    stage: civilStage(item.status),
    area_sqft:
      area === null
        ? null
        : item.dimension_unit === 'M'
          ? area * FEET_PER_METRE * FEET_PER_METRE
          : area,
    plot: civilPlot(item),
    money: {
      budget: budget !== null && budget > 0 ? budget : null,
      spent: spent !== null && spent > 0 ? spent : null,
    },
    /*
     * ZERO IS READ AS "NOBODY HAS CERTIFIED", NOT AS "NONE OF IT IS BUILT".
     *
     * The register carries the newest daily log that stated a percentage, and
     * falls back to zero when no log has ever stated one — so the list payload
     * cannot tell a project certified at 0% from a project nobody has written
     * up. Both arrive as "0.00".
     *
     * Of the two errors this forces, printing "not certified" over a genuine
     * 0% is the mild one: the row still says the job has not started, and the
     * tag is grey either way. The other direction is the dangerous one —
     * a project nobody has measured would be scored against the calendar and
     * reported as points behind, which is a judgement made from an absence.
     */
    progress_pct: progress !== null && progress > 0 ? progress : null,
    schedule: {
      start: item.start_date,
      end: item.expected_end_date,
      baseline_end: baselineEnd(revisions),
    },
    // The register's list payload carries no site note; the hold reason lives
    // on the detail. See the type.
    note: null,
  };
}
