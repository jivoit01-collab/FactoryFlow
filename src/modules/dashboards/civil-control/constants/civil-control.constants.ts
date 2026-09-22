/**
 * The civil board's tunables, the rights that open it, and — for as long as it
 * has no feed — the rows it draws.
 */

import { BOARD_FEED_PERMISSIONS, DASHBOARDS_PERMISSIONS } from '@/config/permissions';

import type { CivilProject, CivilStage } from '../types';

/**
 * Rights that open the board.
 *
 * It mints none of its own, matching every other board here: a new right would
 * have to be created as a row on the live database and added to each group
 * before anybody could open the page, and this board shows nothing today that
 * a budget-approvals reader cannot already see — capex sanctioned against capex
 * spent is exactly what that screen is for.
 *
 * WHEN THE CIVIL REGISTER IS WIRED UP, REVISIT THIS. The feed will carry
 * contractor names and certified progress, which budget approvals does not, and
 * at that point the board should be gated on its own
 * `control_boards.can_read_civil_feed` OR these two — the same OR every other
 * board makes, so nobody who can read it today loses it.
 *
 * These must ALSO be present on the parent `/dashboards` navigation entry, or
 * the whole Dashboards menu hides from a user who holds only one of them.
 */
export const CIVIL_BOARD_VIEW_PERMISSIONS: readonly string[] = [
  BOARD_FEED_PERMISSIONS.BUDGET_APPROVALS,
  DASHBOARDS_PERMISSIONS.VIEW_BUDGET_APPROVALS,
];

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

/** The stage word, as the site office says it. */
export const CIVIL_STAGE_LABEL: Record<CivilStage, string> = {
  planning: 'Planning',
  foundation: 'Foundation',
  structure: 'Structure',
  roofing: 'Roofing',
  finishing: 'Finishing',
  handover: 'Handover',
  'on-hold': 'On hold',
};

/**
 * THESE ROWS ARE A WORKED EXAMPLE. THEY ARE NOT THE REGISTER.
 *
 * There is no civil feed yet — the board was asked for before the data existed,
 * so that the columns could be argued about against something real-looking
 * rather than against a description. Every figure below was invented for that
 * purpose. The first row is the one that was on the whiteboard this screen came
 * from; the other three exist to exercise the states the first cannot:
 *
 *   New Warehouse       — the whiteboard's own row, and well behind its calendar.
 *   Tank Farm Extension — nearly done, and slightly behind.
 *   Staff Quarters B    — sanctioned, nothing billed yet. `spent` is null, and
 *                         the board must draw that as a rule, not as ₹0.
 *   ETP Upgrade         — on hold with no drawing and no certified progress.
 *                         Three nulls in one row, which is the state a real
 *                         register produces most often and a demo never does.
 *
 * The page marks every one of them `sample` in the header and on the row. A
 * capex figure a manager cannot tell from a real one is the single failure this
 * board must not have, which is why the flag is not a comment — it is rendered.
 *
 * DELETE THIS CONSTANT the day `useCivilBoard` returns rows. Leaving it as a
 * fallback would mean an outage quietly restores four fictional projects to a
 * screen people have started trusting.
 */
export const CIVIL_SAMPLE_PROJECTS: CivilProject[] = [
  {
    id: 'sample-warehouse',
    name: 'New Warehouse',
    location: 'North yard, beyond the weighbridge',
    contractor: 'Not awarded',
    stage: 'structure',
    area_sqft: 40_500,
    plot: { length_ft: 300, width_ft: 135 },
    money: { budget: 35_000_000, spent: 15_000_000 },
    progress_pct: 38,
    schedule: { start: '2026-04-01', end: '2027-02-28', baseline_end: '2026-12-31' },
    note: 'Steel delivery slipped twice; roofing cannot start before the frame is signed off.',
  },
  {
    id: 'sample-tank-farm',
    name: 'Tank Farm Extension',
    location: 'Beside the existing farm',
    contractor: 'Not awarded',
    stage: 'finishing',
    area_sqft: 6_500,
    plot: { length_ft: 130, width_ft: 50 },
    money: { budget: 12_000_000, spent: 9_500_000 },
    progress_pct: 78,
    schedule: { start: '2026-01-12', end: '2026-10-31', baseline_end: '2026-10-31' },
    note: null,
  },
  {
    id: 'sample-quarters',
    name: 'Staff Quarters Block B',
    location: 'Residential side',
    contractor: null,
    stage: 'foundation',
    area_sqft: 18_000,
    plot: { length_ft: 150, width_ft: 120 },
    // Sanctioned, nothing certified yet. Null, never 0 — see the type.
    money: { budget: 21_000_000, spent: null },
    progress_pct: 14,
    schedule: { start: '2026-08-15', end: '2027-06-30', baseline_end: '2027-06-30' },
    note: null,
  },
  {
    id: 'sample-etp',
    name: 'ETP Upgrade',
    location: 'Effluent block',
    contractor: null,
    stage: 'on-hold',
    // No approved drawing, so no area and no plot — and nobody has certified
    // progress on work that is not moving.
    area_sqft: null,
    plot: null,
    money: { budget: 8_500_000, spent: 1_200_000 },
    progress_pct: null,
    schedule: { start: '2026-05-05', end: '2026-11-30', baseline_end: '2026-09-30' },
    note: 'Held pending the revised consent to operate.',
  },
];
