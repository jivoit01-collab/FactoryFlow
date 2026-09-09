import { describe, expect, it } from 'vitest';

import { formatDay, formatWindow, planShortLabel } from '../constants/pm-requirement.constants';
import type { PmReqRow } from '../types';
import {
  csvFilename,
  familiesOf,
  filterByFamily,
  filterRows,
  formatSigned,
  isAtRisk,
  nextSort,
  rowStatus,
  searchRows,
  sortRows,
  toCsv,
  visibleTotals,
} from './pmRequirement';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
//
// The figures are the live September 2026 ones, and the first three rows are
// components whose Planning, Issue and On hand matched the packaging buyer's
// own spreadsheet exactly. Keeping the real numbers means these tests fail if
// the reading of the sheet ever drifts.

function row(overrides: Partial<PmReqRow> = {}): PmReqRow {
  return {
    item_code: 'PM0000000',
    item_name: 'ITEM',
    sub_group: 'CAPS',
    uom: 'PCS',
    unit_price: 1,
    planning_qty: 0,
    issued_pc_qty: 0,
    rest_planning_qty: 0,
    on_hand_qty: 0,
    req_qty: 0,
    open_po_qty: 0,
    req_after_po_qty: 0,
    issued_transfer_qty: 0,
    issued_produced_qty: 0,
    issued_other_qty: 0,
    short_qty: 0,
    short_value: 0,
    sku_count: 1,
    po_lines: 0,
    po_earliest_due: null,
    po_latest_due: null,
    over_issued: false,
    po_covers_shortage: false,
    po_due_after_plan: false,
    po_overdue: false,
    drivers: [],
    driver_count: 0,
    ...overrides,
  };
}

/** CAPS 1 LTR WHITE AND YELLOW SMALL PLAIN — short even after 70,000 on order. */
const SMALL_CAPS = row({
  item_code: 'PM0000235',
  item_name: 'CAPS 1 LTR WHITE AND YELLOW SMALL PLAIN',
  unit_price: 0.45,
  planning_qty: 1102500,
  issued_pc_qty: 155000,
  issued_transfer_qty: 155000,
  rest_planning_qty: 947500,
  on_hand_qty: 405000,
  req_qty: -542500,
  open_po_qty: 70000,
  req_after_po_qty: -472500,
  short_qty: 472500,
  short_value: 212625,
  po_lines: 2,
  po_earliest_due: '2026-09-15',
});

/** CAPS 5 LTR GREEN — stock covers what is left of the plan. */
const GREEN_CAPS = row({
  item_code: 'PM0000468',
  item_name: 'CAPS 5 LTR GREEN',
  unit_price: 2.1,
  planning_qty: 56867,
  issued_pc_qty: 13552,
  issued_transfer_qty: 13552,
  rest_planning_qty: 43315,
  on_hand_qty: 45583,
  req_qty: 2268,
  req_after_po_qty: 2268,
});

/** CAPS 5 LTR BROWN — short, but an open order closes it. */
const BROWN_CAPS = row({
  item_code: 'PM0000469',
  item_name: 'CAPS 5 LTR BROWN',
  unit_price: 2.1,
  planning_qty: 72000,
  issued_pc_qty: 10995,
  issued_transfer_qty: 10995,
  rest_planning_qty: 61005,
  on_hand_qty: 9741,
  req_qty: -51264,
  open_po_qty: 116164,
  req_after_po_qty: 64900,
  po_covers_shortage: true,
  po_lines: 4,
  po_earliest_due: '2026-09-12',
});

/** The same, with the order already past due — the live case on Oil. */
const BROWN_CAPS_LATE = row({
  ...BROWN_CAPS,
  po_overdue: true,
  po_earliest_due: '2026-08-20',
});

/** PET BOTTLE 1 LTR 40 GMS — blown in-house, well past the plan. */
const BOTTLE = row({
  item_code: 'PM0000194',
  item_name: 'PET BOTTLE 1 LTR 40 GMS',
  sub_group: 'PET BOTTLES',
  unit_price: 6.4,
  planning_qty: 150000,
  issued_pc_qty: 187085,
  issued_produced_qty: 187085,
  rest_planning_qty: -37085,
  on_hand_qty: 0,
  req_qty: 37085,
  req_after_po_qty: 37085,
  over_issued: true,
});

const ROWS = [SMALL_CAPS, GREEN_CAPS, BROWN_CAPS, BOTTLE];

// ---------------------------------------------------------------------------

describe('rowStatus', () => {
  it('calls a row still short after open orders short', () => {
    expect(rowStatus(SMALL_CAPS)).toBe('short');
  });

  it('calls a closed gap on order', () => {
    expect(rowStatus(BROWN_CAPS)).toBe('po-covered');
  });

  it('never reads a late order as a closed gap', () => {
    // The dominant case on the live book: every open packing-material line on
    // Oil was past due. "On order" would tell the buyer to stop looking.
    expect(rowStatus(BROWN_CAPS_LATE)).toBe('po-risk');
  });

  it('flags an order that lands after the plan closes', () => {
    expect(rowStatus(row({ ...BROWN_CAPS, po_due_after_plan: true }))).toBe('po-risk');
  });

  it('calls an over-issued row over-issued rather than covered', () => {
    expect(rowStatus(BOTTLE)).toBe('over-issued');
  });

  it('calls a plain covered row covered', () => {
    expect(rowStatus(GREEN_CAPS)).toBe('covered');
  });

  it('prefers short over every other label', () => {
    // Over-issued AND still short: the shortfall is what matters.
    const both = row({ over_issued: true, req_after_po_qty: -10, short_qty: 10 });
    expect(rowStatus(both)).toBe('short');
  });
});

describe('isAtRisk', () => {
  it('includes anything still short', () => {
    expect(isAtRisk(SMALL_CAPS)).toBe(true);
  });

  it('includes a shortage covered only by a late order', () => {
    expect(isAtRisk(BROWN_CAPS_LATE)).toBe(true);
  });

  it('excludes a shortage covered by an order due in time', () => {
    expect(isAtRisk(BROWN_CAPS)).toBe(false);
  });

  it('excludes an over-issued row, which needs nothing', () => {
    expect(isAtRisk(BOTTLE)).toBe(false);
  });
});

describe('filterRows', () => {
  it('short is the buying list', () => {
    expect(filterRows(ROWS, 'short').map((r) => r.item_code)).toEqual(['PM0000235']);
  });

  it('at risk adds shortages leaning on a late order', () => {
    const withLate = [SMALL_CAPS, BROWN_CAPS_LATE, GREEN_CAPS];
    expect(filterRows(withLate, 'at-risk').map((r) => r.item_code)).toEqual([
      'PM0000235',
      'PM0000469',
    ]);
  });

  it('over-issued finds the rows the floor overdrew', () => {
    expect(filterRows(ROWS, 'over-issued').map((r) => r.item_code)).toEqual(['PM0000194']);
  });

  it('surplus excludes over-issued rows so the two do not double up', () => {
    // The bottle is in surplus arithmetically, but it belongs under
    // over-issued: reporting it as comfortably covered hides the real fact.
    expect(filterRows(ROWS, 'surplus').map((r) => r.item_code)).toEqual([
      'PM0000468',
      'PM0000469',
    ]);
  });

  it('all keeps every component on the plan', () => {
    expect(filterRows(ROWS, 'all')).toHaveLength(4);
  });
});

describe('searchRows', () => {
  it('matches on item code', () => {
    expect(searchRows(ROWS, 'PM0000469').map((r) => r.item_code)).toEqual(['PM0000469']);
  });

  it('matches on description, case insensitively', () => {
    expect(searchRows(ROWS, 'green').map((r) => r.item_code)).toEqual(['PM0000468']);
  });

  it('narrows on every term rather than widening', () => {
    // "caps 5" must not also return the 1 LTR caps.
    expect(searchRows(ROWS, 'caps 5').map((r) => r.item_code)).toEqual([
      'PM0000468',
      'PM0000469',
    ]);
  });

  it('does not match a bare digit inside an item code', () => {
    // PM0000235 is CAPS 1 LTR, and its code contains a 5. Searching for the
    // 5 litre caps must not drag it in on a part-number coincidence.
    expect(searchRows(ROWS, '5 ltr').map((r) => r.item_code)).toEqual([
      'PM0000468',
      'PM0000469',
    ]);
  });

  it('still matches a code the buyer typed in full', () => {
    expect(searchRows(ROWS, 'pm0000235').map((r) => r.item_code)).toEqual(['PM0000235']);
  });

  it('matches on the packaging family too', () => {
    expect(searchRows(ROWS, 'pet bottles').map((r) => r.item_code)).toEqual(['PM0000194']);
  });

  it('an empty search is every row, not none', () => {
    expect(searchRows(ROWS, '   ')).toHaveLength(4);
  });
});

describe('families', () => {
  it('lists the families present, alphabetically', () => {
    expect(familiesOf(ROWS)).toEqual(['CAPS', 'PET BOTTLES']);
  });

  it('filters to one family', () => {
    expect(filterByFamily(ROWS, 'PET BOTTLES')).toHaveLength(1);
  });

  it('no family means all of them', () => {
    expect(filterByFamily(ROWS, '')).toHaveLength(4);
  });
});

describe('sortRows', () => {
  it('puts the costliest gap first by default', () => {
    const sorted = sortRows(ROWS, { key: 'short_value', dir: 'desc' });
    expect(sorted[0].item_code).toBe('PM0000235');
  });

  it('sorts a signed column so the worst shortage leads', () => {
    const sorted = sortRows(ROWS, { key: 'req_qty', dir: 'asc' });
    expect(sorted[0].item_code).toBe('PM0000235');
  });

  it('sorts text', () => {
    const sorted = sortRows(ROWS, { key: 'item_name', dir: 'asc' });
    expect(sorted[0].item_name).toBe('CAPS 1 LTR WHITE AND YELLOW SMALL PLAIN');
  });

  it('breaks ties on item code so the order is stable', () => {
    const tied = [
      row({ item_code: 'PM0000002', short_value: 5 }),
      row({ item_code: 'PM0000001', short_value: 5 }),
    ];
    expect(sortRows(tied, { key: 'short_value', dir: 'desc' }).map((r) => r.item_code)).toEqual([
      'PM0000001',
      'PM0000002',
    ]);
  });

  it('does not mutate the array it was given', () => {
    const original = [...ROWS];
    sortRows(ROWS, { key: 'item_code', dir: 'asc' });
    expect(ROWS).toEqual(original);
  });
});

describe('nextSort', () => {
  it('starts a number column descending — biggest problem first', () => {
    expect(nextSort({ key: 'item_code', dir: 'asc' }, 'req_qty')).toEqual({
      key: 'req_qty',
      dir: 'desc',
    });
  });

  it('starts a text column ascending — the list from A', () => {
    expect(nextSort({ key: 'req_qty', dir: 'desc' }, 'item_name')).toEqual({
      key: 'item_name',
      dir: 'asc',
    });
  });

  it('flips the direction when the same column is clicked again', () => {
    expect(nextSort({ key: 'req_qty', dir: 'desc' }, 'req_qty')).toEqual({
      key: 'req_qty',
      dir: 'asc',
    });
  });
});

describe('visibleTotals', () => {
  it('sums the columns of the rows on screen', () => {
    const totals = visibleTotals(ROWS);
    expect(totals.item_count).toBe(4);
    expect(totals.planning_qty).toBe(1381367);
    expect(totals.issued_pc_qty).toBe(366632);
    expect(totals.on_hand_qty).toBe(460324);
  });

  it('never lets a surplus cancel a shortage', () => {
    // 472,500 short and 2,268 + 37,085 spare. Summing the signed figure would
    // report the factory better off than it is.
    expect(visibleTotals(ROWS).short_qty).toBe(472500);
  });

  it('an empty view totals zero rather than NaN', () => {
    expect(visibleTotals([]).planning_qty).toBe(0);
    expect(visibleTotals([]).item_count).toBe(0);
  });
});

describe('formatSigned', () => {
  it('keeps the minus sign that says the row is short', () => {
    expect(formatSigned(-472500)).toContain('-');
  });

  it('never prints minus zero', () => {
    // A shortfall of -0.2 rounds to zero, and "-0" reads as a bug.
    expect(formatSigned(-0.2)).not.toBe('-0');
    expect(formatSigned(-0)).toBe('0');
  });

  it('rounds a whole-number-sized figure the way the buyer’s sheet does', () => {
    // The sheet shows this carton as 813 and works out Req from the 812.5.
    // Rounding the DISPLAY is why 1,876 on hand less 813 reads as 1,064.
    expect(formatSigned(812.5)).toBe('813');
  });

  it('keeps decimals on a sub-unit figure', () => {
    // 0.0625 cartons per bottle is a real BOM quantity, and rounding it to
    // zero would show a component the plan needs as needing nothing.
    expect(formatSigned(0.0625)).toBe('0.063');
  });
});

describe('toCsv', () => {
  it('writes the buyer’s own nine columns first, in their order', () => {
    const header = toCsv([SMALL_CAPS]).split('\r\n')[0];
    expect(header.startsWith('Item Code,Item Description,Planning,Issue (PC),Rest Planning,On hand,Req,PO,REQ after PO')).toBe(
      true,
    );
  });

  it('writes quantities unrounded so Excel totals agree with ours', () => {
    const line = toCsv([row({ item_code: 'PM1', planning_qty: 812.5 })]).split('\r\n')[1];
    expect(line).toContain('812.5');
  });

  it('keeps the sign on a shortfall', () => {
    const line = toCsv([SMALL_CAPS]).split('\r\n')[1];
    expect(line).toContain('-472500');
  });

  it('quotes a description containing a comma', () => {
    const line = toCsv([row({ item_name: 'CARTON 1 LTR, PLAIN' })]).split('\r\n')[1];
    expect(line).toContain('"CARTON 1 LTR, PLAIN"');
  });

  it('exports only the rows it was given', () => {
    expect(toCsv([SMALL_CAPS]).split('\r\n')).toHaveLength(2);
  });
});

describe('csvFilename', () => {
  it('names the plan and the day the figures came from', () => {
    expect(csvFilename('SEP PLANNING 26', '2026-09-09')).toBe(
      'pm-requirement-sep-planning-26-2026-09-09.csv',
    );
  });

  it('survives a plan with no code', () => {
    expect(csvFilename('', '2026-09-09')).toBe('pm-requirement-plan-2026-09-09.csv');
  });
});

describe('dates', () => {
  it('reads a bare date in UTC, not local time', () => {
    // The load-bearing property: a local-time reading east of UTC turns the
    // 1st into the 31st of the month before, which would misstate the period
    // the issue column covers. The month abbreviation itself is whatever ICU
    // gives for en-IN ("Sept" on some builds) and is not asserted.
    expect(formatDay('2026-09-01')).toMatch(/^1 Sep/);
  });

  it('spells out the window the issue column counted', () => {
    expect(formatWindow('2026-09-01', '2026-09-09')).toMatch(/^1 Sep.* – 9 Sep.* 2026$/);
  });

  it('collapses a one-day window', () => {
    expect(formatWindow('2026-09-01', '2026-09-01')).toMatch(/^1 Sep.* 2026$/);
  });

  it('shows a dash for a missing date rather than Invalid Date', () => {
    expect(formatDay(null)).toBe('—');
    expect(formatDay('not-a-date')).toBe('—');
  });

  it('labels a plan by its code, since every SAP name is identical', () => {
    expect(planShortLabel({ code: 'SEP PLANNING 26', name: 'OIL Monthly...' })).toBe(
      'SEP PLANNING 26',
    );
  });
});
