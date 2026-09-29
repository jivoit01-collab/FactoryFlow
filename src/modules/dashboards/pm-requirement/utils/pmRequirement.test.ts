import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SORT,
  formatDay,
  formatWindow,
  planShortLabel,
} from '../constants/pm-requirement.constants';
import type { PmReqResponse, PmReqRow } from '../types';
import {
  csvFilename,
  distinctUnits,
  familiesOf,
  filterByFamily,
  filterRows,
  formatQtyWithUom,
  formatSigned,
  formatSignedWithUom,
  nextSort,
  rowStatus,
  searchRows,
  sharedUnit,
  sortRows,
  toCsv,
  unitLabel,
  visibleTotals,
  withBenchmarkDefaults,
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
    benchmark_qty: 0,
    req_after_benchmark_qty: 0,
    short_after_benchmark_qty: 0,
    short_after_benchmark_value: 0,
    open_po_qty: 0,
    req_after_po_qty: 0,
    issued_transfer_qty: 0,
    issued_produced_qty: 0,
    issued_other_qty: 0,
    short_qty: 0,
    short_value: 0,
    to_buy_qty: 0,
    over_purchase_qty: 0,
    over_purchase_value: 0,
    over_purchased: false,
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
    po_details: [],
    ...overrides,
  };
}

/** CAPS 1 LTR WHITE AND YELLOW SMALL PLAIN — short for the plan, no benchmark set. */
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
  req_after_benchmark_qty: -542500,
  short_after_benchmark_qty: 542500,
  short_after_benchmark_value: 244125,
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
  req_after_benchmark_qty: 2268,
  req_after_po_qty: 2268,
});

/**
 * CAPS 5 LTR BROWN — short for the plan. It has 116,164 on order, which this
 * board no longer nets off: an order is not stock.
 */
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
  req_after_benchmark_qty: -51264,
  short_after_benchmark_qty: 51264,
  short_after_benchmark_value: 107654.4,
  open_po_qty: 116164,
  req_after_po_qty: 64900,
  po_covers_shortage: true,
  po_lines: 4,
  po_earliest_due: '2026-09-12',
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
  req_after_benchmark_qty: 37085,
  req_after_po_qty: 37085,
  over_issued: true,
});

// The benchmark cases, off the live 29 September 2026 read of SEP PLANNING 26.

/**
 * TIN 5 LTR POMACE OLIVE PRINTED — the plan is covered with 1,432 to spare,
 * but SAP's benchmark in BH-PM is 10,000, so making the plan leaves the
 * stores 8,568 under it.
 */
const TIN_5 = row({
  item_code: 'PM0000080',
  item_name: 'TIN 5 LTR POMACE OLIVE PRINTED',
  sub_group: 'TIN',
  unit_price: 76.5,
  planning_qty: 31000,
  issued_pc_qty: 21273,
  rest_planning_qty: 9727,
  on_hand_qty: 11159,
  req_qty: 1432,
  benchmark_qty: 10000,
  req_after_benchmark_qty: -8568,
  short_after_benchmark_qty: 8568,
  short_after_benchmark_value: 655452,
});

/** TIN 15 LTR — short for the plan, and 10,000 more once its benchmark counts. */
const TIN_15 = row({
  item_code: 'PM0000076',
  item_name: 'TIN 15 LTR',
  sub_group: 'TIN',
  unit_price: 93,
  planning_qty: 25140,
  issued_pc_qty: 3672,
  rest_planning_qty: 21468,
  on_hand_qty: 3760,
  req_qty: -17708,
  benchmark_qty: 10000,
  req_after_benchmark_qty: -27708,
  short_after_benchmark_qty: 27708,
  short_after_benchmark_value: 2576844,
});

const ROWS = [SMALL_CAPS, GREEN_CAPS, BROWN_CAPS, BOTTLE];

// ---------------------------------------------------------------------------

describe('rowStatus', () => {
  it('calls a row the stores cannot make the plan with short', () => {
    expect(rowStatus(SMALL_CAPS)).toBe('short');
    expect(rowStatus(TIN_15)).toBe('short');
  });

  it('calls a covered plan that leaves the stores under benchmark what it is', () => {
    expect(rowStatus(TIN_5)).toBe('benchmark');
  });

  it('ignores open orders — an order is not stock', () => {
    // 116,164 on order against 51,264 short: the old board said "On order".
    expect(rowStatus(BROWN_CAPS)).toBe('short');
  });

  it('calls an over-issued row over-issued rather than covered', () => {
    expect(rowStatus(BOTTLE)).toBe('over-issued');
  });

  it('calls a plain covered row covered', () => {
    expect(rowStatus(GREEN_CAPS)).toBe('covered');
  });

  it('prefers short over every other label', () => {
    // Over-issued AND still short: the shortfall is what matters.
    const both = row({ over_issued: true, req_qty: -10, req_after_benchmark_qty: -10 });
    expect(rowStatus(both)).toBe('short');
  });

  it('prefers under benchmark over over-issued', () => {
    const both = row({ over_issued: true, req_qty: 50, req_after_benchmark_qty: -10 });
    expect(rowStatus(both)).toBe('benchmark');
  });
});

describe('filterRows', () => {
  const WITH_BENCHMARK = [...ROWS, TIN_5, TIN_15];

  it('short is the buying list, benchmark included', () => {
    expect(filterRows(WITH_BENCHMARK, 'short').map((r) => r.item_code)).toEqual([
      'PM0000235',
      'PM0000469',
      'PM0000080',
      'PM0000076',
    ]);
  });

  it('short for the plan leaves out rows short only of the benchmark', () => {
    expect(filterRows(WITH_BENCHMARK, 'plan-short').map((r) => r.item_code)).toEqual([
      'PM0000235',
      'PM0000469',
      'PM0000076',
    ]);
  });

  it('under benchmark is the rows the plan is covered for', () => {
    // TIN 15 is under its benchmark too, but it is short for the plan first.
    expect(filterRows(WITH_BENCHMARK, 'benchmark').map((r) => r.item_code)).toEqual(['PM0000080']);
  });

  it('splits short exactly in two', () => {
    const short = filterRows(WITH_BENCHMARK, 'short').length;
    const plan = filterRows(WITH_BENCHMARK, 'plan-short').length;
    const benchmark = filterRows(WITH_BENCHMARK, 'benchmark').length;
    expect(plan + benchmark).toBe(short);
  });

  it('over-issued finds the rows the floor overdrew', () => {
    expect(filterRows(ROWS, 'over-issued').map((r) => r.item_code)).toEqual(['PM0000194']);
  });

  it('surplus excludes over-issued rows so the two do not double up', () => {
    // The bottle is in surplus arithmetically, but it belongs under
    // over-issued: reporting it as comfortably covered hides the real fact.
    expect(filterRows(WITH_BENCHMARK, 'surplus').map((r) => r.item_code)).toEqual(['PM0000468']);
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
    expect(searchRows(ROWS, 'caps 5').map((r) => r.item_code)).toEqual(['PM0000468', 'PM0000469']);
  });

  it('does not match a bare digit inside an item code', () => {
    // PM0000235 is CAPS 1 LTR, and its code contains a 5. Searching for the
    // 5 litre caps must not drag it in on a part-number coincidence.
    expect(searchRows(ROWS, '5 ltr').map((r) => r.item_code)).toEqual(['PM0000468', 'PM0000469']);
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
    // TIN 15 is fewer pieces short than the small caps and far more rupees.
    const sorted = sortRows([...ROWS, TIN_15], DEFAULT_SORT);
    expect(sorted[0].item_code).toBe('PM0000076');
  });

  it('sorts a signed column so the worst shortage leads', () => {
    const sorted = sortRows(ROWS, { key: 'req_after_benchmark_qty', dir: 'asc' });
    expect(sorted[0].item_code).toBe('PM0000235');
  });

  it('sorts text', () => {
    const sorted = sortRows(ROWS, { key: 'item_name', dir: 'asc' });
    expect(sorted[0].item_name).toBe('CAPS 1 LTR WHITE AND YELLOW SMALL PLAIN');
  });

  it('breaks ties on item code so the order is stable', () => {
    const tied = [
      row({ item_code: 'PM0000002', short_after_benchmark_value: 5 }),
      row({ item_code: 'PM0000001', short_after_benchmark_value: 5 }),
    ];
    expect(sortRows(tied, DEFAULT_SORT).map((r) => r.item_code)).toEqual([
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
    expect(nextSort({ key: 'item_code', dir: 'asc' }, 'benchmark_qty')).toEqual({
      key: 'benchmark_qty',
      dir: 'desc',
    });
  });

  it('starts a text column ascending — the list from A', () => {
    expect(nextSort({ key: 'benchmark_qty', dir: 'desc' }, 'item_name')).toEqual({
      key: 'item_name',
      dir: 'asc',
    });
  });

  it('flips the direction when the same column is clicked again', () => {
    expect(nextSort({ key: 'benchmark_qty', dir: 'desc' }, 'benchmark_qty')).toEqual({
      key: 'benchmark_qty',
      dir: 'asc',
    });
  });
});

describe('the footer shortfall', () => {
  // The cell under Req is the SHORTFALL of the rows on screen as well as the
  // column's sum, because the sum nets and the shortfall must not.
  const spare = row({ item_code: 'PM0000385', req_after_benchmark_qty: 84000 });

  const short = row({
    item_code: 'PM0000003',
    req_qty: -50,
    req_after_benchmark_qty: -50,
    short_after_benchmark_qty: 50,
    short_after_benchmark_value: 400,
  });

  it('is zero when every row on screen is covered', () => {
    const totals = visibleTotals([spare, spare]);
    expect(totals.short_qty).toBe(0);
    expect(totals.short_count).toBe(0);
  });

  it('counts the components the shortfall is spread across', () => {
    const totals = visibleTotals([spare, short, short]);
    expect(totals.short_qty).toBe(100);
    expect(totals.short_count).toBe(2);
    expect(totals.short_value).toBe(800);
  });

  it('keeps the shortfall as a magnitude beside the netted sum', () => {
    // Both figures on one row, and they disagree on purpose: the column nets
    // to a comfortable +83,950 while 50 cartons are still missing, and nobody
    // makes the plan on 84,000 spare labels.
    const totals = visibleTotals([spare, short]);
    expect(totals.req_qty).toBe(83950);
    expect(totals.short_qty).toBe(50);
  });

  it('sums to a negative when the shown set is short overall', () => {
    const totals = visibleTotals([short, short]);
    expect(totals.req_qty).toBe(-100);
    expect(totals.short_qty).toBe(100);
  });

  it('counts a row short of its benchmark alone as short', () => {
    const totals = visibleTotals([TIN_5]);
    expect(totals.short_count).toBe(1);
    expect(totals.short_qty).toBe(8568);
    expect(totals.benchmark_qty).toBe(10000);
  });
});

describe('units', () => {
  // The board is NOT all pieces, which is the whole reason these exist. Of
  // Oil's 881 packing-material items 851 are PCS; 13 are kilograms, 9 metres,
  // 7 "nos" and 1 grams. TAPE LOGO PRINTED is in METRES, is called for by 61
  // of the SKUs on the September 2026 plan, and has 2,03,902 of it on hand.
  it('prints SAP codes as the words people say', () => {
    expect(unitLabel('PCS')).toBe('pcs');
    expect(unitLabel('KGS')).toBe('kg');
    expect(unitLabel('MTR')).toBe('m');
    expect(unitLabel('NOS')).toBe('nos');
    expect(unitLabel('GMS')).toBe('g');
  });

  it('prints a unit it has never seen as it stands rather than inventing one', () => {
    expect(unitLabel('ROLL')).toBe('roll');
    expect(unitLabel('')).toBe('');
    expect(unitLabel(null)).toBe('');
    expect(unitLabel(undefined)).toBe('');
  });

  it('puts the unit after the figure', () => {
    expect(formatQtyWithUom(152600, 'PCS')).toBe('1,52,600 pcs');
    expect(formatQtyWithUom(203902, 'MTR')).toBe('2,03,902 m');
    expect(formatQtyWithUom(922, 'KGS')).toBe('922 kg');
  });

  it('keeps the minus sign that says a row is short', () => {
    expect(formatSignedWithUom(-34100, 'PCS')).toBe('-34,100 pcs');
  });

  it('prints no unit where SAP holds none, rather than a stray space', () => {
    expect(formatQtyWithUom(1000, '')).toBe('1,000');
  });

  it('finds the shared unit only when every row agrees', () => {
    const tape = row({ item_code: 'PM0000075', uom: 'MTR' });
    expect(sharedUnit([SMALL_CAPS, GREEN_CAPS])).toBe('pcs');
    expect(sharedUnit([SMALL_CAPS, tape])).toBeNull();
    expect(sharedUnit([])).toBeNull();
  });

  it('names the units it found, commonest first', () => {
    const tape = row({ item_code: 'PM0000075', uom: 'MTR' });
    expect(distinctUnits([SMALL_CAPS, GREEN_CAPS, tape])).toEqual(['pcs', 'm']);
  });

  it('refuses to total a column whose rows are in different units', () => {
    // The footer's cue. 2,03,902 metres of tape added to a count of caps is
    // not a rougher truth than the rows above it, it is not a quantity.
    const tape = row({ item_code: 'PM0000075', uom: 'MTR', on_hand_qty: 203902 });
    expect(visibleTotals([SMALL_CAPS, tape]).uom).toBeNull();
    expect(visibleTotals([SMALL_CAPS, GREEN_CAPS]).uom).toBe('pcs');
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
    // 542,500 + 51,264 short and 2,268 + 37,085 spare. Summing the signed
    // figure would report the factory better off than it is.
    expect(visibleTotals(ROWS).short_qty).toBe(593764);
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
  it('writes the buyer’s own columns first, in their order', () => {
    const header = toCsv([SMALL_CAPS]).split('\r\n')[0];
    expect(
      header.startsWith(
        'Item Code,Item Description,Planning,Issue (PC),Rest Planning,On hand,Benchmark,Req,',
      ),
    ).toBe(true);
  });

  it('drops the PO columns the board dropped', () => {
    const header = toCsv([SMALL_CAPS]).split('\r\n')[0];
    expect(header.split(',')).not.toContain('PO');
    expect(header).not.toContain('REQ after PO');
  });

  it('keeps the plan-only Req so the export checks against the old sheet', () => {
    const [header, line] = toCsv([TIN_5]).split('\r\n');
    expect(header).toContain('Req (plan only)');
    expect(line).toContain(',10000,-8568,');
    expect(line).toContain(',1432,');
  });

  it('writes quantities unrounded so Excel totals agree with ours', () => {
    const line = toCsv([row({ item_code: 'PM1', planning_qty: 812.5 })]).split('\r\n')[1];
    expect(line).toContain('812.5');
  });

  it('keeps the sign on a shortfall', () => {
    const line = toCsv([SMALL_CAPS]).split('\r\n')[1];
    expect(line).toContain('-542500');
  });

  it('quotes a description containing a comma', () => {
    const line = toCsv([row({ item_name: 'CARTON 1 LTR, PLAIN' })]).split('\r\n')[1];
    expect(line).toContain('"CARTON 1 LTR, PLAIN"');
  });

  it('exports only the rows it was given', () => {
    expect(toCsv([SMALL_CAPS]).split('\r\n')).toHaveLength(2);
  });
});

describe('withBenchmarkDefaults', () => {
  // A backend one release behind sends no benchmark fields at all.
  function response(rows: PmReqRow[], totals: Record<string, unknown>): PmReqResponse {
    return { data: rows, totals } as unknown as PmReqResponse;
  }

  const BENCHMARK_FIELDS = [
    'benchmark_qty',
    'req_after_benchmark_qty',
    'short_after_benchmark_qty',
    'short_after_benchmark_value',
  ];

  function stripBenchmark(r: PmReqRow): PmReqRow {
    return Object.fromEntries(
      Object.entries(r).filter(([key]) => !BENCHMARK_FIELDS.includes(key)),
    ) as unknown as PmReqRow;
  }

  it('reads an old backend as "no benchmark", Req being the plan alone', () => {
    const old = response([stripBenchmark(SMALL_CAPS), stripBenchmark(GREEN_CAPS)], {
      short_before_po_count: 1,
      short_before_po_qty: 542500,
    });
    const filled = withBenchmarkDefaults(old);
    expect(filled.data[0].benchmark_qty).toBe(0);
    expect(filled.data[0].req_after_benchmark_qty).toBe(-542500);
    expect(filled.data[0].short_after_benchmark_value).toBe(244125);
    expect(filled.data[1].short_after_benchmark_qty).toBe(0);
    expect(filled.totals.short_after_benchmark_count).toBe(1);
    expect(filled.totals.short_after_benchmark_value).toBe(244125);
    expect(filled.totals.short_before_po_value).toBe(244125);
    expect(filled.totals.benchmark_gap_count).toBe(0);
  });

  it('leaves a current backend’s figures alone', () => {
    const current = response([TIN_5], { short_after_benchmark_count: 1 });
    const filled = withBenchmarkDefaults(current);
    expect(filled.data[0]).toBe(TIN_5);
    expect(filled.totals).toBe(current.totals);
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
