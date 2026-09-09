import { describe, expect, it } from 'vitest';

import type { LiveStatus, ProductionRun } from '@/modules/production/execution/types';

import { buildLineBoard, isLineAlarming, LINE_STATE_DOT, LINE_STATE_TONE } from './lineBoard';

let seq = 0;

function run(
  lineId: number,
  lineName: string,
  live_status: LiveStatus,
  overrides: Partial<ProductionRun> = {},
): ProductionRun {
  seq += 1;
  return {
    id: seq,
    sap_doc_entry: null,
    run_number: seq,
    date: '2026-09-09',
    line: lineId,
    line_name: lineName,
    product: 'COLD PRESS 1 LTR 20 PCS',
    item_code: 'FG0000032',
    required_qty: null,
    rated_speed: '4800',
    pieces_per_case: 20,
    total_production: '0',
    total_running_minutes: 0,
    total_breakdown_time: 0,
    rejected_qty: '0',
    reworked_qty: '0',
    warehouse_approval_status: 'NOT_REQUESTED',
    status: 'IN_PROGRESS',
    live_status,
    created_by: null,
    created_at: '2026-09-09T04:48:00Z',
    ...overrides,
  } as ProductionRun;
}

describe('buildLineBoard', () => {
  it('gives one row per line, not per run', () => {
    const board = buildLineBoard([
      run(3, '10 Head', 'STOPPED'),
      run(3, '10 Head', 'STOPPED'),
      run(3, '10 Head', 'DRAFT'),
    ]);
    expect(board.rows).toHaveLength(1);
    expect(board.rows[0].runs).toHaveLength(3);
  });

  it('lets the worst state win on a line carrying several runs', () => {
    // One run broken down and one running is a broken line, not a running one.
    const board = buildLineBoard([
      run(1, 'Clear Pack', 'RUNNING'),
      run(1, 'Clear Pack', 'BREAKDOWN'),
    ]);
    expect(board.rows[0].state).toBe('BREAKDOWN');
    expect(board.brokenDown).toBe(1);
    expect(board.running).toBe(0);
  });

  it('counts a stopped mid-run line apart from a running one', () => {
    // 2026-09-08: 7 runs IN_PROGRESS but only 3 with an open segment.
    const board = buildLineBoard([
      run(1, 'Clear Pack', 'RUNNING'),
      run(2, 'JP Machine', 'RUNNING'),
      run(3, '10 Head', 'STOPPED'),
      run(4, '6 Head', 'STOPPED'),
      run(5, 'Pouch', 'DRAFT'),
    ]);
    expect(board.running).toBe(2);
    expect(board.stopped).toBe(2);
    expect(board.notStarted).toBe(1);
  });

  it('ranks breakdowns to the top of the board and drafts to the bottom', () => {
    const board = buildLineBoard([
      run(5, 'Pouch', 'DRAFT'),
      run(4, '6 Head', 'COMPLETED'),
      run(1, 'Clear Pack', 'BREAKDOWN'),
      run(2, 'JP Machine', 'RUNNING'),
      run(3, '10 Head', 'STOPPED'),
    ]);
    expect(board.rows.map((row) => row.state)).toEqual([
      'BREAKDOWN',
      'RUNNING',
      'STOPPED',
      'COMPLETED',
      'DRAFT',
    ]);
  });

  it('orders lines of equal state by name so the board does not reshuffle', () => {
    const board = buildLineBoard([
      run(9, 'Tin Head', 'RUNNING'),
      run(1, 'Clear Pack', 'RUNNING'),
      run(5, 'Pouch Machine', 'RUNNING'),
    ]);
    expect(board.rows.map((row) => row.lineName)).toEqual([
      'Clear Pack',
      'Pouch Machine',
      'Tin Head',
    ]);
  });

  it('totals cases and downtime across every run on the line', () => {
    const board = buildLineBoard([
      run(3, '10 Head', 'COMPLETED', { total_production: '689', total_breakdown_time: 20 }),
      run(3, '10 Head', 'COMPLETED', { total_production: '280', total_breakdown_time: 5 }),
    ]);
    expect(board.rows[0].cases).toBe(969);
    expect(board.rows[0].breakdownMinutes).toBe(25);
    expect(board.cases).toBe(969);
    expect(board.breakdownMinutes).toBe(25);
  });

  it('takes its speed from the worst-state run, not an arbitrary one', () => {
    const board = buildLineBoard([
      run(1, 'Clear Pack', 'COMPLETED', {
        total_production: '1076',
        total_running_minutes: 605,
        rated_speed: '4800',
      }),
      run(1, 'Clear Pack', 'BREAKDOWN', {
        total_production: '0',
        total_running_minutes: 0,
        rated_speed: '4800',
      }),
    ]);
    expect(board.rows[0].state).toBe('BREAKDOWN');
    expect(board.rows[0].speed.reason).toBe('no-runtime');
  });

  it('reports a computable speed on a finished line', () => {
    const board = buildLineBoard([
      run(1, 'Clear Pack', 'COMPLETED', {
        total_production: '1076',
        total_running_minutes: 605,
        pieces_per_case: 20,
        rated_speed: '4800',
      }),
    ]);
    expect(board.rows[0].speed.percent).toBeCloseTo(44.5, 1);
  });

  it('falls back to a line label when the name is missing', () => {
    const board = buildLineBoard([run(7, '', 'RUNNING')]);
    expect(board.rows[0].lineName).toBe('Line 7');
  });

  it('returns an empty board on a day with no runs', () => {
    const board = buildLineBoard([]);
    expect(board.rows).toEqual([]);
    expect(board).toMatchObject({ running: 0, brokenDown: 0, cases: 0, breakdownMinutes: 0 });
  });
});

describe('line state colouring', () => {
  it('treats a stopped line as alarming, same as a breakdown', () => {
    // A stopped line costs the same output as a broken one, so both are red.
    expect(isLineAlarming('STOPPED')).toBe(true);
    expect(isLineAlarming('BREAKDOWN')).toBe(true);
  });

  it('leaves running, finished and not-started calm', () => {
    expect(isLineAlarming('RUNNING')).toBe(false);
    expect(isLineAlarming('COMPLETED')).toBe(false);
    expect(isLineAlarming('DRAFT')).toBe(false);
  });

  it('gives stopped and breakdown the same red, not red and amber', () => {
    expect(LINE_STATE_TONE.STOPPED).toBe(LINE_STATE_TONE.BREAKDOWN);
    expect(LINE_STATE_DOT.STOPPED).toBe(LINE_STATE_DOT.BREAKDOWN);
    expect(LINE_STATE_TONE.STOPPED).toContain('rose');
  });

  it('still keeps a running line visually distinct from an alarming one', () => {
    expect(LINE_STATE_TONE.RUNNING).not.toBe(LINE_STATE_TONE.STOPPED);
  });
});
