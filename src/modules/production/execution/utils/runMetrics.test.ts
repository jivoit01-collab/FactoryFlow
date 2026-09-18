import { describe, expect, it } from 'vitest';

import type {
  MachineBreakdown,
  ProductionRun,
  ProductionRunDetail,
  ProductionSegment,
} from '../types';
import { runMetrics } from './runMetrics';

const NOW = new Date('2026-09-17T14:00:00Z').getTime();
const at = (minutesBefore: number) => new Date(NOW - minutesBefore * 60_000).toISOString();

function run(overrides: Partial<ProductionRun> = {}): ProductionRun {
  return {
    id: 1,
    sap_doc_entry: null,
    run_number: 2,
    date: '2026-09-17',
    line: 3,
    line_name: 'JP Machine',
    line_config: null,
    line_config_name: '',
    product: 'MUSTARD KACHI GHANI 1 LTR 20 PCS',
    item_code: 'FG001',
    required_qty: '1000',
    rated_speed: '4000',
    pieces_per_case: 20,
    total_production: '0',
    total_running_minutes: 0,
    total_breakdown_time: 0,
    rejected_qty: '0',
    reworked_qty: '0',
    warehouse_approval_status: 'PENDING',
    status: 'IN_PROGRESS',
    live_status: 'RUNNING',
    created_by: null,
    created_at: at(300),
    litres_per_piece: '1',
    planned_start_at: null,
    planned_end_at: null,
    planned_end_is_manual: false,
    planning_remark: '',
    labour_count: 8,
    other_manpower_count: 2,
    supervisor: 'R. Kumar',
    operators: 'Two',
    ...overrides,
  } as ProductionRun;
}

function segment(overrides: Partial<ProductionSegment>): ProductionSegment {
  return {
    id: 1,
    start_time: at(120),
    end_time: at(60),
    produced_cases: '0',
    is_active: false,
    is_manual: false,
    duration_minutes: 60,
    remarks: '',
    created_at: at(120),
    updated_at: at(60),
    ...overrides,
  };
}

function breakdown(overrides: Partial<MachineBreakdown>): MachineBreakdown {
  return {
    id: 1,
    production_run: 1,
    machine: null,
    breakdown_category: null,
    breakdown_category_name: 'Capping',
    start_time: at(60),
    end_time: at(30),
    breakdown_minutes: 30,
    is_unrecovered: false,
    is_active: false,
    is_manual: false,
    maintenance_work_order_id: null,
    maintenance_work_order_no: '',
    maintenance_work_order_status: '',
    maintenance_asset_id: null,
    maintenance_asset_code: '',
    maintenance_asset_name: '',
    reason: '',
    remarks: '',
    created_at: at(60),
    updated_at: at(30),
    ...overrides,
  } as MachineBreakdown;
}

function detail(
  segments: ProductionSegment[],
  breakdowns: MachineBreakdown[] = [],
): ProductionRunDetail {
  return { ...run(), machine_ids: [], updated_at: at(1), segments, breakdowns };
}

describe('runMetrics', () => {
  it('reads live segments while the run is open — the closing figure is still 0', () => {
    const metrics = runMetrics(
      run({ status: 'IN_PROGRESS', total_production: '0' }),
      detail([segment({ start_time: at(120), end_time: null, is_active: true, produced_cases: '500' })]),
      NOW,
    );

    expect(metrics.producedCases).toBe(500);
    expect(metrics.basis).toBe('segments');
  });

  it('measures an open segment up to now, so a running line is never read as dead', () => {
    // Two hours in, nothing closed: the run's own totals still say zero.
    const metrics = runMetrics(
      run(),
      detail([segment({ start_time: at(120), end_time: null, is_active: true, produced_cases: '500' })]),
      NOW,
    );

    expect(metrics.runningMinutes).toBe(120);
    expect(metrics.producedCases).toBe(500);
    expect(metrics.isLive).toBe(true);
  });

  it('works the rated speed back into cases before comparing it with output', () => {
    // 4,000 bottles/hr at 20 to a case = 200 cases/hr; two hours = 400 expected.
    const metrics = runMetrics(
      run(),
      detail([segment({ start_time: at(120), end_time: at(0), produced_cases: '360' })]),
      NOW,
    );

    expect(metrics.expectedCases).toBe(400);
    expect(metrics.efficiencyPct).toBe(90);
    // 360 cases x 20 bottles over 2 h.
    expect(metrics.actualSpeed).toBe(3_600);
  });

  it('refuses a speed and an efficiency when SAP holds no bottles-per-case', () => {
    // Computed against an assumed 1, this run would read as 5% efficient.
    const metrics = runMetrics(
      run({ pieces_per_case: null }),
      detail([segment({ start_time: at(120), end_time: at(0), produced_cases: '360' })]),
      NOW,
    );

    expect(metrics.piecesPerCase).toBeNull();
    expect(metrics.expectedCases).toBeNull();
    expect(metrics.efficiencyPct).toBeNull();
    expect(metrics.actualSpeed).toBeNull();
  });

  it('leaves efficiency blank on an unrated line rather than guessing one', () => {
    const metrics = runMetrics(
      run({ rated_speed: '0' }),
      detail([segment({ start_time: at(60), end_time: at(0), produced_cases: '120' })]),
      NOW,
    );

    expect(metrics.ratedSpeed).toBeNull();
    expect(metrics.efficiencyPct).toBeNull();
    // The achieved speed needs no rating — only a clock and a pack size.
    expect(metrics.actualSpeed).toBe(2_400);
  });

  it('measures an unfinished breakdown rather than reading its stale minutes', () => {
    const metrics = runMetrics(
      run(),
      detail(
        [segment({ start_time: at(180), end_time: at(90), produced_cases: '300' })],
        [breakdown({ start_time: at(90), end_time: null, is_active: true, breakdown_minutes: 5 })],
      ),
      NOW,
    );

    expect(metrics.breakdownMinutes).toBe(90);
    expect(metrics.runningMinutes).toBe(90);
    expect(metrics.utilisationPct).toBe(50);
  });

  it('falls back to the run’s own totals until the detail arrives, and says so', () => {
    const metrics = runMetrics(run({ total_production: '880' }), undefined, NOW);

    expect(metrics.producedCases).toBe(880);
    expect(metrics.isPartial).toBe(true);
    expect(metrics.runningMinutes).toBe(0);
    expect(metrics.efficiencyPct).toBeNull();
  });

  it('reads a closed run’s own closing figure, not what its segments book', () => {
    // Live shape of run 390 on 2026-09-17: closed at 894, segments book 440
    // across five spells of which three booked nothing. The run screen shows
    // 894, so every board must too.
    const metrics = runMetrics(
      run({ status: 'COMPLETED', live_status: 'COMPLETED', total_production: '894' }),
      detail([
        segment({ produced_cases: '240' }),
        segment({ produced_cases: '0' }),
        segment({ produced_cases: '200' }),
        segment({ produced_cases: '0' }),
        segment({ produced_cases: '0' }),
      ]),
      NOW,
    );

    expect(metrics.producedCases).toBe(894);
    expect(metrics.closingCases).toBe(894);
    expect(metrics.segmentCases).toBe(440);
    expect(metrics.basis).toBe('closing');
    expect(metrics.isLive).toBe(false);
  });

  it('keeps the closing figure even where the segments book MORE', () => {
    // 6 Head run #4 on the same day: closed at 627, segments book 720.
    const metrics = runMetrics(
      run({ status: 'COMPLETED', live_status: 'COMPLETED', total_production: '627' }),
      detail([segment({ produced_cases: '720' })]),
      NOW,
    );

    expect(metrics.producedCases).toBe(627);
    expect(metrics.basis).toBe('closing');
  });

  it('falls back to the segments when a run was closed without a figure', () => {
    const metrics = runMetrics(
      run({ status: 'COMPLETED', live_status: 'COMPLETED', total_production: '0' }),
      detail([segment({ produced_cases: '440' })]),
      NOW,
    );

    expect(metrics.producedCases).toBe(440);
    expect(metrics.basis).toBe('segments');
  });

  it('measures the run against what it was opened for', () => {
    const metrics = runMetrics(
      run({ required_qty: '1000' }),
      detail([segment({ produced_cases: '750' })]),
      NOW,
    );

    expect(metrics.targetCases).toBe(1_000);
    expect(metrics.targetPct).toBe(75);
  });

  it('falls back to the line’s preset for a run opened without a rating', () => {
    const metrics = runMetrics(
      run({ rated_speed: '0', pieces_per_case: null }),
      detail([segment({ start_time: at(120), end_time: at(0), produced_cases: '360' })]),
      NOW,
      { ratedSpeed: 4_000, piecesPerCase: 20 },
    );

    expect(metrics.ratedSpeed).toBe(4_000);
    expect(metrics.piecesPerCase).toBe(20);
    expect(metrics.ratedFrom).toBe('config');
    expect(metrics.piecesFrom).toBe('config');
    expect(metrics.efficiencyPct).toBe(90);
  });

  it('keeps the run’s own snapshot when it has one — a preset edited since must not rewrite it', () => {
    const metrics = runMetrics(
      run({ rated_speed: '4000', pieces_per_case: 20 }),
      detail([segment({ start_time: at(120), end_time: at(0), produced_cases: '360' })]),
      NOW,
      { ratedSpeed: 9_000, piecesPerCase: 10 },
    );

    expect(metrics.ratedSpeed).toBe(4_000);
    expect(metrics.piecesPerCase).toBe(20);
    expect(metrics.ratedFrom).toBe('run');
    expect(metrics.efficiencyPct).toBe(90);
  });

  it('takes the half of the preset it needs and leaves the half the run has', () => {
    const metrics = runMetrics(
      run({ rated_speed: '4000', pieces_per_case: null }),
      detail([segment({ start_time: at(120), end_time: at(0), produced_cases: '360' })]),
      NOW,
      { ratedSpeed: null, piecesPerCase: 20 },
    );

    expect(metrics.ratedFrom).toBe('run');
    expect(metrics.piecesFrom).toBe('config');
    expect(metrics.efficiencyPct).toBe(90);
  });

  it('never hands a run negative time when a floor clock runs backwards', () => {
    const metrics = runMetrics(
      run(),
      detail([segment({ start_time: at(-30), end_time: null, is_active: true })]),
      NOW,
    );

    expect(metrics.runningMinutes).toBe(0);
  });
});
