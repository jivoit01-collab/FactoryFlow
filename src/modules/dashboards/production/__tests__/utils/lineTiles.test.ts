import { describe, expect, it } from 'vitest';

import type { LiveStatus, MachineBreakdown, ProductionSegment } from '@/modules/production/execution/types';
import type { RunMetrics } from '@/modules/production/execution/utils';

import { runTone } from '../../constants/production-wall.constants';
import type { ProductionRunRow } from '../../hooks/runRow';
import { indexLineConfigs } from '../../utils/lineStandards';
import { buildLineTiles } from '../../utils/lineTiles';

function metrics(overrides: Partial<RunMetrics> = {}): RunMetrics {
  return {
    producedCases: 0,
    isLive: false,
    runningMinutes: 0,
    breakdownMinutes: 0,
    ratedSpeed: 4_000,
    piecesPerCase: 20,
    ratedFrom: 'run',
    piecesFrom: 'run',
    actualSpeed: null,
    expectedCases: null,
    efficiencyPct: null,
    utilisationPct: null,
    targetCases: null,
    targetPct: null,
    rejectedCases: 0,
    reworkedCases: 0,
    isPartial: false,
    ...overrides,
  };
}

function row(
  lineId: number,
  liveStatus: LiveStatus,
  runNumber: number,
  overrides: Partial<ProductionRunRow> = {},
): ProductionRunRow {
  return {
    id: runNumber + lineId * 100,
    runNumber,
    line: `Line ${lineId}`,
    lineId,
    product: 'MUSTARD KACHI GHANI 1 LTR',
    itemCode: 'FG001',
    cases: 0,
    tone: runTone(liveStatus, liveStatus),
    liveStatus,
    metrics: metrics(),
    cost: null,
    segments: [],
    breakdowns: [],
    supervisor: 'R. Kumar',
    operators: '',
    labourCount: 8,
    otherManpowerCount: 0,
    plannedStartAt: null,
    plannedEndAt: null,
    detailLoading: false,
    ...overrides,
  };
}

/** One stoppage, shaped the way the register actually fills them in. */
const stop = (
  id: number,
  category: string,
  reason: string,
  minutes: number,
  unrecovered = false,
): MachineBreakdown =>
  ({
    id,
    breakdown_category_name: category,
    reason,
    breakdown_minutes: minutes,
    start_time: '2026-09-17T09:00:00Z',
    end_time: '2026-09-17T09:30:00Z',
    is_active: false,
    is_unrecovered: unrecovered,
  }) as MachineBreakdown;

const noConfigs = indexLineConfigs([]);
const build = (rows: ProductionRunRow[]) => buildLineTiles({ rows, configs: noConfigs });

describe('buildLineTiles', () => {
  it('makes one tile per line that ran, and none for anything else', () => {
    // Five lines carried a run; the board is five tiles.
    const board = build([1, 2, 3, 4, 5].map((lineId) => row(lineId, 'RUNNING', 1)));

    expect(board.tiles).toHaveLength(5);
    expect(board.lines).toBe(5);
    expect(board.tiles.map((tile) => tile.lineId).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('gives a line with three runs one tile, not three', () => {
    const board = build([
      row(1, 'COMPLETED', 1),
      row(1, 'COMPLETED', 2),
      row(1, 'RUNNING', 3),
    ]);

    expect(board.tiles).toHaveLength(1);
    expect(board.tiles[0].runs).toHaveLength(3);
  });

  it('shows no tile at all on a day nothing ran', () => {
    const board = build([]);

    expect(board.tiles).toHaveLength(0);
    expect(board.lines).toBe(0);
    expect(board.efficiencyPct).toBeNull();
  });

  it('a line with one run broken down and another running is a broken line', () => {
    const board = build([row(1, 'RUNNING', 2), row(1, 'BREAKDOWN', 1)]);

    const tile = board.tiles[0];
    expect(tile.state).toBe('BREAKDOWN');
    // The lead run is the worst-state one, so the card opens on the problem.
    expect(tile.lead.runNumber).toBe(1);
  });

  it('puts what needs attention first, whatever the line is called', () => {
    const board = build([
      row(3, 'COMPLETED', 1),
      row(2, 'BREAKDOWN', 1),
      row(1, 'RUNNING', 1),
    ]);

    expect(board.tiles.map((tile) => tile.state)).toEqual(['BREAKDOWN', 'RUNNING', 'COMPLETED']);
  });

  it('totals output, time and quality across a line’s runs', () => {
    const board = build([
      row(1, 'COMPLETED', 1, {
        metrics: metrics({
          producedCases: 300,
          runningMinutes: 120,
          breakdownMinutes: 30,
          rejectedCases: 5,
        }),
      }),
      row(1, 'RUNNING', 2, {
        metrics: metrics({
          producedCases: 200,
          runningMinutes: 60,
          isLive: true,
          rejectedCases: 7,
          reworkedCases: 2,
        }),
      }),
    ]);

    const tile = board.tiles[0];
    expect(tile.cases).toBe(500);
    expect(tile.runningMinutes).toBe(180);
    expect(tile.breakdownMinutes).toBe(30);
    expect(tile.utilisationPct).toBe(85.7);
    expect(tile.rejectedCases).toBe(12);
    expect(tile.reworkedCases).toBe(2);
    expect(tile.isLive).toBe(true);
  });

  it('splits the line’s day into running, idle and breakdown', () => {
    const now = new Date('2026-09-17T18:00:00Z').getTime();
    const segment = (start: string, end: string): ProductionSegment => ({
      id: Math.random(),
      start_time: start,
      end_time: end,
      produced_cases: '100',
      is_active: false,
      is_manual: false,
      duration_minutes: 0,
      remarks: '',
      created_at: start,
      updated_at: end,
    });

    // On the line 08:00–14:00 (360 min), producing for 120 of them.
    const board = buildLineTiles({
      rows: [
        row(1, 'COMPLETED', 1, {
          segments: [
            segment('2026-09-17T08:00:00Z', '2026-09-17T09:00:00Z'),
            segment('2026-09-17T13:00:00Z', '2026-09-17T14:00:00Z'),
          ],
          metrics: metrics({ runningMinutes: 120, breakdownMinutes: 30 }),
        }),
      ],
      configs: noConfigs,
      now,
    });

    const tile = board.tiles[0];
    expect(tile.spanMinutes).toBe(360);
    expect(tile.runningMinutes).toBe(120);
    expect(tile.breakdownMinutes).toBe(30);
    expect(tile.idleMinutes).toBe(210);
    // Utilisation is running over the WHOLE window, not over running plus
    // breakdown — measured that way this line would read as 80% utilised
    // while it sat idle for three and a half hours.
    expect(tile.utilisationPct).toBe(33.3);
  });

  it('never reports negative idle when a clock ran backwards', () => {
    const board = build([
      row(1, 'COMPLETED', 1, {
        segments: [],
        metrics: metrics({ runningMinutes: 480, breakdownMinutes: 60 }),
      }),
    ]);

    expect(board.tiles[0].idleMinutes).toBe(0);
    expect(board.tiles[0].spanMinutes).toBe(540);
  });

  it('works capacity off the hours the line actually ran, not a standard day', () => {
    const board = buildLineTiles({
      rows: [
        row(1, 'COMPLETED', 1, {
          metrics: metrics({ producedCases: 894, expectedCases: 656, runningMinutes: 483 }),
        }),
      ],
      configs: noConfigs,
    });

    const tile = board.tiles[0];
    expect(tile.capacityCases).toBe(656);
    expect(board.capacityCases).toBe(656);
    // 894 made against 656 rated in the 8h 3m it ran.
    expect(board.capacityPct).toBe(136.3);
    expect(board.capacityMinutes).toBe(483);
  });

  it('refuses a capacity rather than guessing one for an unrated line', () => {
    const board = build([row(1, 'RUNNING', 1, { metrics: metrics({ expectedCases: null }) })]);

    expect(board.tiles[0].capacityCases).toBeNull();
    expect(board.capacityCases).toBeNull();
    expect(board.capacityMinutes).toBeNull();
  });

  it('withholds the plant total when one line that ran has no rating', () => {
    // A total missing a line would read as capacity the plant has not got.
    const board = build([
      row(1, 'COMPLETED', 1, { metrics: metrics({ expectedCases: 400, runningMinutes: 120 }) }),
      row(2, 'COMPLETED', 1, { metrics: metrics({ expectedCases: null }) }),
    ]);

    expect(board.capacityCases).toBeNull();
  });

  it('measures efficiency only over the runs that carry a rating', () => {
    const board = build([
      // Rated: 360 made against 400 expected.
      row(1, 'COMPLETED', 1, {
        metrics: metrics({ producedCases: 360, expectedCases: 400, runningMinutes: 120 }),
      }),
      // Unrated: its 500 cases must not be credited against the 400 above,
      // which would report the line at 215%.
      row(1, 'COMPLETED', 2, {
        metrics: metrics({ producedCases: 500, expectedCases: null, runningMinutes: 60 }),
      }),
    ]);

    const tile = board.tiles[0];
    expect(tile.cases).toBe(860);
    expect(tile.expectedCases).toBe(400);
    expect(tile.efficiencyPct).toBe(90);
    expect(tile.ratedRuns).toBe(1);
  });

  it('withholds the line’s speed when one run has no pack size to convert', () => {
    const board = build([
      row(1, 'COMPLETED', 1, {
        metrics: metrics({ producedCases: 300, piecesPerCase: 20, runningMinutes: 120 }),
      }),
      row(1, 'COMPLETED', 2, {
        metrics: metrics({ producedCases: 100, piecesPerCase: null, runningMinutes: 60 }),
      }),
    ]);

    expect(board.tiles[0].actualSpeed).toBeNull();
  });

  it('works the line’s bottles/hr out across its runs', () => {
    const board = build([
      row(1, 'COMPLETED', 1, {
        metrics: metrics({ producedCases: 300, piecesPerCase: 20, runningMinutes: 120 }),
      }),
      row(1, 'COMPLETED', 2, {
        metrics: metrics({ producedCases: 100, piecesPerCase: 10, runningMinutes: 60 }),
      }),
    ]);

    // (300x20 + 100x10) bottles over 3 h.
    expect(board.tiles[0].actualSpeed).toBe(2_333);
  });

  it('weights the plant’s efficiency by expectation, not by tile', () => {
    const board = build([
      // A line that ran all shift at 90%.
      row(1, 'COMPLETED', 1, {
        metrics: metrics({ producedCases: 900, expectedCases: 1_000, runningMinutes: 480 }),
      }),
      // A line that ran ten minutes at 50% — it must not drag the plant to 70%.
      row(2, 'COMPLETED', 1, {
        metrics: metrics({ producedCases: 10, expectedCases: 20, runningMinutes: 10 }),
      }),
    ]);

    expect(board.efficiencyPct).toBe(89.2);
  });

  it('counts the day’s lines by state', () => {
    const board = build([
      row(1, 'RUNNING', 1),
      row(2, 'STOPPED', 1),
      row(3, 'BREAKDOWN', 1),
      row(4, 'COMPLETED', 1),
    ]);

    expect(board.lines).toBe(4);
    expect(board.running).toBe(1);
    expect(board.down).toBe(2);
    expect(board.finished).toBe(1);
  });

  it('takes the line’s start from its earliest segment, across runs', () => {
    const segment = (start: string): ProductionSegment => ({
      id: 1,
      start_time: start,
      end_time: null,
      produced_cases: '0',
      is_active: true,
      is_manual: false,
      duration_minutes: 0,
      remarks: '',
      created_at: start,
      updated_at: start,
    });

    const board = build([
      row(1, 'RUNNING', 2, { segments: [segment('2026-09-17T12:00:00Z')] }),
      row(1, 'COMPLETED', 1, { segments: [segment('2026-09-17T06:30:00Z')] }),
    ]);

    expect(board.tiles[0].startedAt).toBe('2026-09-17T06:30:00Z');
  });

  it('groups stoppages by the typed reason, not by the coarse category', () => {
    // Live shape: every stoppage carries a category, but only five values
    // exist across all 224 of them — the reason is what says anything.
    const board = build([
      row(1, 'COMPLETED', 1, {
        breakdowns: [
          stop(1, 'Machine', 'DOWNSTREAM', 18),
          stop(2, 'Other', 'powercut', 21),
          stop(3, 'Machine', 'DOWNSTREAM', 6),
        ],
      }),
    ]);

    expect(board.tiles[0].stoppages.map((s) => [s.label, s.minutes, s.count])).toEqual([
      ['DOWNSTREAM', 24, 2],
      ['powercut', 21, 1],
    ]);
  });

  it('treats one reason typed two ways as one problem', () => {
    const board = build([
      row(1, 'COMPLETED', 1, {
        breakdowns: [stop(1, 'Other', 'powercut', 20), stop(2, 'Other', ' POWERCUT ', 10)],
      }),
    ]);

    const [only] = board.tiles[0].stoppages;
    expect(board.tiles[0].stoppages).toHaveLength(1);
    // The spelling the floor typed first is the one shown.
    expect(only.label).toBe('powercut');
    expect(only.minutes).toBe(30);
  });

  it('drops the category where one reason was filed under two of them', () => {
    const board = build([
      row(1, 'COMPLETED', 1, {
        breakdowns: [stop(1, 'Machine', 'DOWNSTREAM', 10), stop(2, 'Other', 'DOWNSTREAM', 10)],
      }),
    ]);

    expect(board.tiles[0].stoppages[0].category).toBe('');
  });

  it('falls back to the category when nobody typed a reason', () => {
    const board = build([
      row(1, 'COMPLETED', 1, { breakdowns: [stop(1, 'PM Short', '', 47)] }),
    ]);

    expect(board.tiles[0].stoppages[0].label).toBe('PM Short');
  });

  it('rolls the whole plant’s stoppages up, naming every line a cause stopped', () => {
    const board = build([
      row(1, 'COMPLETED', 1, { breakdowns: [stop(1, 'Other', 'powercut', 21)] }),
      row(2, 'COMPLETED', 1, { breakdowns: [stop(2, 'Other', 'powercut', 24)] }),
      row(2, 'COMPLETED', 2, { breakdowns: [stop(3, 'PM Short', 'HDPE', 47, true)] }),
    ]);

    expect(board.stoppageCount).toBe(3);
    // Worst first, and the cause that stopped two lines is one row carrying
    // both rather than two rows the reader has to add up.
    expect(board.stoppages.map((s) => s.label)).toEqual(['HDPE', 'powercut']);

    const powercut = board.stoppages.find((s) => s.label === 'powercut')!;
    expect(powercut.minutes).toBe(45);
    expect(powercut.count).toBe(2);
    expect(powercut.lines).toEqual(['Line 1', 'Line 2']);
  });

  it('counts the minutes nobody made up apart from the rest', () => {
    const board = build([
      row(1, 'COMPLETED', 1, {
        breakdowns: [stop(1, 'PM Short', 'HDPE', 47, true), stop(2, 'Other', 'capstuck', 13)],
      }),
    ]);

    expect(board.unrecoveredMinutes).toBe(47);
    expect(board.stoppages.find((s) => s.label === 'HDPE')?.unrecovered).toBe(true);
    expect(board.stoppages.find((s) => s.label === 'capstuck')?.unrecovered).toBe(false);
  });

  it('surfaces the stoppage still open on the line', () => {
    const open = {
      id: 5,
      is_active: true,
      end_time: null,
      breakdown_category_name: 'Capping',
      start_time: '2026-09-17T11:00:00Z',
      reason: 'Head jam',
    } as MachineBreakdown;

    const board = build([row(1, 'BREAKDOWN', 1, { breakdowns: [open] })]);

    expect(board.tiles[0].openBreakdown?.id).toBe(5);
  });
});
