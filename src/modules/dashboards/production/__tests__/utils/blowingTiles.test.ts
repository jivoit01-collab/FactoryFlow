import { describe, expect, it } from 'vitest';

import type {
  BlowingBreakdown,
  BlowingRun,
  BlowingRunCost,
  BlowingRunDetail,
  BlowingSegment,
  PreformSpec,
} from '@/modules/production/blowing/types';

import { buildBlowingTiles, standardsOf, toBlowingRow } from '../../utils/blowingTiles';

const NOW = new Date('2026-09-17T20:00:00Z').getTime();

function run(overrides: Partial<BlowingRun> = {}): BlowingRun {
  return {
    id: 1,
    run_number: 2,
    date: '2026-09-17',
    machine: 3,
    machine_name: 'Synergy 1/4',
    preform_spec: 9,
    preform_make: 'Frystal',
    preform_gram: '40.00',
    preform_boxes_used: '0',
    preform_used_g: '0',
    total_units: '800',
    total_counter_production: 25_867,
    rejection_pcs: 70,
    rejection_pct: '0.27',
    total_manpower: 6,
    status: 'COMPLETED',
    live_status: 'COMPLETED',
    warehouse_approval_status: 'NOT_REQUESTED',
    net_cost: '120000',
    per_bottle_cost: '4.64',
    created_at: '2026-09-17T03:00:00Z',
    ...overrides,
  } as BlowingRun;
}

function segment(start: string, end: string | null, pcs = '0'): BlowingSegment {
  return {
    id: Math.random(),
    start_time: start,
    end_time: end,
    produced_pcs: pcs,
    is_active: end == null,
    duration_minutes: 0,
    remarks: '',
    created_at: start,
    updated_at: start,
  };
}

function breakdown(
  category: string,
  reason: string,
  minutes: number,
  unrecovered = false,
): BlowingBreakdown {
  return {
    id: Math.random(),
    machine: 3,
    machine_name: 'Synergy 1/4',
    breakdown_category: 1,
    breakdown_category_name: category,
    start_time: '2026-09-17T10:00:00Z',
    end_time: '2026-09-17T10:30:00Z',
    breakdown_minutes: minutes,
    is_active: false,
    is_unrecovered: unrecovered,
    reason,
    remarks: '',
    created_at: '2026-09-17T10:00:00Z',
    updated_at: '2026-09-17T10:30:00Z',
  };
}

function detail(
  segments: BlowingSegment[],
  breakdowns: BlowingBreakdown[] = [],
  extra: Partial<BlowingRunDetail> = {},
): BlowingRunDetail {
  return {
    ...run(),
    total_running_minutes: 0,
    total_breakdown_time: 0,
    segments,
    breakdowns,
    machine_start_reading: null,
    machine_stop_reading: null,
    machine_units: '0',
    utility_units: '0',
    utility_cost: '0',
    operator_count: 2,
    contract_labour_count: 3,
    own_labour_count: 1,
    scrap_carton_value: '0',
    remarks: '',
    rate_config: null,
    operator_rate_per_day: '0',
    labour_rate_per_day: '0',
    electricity_rate_per_unit: '0',
    preform_rate_per_bottle: '6.3',
    scrap_rate_per_bottle: '0',
    packing_rate_per_bottle: '0',
    sap_preform_item_code: '',
    sap_bottle_item_code: '',
    cost: null,
    cost_lines: [],
    updated_at: '2026-09-17T20:00:00Z',
    ...extra,
  } as BlowingRunDetail;
}

function spec(overrides: Partial<PreformSpec> = {}): PreformSpec {
  return {
    id: 9,
    make: 'Frystal',
    gram: '40.00',
    preforms_per_box: 100,
    preform_rate_per_bottle: '6.3',
    sap_item_code: '',
    sap_item_name: '',
    bottle_weight_g: null,
    bottles_per_kg: null,
    mould_cost: null,
    mould_life_bottles: null,
    std_make_cost_per_bottle: null,
    std_reject_pct: null,
    std_units_per_bottle: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const cost = (perBottle: string, net = '120000'): BlowingRunCost =>
  ({ blowing_cost_per_bottle: perBottle, net_cost: net }) as BlowingRunCost;

const row = (
  overrides: Partial<BlowingRun> = {},
  runDetail?: BlowingRunDetail,
  runCost?: BlowingRunCost,
) =>
  toBlowingRow({
    run: run(overrides),
    detail: runDetail,
    cost: runCost,
    now: NOW,
    detailLoading: false,
  });

const specs = (...entries: PreformSpec[]) => new Map(entries.map((s) => [s.id, s]));

describe('toBlowingRow', () => {
  it('reads the machine counter, which is the only output a blowing run has', () => {
    const built = row();

    expect(built.bottles).toBe(25_867);
    expect(built.rejects).toBe(70);
    expect(built.preform).toBe('Frystal 40g');
  });

  it('measures an open spell up to now, so a running machine is never read as dead', () => {
    const built = row({ live_status: 'RUNNING' }, detail([segment('2026-09-17T18:00:00Z', null)]));

    expect(built.runningMinutes).toBe(120);
    expect(built.isLive).toBe(true);
  });

  it('grades the conversion cost, not the cost with the preform in it', () => {
    // The preform is bought in and says nothing about how the machine ran.
    const built = row({}, undefined, cost('0.62', '120000'));

    expect(built.costPerBottle).toBe(0.62);
    expect(built.netCost).toBe(120_000);
  });
});

describe('buildBlowingTiles', () => {
  it('makes one tile per machine that ran', () => {
    const board = buildBlowingTiles({
      rows: [row(), row({ id: 2, machine: 4, machine_name: 'Sidel synergy 1/4' })],
      specs: specs(spec()),
      now: NOW,
    });

    expect(board.tiles).toHaveLength(2);
    expect(board.machines).toBe(2);
  });

  it('measures yield off the counter, needing no configuration at all', () => {
    const board = buildBlowingTiles({ rows: [row()], specs: specs(spec()), now: NOW });

    const tile = board.tiles[0];
    expect(tile.bottles).toBe(25_867);
    expect(tile.rejectPct).toBe(0.27);
    expect(tile.yieldPct).toBe(99.73);
  });

  it('states the speed it achieved — there is no rating in the model to score it', () => {
    const board = buildBlowingTiles({
      rows: [
        row(
          {},
          detail([segment('2026-09-17T08:00:00Z', '2026-09-17T18:38:00Z')]),
        ),
      ],
      specs: specs(spec()),
      now: NOW,
    });

    // 25,867 bottles over 638 minutes.
    expect(board.tiles[0].speed).toBe(2_433);
  });

  it('carries the preform’s targets where they are set, and says how many are not', () => {
    const board = buildBlowingTiles({
      rows: [row()],
      specs: specs(spec({ std_make_cost_per_bottle: '0.50' })),
      now: NOW,
    });

    const tile = board.tiles[0];
    expect(tile.standards.costPerBottle).toBe(0.5);
    expect(tile.standards.rejectPct).toBeNull();
    expect(tile.standards.unitsPerBottle).toBeNull();
    expect(tile.standardsSet).toBe(1);
  });

  it('weights a machine’s per-bottle cost by bottles, not by run', () => {
    const board = buildBlowingTiles({
      rows: [
        row({ id: 1, run_number: 1, total_counter_production: 25_000 }, undefined, cost('0.50')),
        row({ id: 2, run_number: 2, total_counter_production: 1_000 }, undefined, cost('2.00')),
      ],
      specs: specs(spec()),
      now: NOW,
    });

    // A 1,000-bottle run must not drag the average the way a straight mean would.
    expect(board.tiles[0].costPerBottle).toBeCloseTo(0.5577, 3);
  });

  it('splits the machine’s day into running, idle and breakdown', () => {
    const board = buildBlowingTiles({
      rows: [
        row(
          {},
          detail(
            [
              segment('2026-09-17T08:00:00Z', '2026-09-17T09:00:00Z'),
              segment('2026-09-17T13:00:00Z', '2026-09-17T14:00:00Z'),
            ],
            [breakdown('Machine', 'mould change', 30)],
          ),
        ),
      ],
      specs: specs(spec()),
      now: NOW,
    });

    const tile = board.tiles[0];
    expect(tile.spanMinutes).toBe(360);
    expect(tile.runningMinutes).toBe(120);
    expect(tile.breakdownMinutes).toBe(30);
    expect(tile.idleMinutes).toBe(210);
  });

  it('groups the machine’s stoppages by reason, like the filling lines', () => {
    const board = buildBlowingTiles({
      rows: [
        row(
          {},
          detail(
            [],
            [
              breakdown('Machine', 'mould change', 30),
              breakdown('Other', 'powercut', 20, true),
              breakdown('Machine', 'MOULD CHANGE', 10),
            ],
          ),
        ),
      ],
      specs: specs(spec()),
      now: NOW,
    });

    const tile = board.tiles[0];
    expect(tile.stoppageCount).toBe(3);
    expect(tile.stoppages.map((s) => [s.label, s.minutes, s.count])).toEqual([
      ['mould change', 40, 2],
      ['powercut', 20, 1],
    ]);
    expect(board.unrecoveredMinutes).toBe(20);
  });

  it('shows nothing at all on a day no machine ran', () => {
    const board = buildBlowingTiles({ rows: [], specs: specs(spec()), now: NOW });

    expect(board.tiles).toHaveLength(0);
    expect(board.yieldPct).toBeNull();
  });
});

describe('standardsOf', () => {
  it('reads all three targets as null where the spec carries none', () => {
    expect(standardsOf(spec())).toEqual({
      rejectPct: null,
      costPerBottle: null,
      unitsPerBottle: null,
    });
  });

  it('is all nulls for a preform nobody has configured', () => {
    expect(standardsOf(undefined).costPerBottle).toBeNull();
  });
});
