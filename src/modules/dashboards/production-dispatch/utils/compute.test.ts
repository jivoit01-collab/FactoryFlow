import { describe, expect, it } from 'vitest';

import type { ProductionDispatchReport, ReportDay, ReportItem } from '../types';
import {
  dayItemRows,
  daysInRange,
  dispatchShare,
  itemRows,
  measure,
  monthsInRange,
  netPallet,
  sumTotals,
} from './compute';
import { presetOf, presetRange, rangeLabel, resolveRange } from './range';

const SETTINGS = {
  pallet_litres: 800,
  oil_density: 0.91,
  fast_days: 30,
  month_days: 30,
  movement_window_days: 90,
};

const item = (code: string, overrides: Partial<ReportItem> = {}): ReportItem => ({
  item_code: code,
  item_name: `Item ${code}`,
  variety: 'OLIVE',
  subgroup: 'POMACE',
  sku: '1 LTR',
  packing_type: 'PET BOTTLE',
  pieces_per_box: 16,
  litres_per_unit: 1,
  window_production: 0,
  window_dispatch: 0,
  movement: 'FAST',
  days_to_dispatch: 10,
  ...overrides,
});

const day = (date: string, code: string, overrides: Partial<ReportDay> = {}): ReportDay => ({
  date,
  item_code: code,
  production: 0,
  dispatch: 0,
  group_dispatch: 0,
  ...overrides,
});

function report(items: ReportItem[], days: ReportDay[]): ProductionDispatchReport {
  return {
    company: { code: 'JIVO_OIL', name: 'Jivo Oil' },
    from: '2026-08-30',
    to: '2026-09-02',
    settings: SETTINGS,
    movement_window: { from: '2026-06-05', to: '2026-09-02' },
    items,
    days,
    meta: { read_at: '2026-10-09T10:00:00Z' },
  };
}

describe('measure', () => {
  it('converts the way the workbook does', () => {
    const tin = item('FG1', { pieces_per_box: 4, litres_per_unit: 5 });
    expect(measure(160, tin, SETTINGS)).toEqual({
      qty: 160,
      box: 40,
      litres: 800,
      ton: 0.728,
      pallet: 1,
    });
  });

  it('reads a missing pack size as one unit a box', () => {
    expect(measure(3, item('FG1', { pieces_per_box: 0 }), SETTINGS).box).toBe(3);
  });
});

describe('the two sheets', () => {
  const data = report(
    [item('FG1'), item('FG2', { litres_per_unit: 5, pieces_per_box: 4, movement: 'SLOW' })],
    [
      day('2026-09-02', 'FG2', { production: 160, dispatch: 80 }),
      day('2026-08-30', 'FG1', { production: 1600 }),
      day('2026-08-31', 'FG1', { dispatch: 800, group_dispatch: 4000 }),
      day('2026-08-31', 'FG2'), // nothing moved
      day('2026-09-02', 'FG9', { production: 1 }), // not an item the server sent
    ],
  );

  it('gives Summary a row per SKU per day it moved, by date then item', () => {
    const rows = dayItemRows(data);
    expect(rows.map((row) => [row.date, row.item.item_code])).toEqual([
      ['2026-08-30', 'FG1'],
      ['2026-08-31', 'FG1'],
      ['2026-09-02', 'FG2'],
    ]);
    expect(rows[1].dispatch.pallet).toBe(1);
    expect(rows[1].groupDispatch.pallet).toBe(5);
    expect(rows[2].production.box).toBe(40);
  });

  it('adds the days up into Items, group sales apart', () => {
    const items = itemRows(dayItemRows(data));
    expect(items.map((row) => row.item.item_code)).toEqual(['FG1', 'FG2']);
    expect(items[0].production.pallet).toBe(2);
    expect(items[0].dispatch.pallet).toBe(1);
    expect(items[0].groupDispatch.pallet).toBe(5);
    expect(netPallet(items[0])).toBe(1);
    expect(dispatchShare(items[0])).toBe(0.5);
  });

  it('totals the same whichever sheet it is added up from', () => {
    const days = dayItemRows(data);
    expect(sumTotals(days)).toEqual(sumTotals(itemRows(days)));
  });

  it('has no share of nothing produced', () => {
    const rows = itemRows(
      dayItemRows(report([item('FG1')], [day('2026-08-30', 'FG1', { dispatch: 8 })])),
    );
    expect(dispatchShare(rows[0])).toBeNull();
  });
});

describe('ranges', () => {
  const today = '2026-10-09';

  it('counts both ends and months by the report month', () => {
    expect(daysInRange('2026-07-01', '2026-09-30')).toBe(92);
    expect(monthsInRange({ from: '2026-07-01', to: '2026-07-30', settings: SETTINGS })).toBe(1);
  });

  it('has presets', () => {
    expect(presetRange('this-month', today)).toEqual({ from: '2026-10-01', to: today });
    expect(presetRange('last-month', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('last-90', today)).toEqual({ from: '2026-07-12', to: today });
    expect(presetRange('yesterday', today)).toEqual({ from: '2026-10-08', to: '2026-10-08' });
    expect(presetOf({ from: '2026-09-01', to: '2026-09-30' }, today)).toBe('last-month');
    expect(presetOf({ from: '2026-09-02', to: '2026-09-30' }, today)).toBeNull();
  });

  it('makes whatever the URL says into a range the server will read', () => {
    expect(resolveRange({ from: null, to: null }, today)).toEqual({
      from: '2026-10-01',
      to: today,
    });
    expect(resolveRange({ from: 'junk', to: today }, today)).toEqual({
      from: '2026-10-01',
      to: today,
    });
    expect(resolveRange({ from: '2026-09-30', to: '2026-09-01' }, today)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(resolveRange({ from: '2026-10-05', to: '2026-12-31' }, today)).toEqual({
      from: '2026-10-05',
      to: today,
    });
    expect(resolveRange({ from: '2024-01-01', to: '2026-09-30' }, today)).toEqual({
      from: '2025-09-30',
      to: '2026-09-30',
    });
  });

  it('labels a range', () => {
    expect(rangeLabel({ from: '2026-10-09', to: '2026-10-09' })).toBe('9 Oct 2026');
    expect(rangeLabel({ from: '2026-09-01', to: '2026-09-30' })).toBe('1 Sept – 30 Sept 2026');
  });
});
