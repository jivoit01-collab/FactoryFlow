import { describe, expect, it } from 'vitest';

import type { NonMovingItem } from '../../non-moving/types';
import type { WarehouseOccupancyItem } from '../../production-control/types';
import type { BoardWarehouse, WorkforceStrip } from '../types';
import {
  combineWarehouseSides,
  idleByWarehouse,
  rollUpWarehouseSide,
  stockByWarehouse,
  warehouseCaption,
} from './warehouseSides';
import { sumWorkforceStrips } from './workforce';

/** 1,000 pieces at 10 a case of 10 kg: exactly one tonne. */
function stockRow(overrides: Partial<WarehouseOccupancyItem> = {}): WarehouseOccupancyItem {
  return {
    item_code: 'FG-1',
    item_name: 'Mustard 1 L',
    on_hand: 1000,
    pieces_per_box: 10,
    litres_per_piece: 1,
    stock_value: 50000,
    sub_group: 'MUSTARD',
    uom: 'PCS',
    gross_weight_per_case: 10,
    warehouse: 'BH-BT',
    warehouse_name: 'Bhakharpur New Basement',
    ...overrides,
  };
}

function idleRow(overrides: Partial<NonMovingItem> = {}): NonMovingItem {
  return {
    branch: '',
    item_code: 'FG-1',
    item_name: 'Mustard 1 L',
    item_group_name: 'FINISHED',
    sub_group: 'MUSTARD',
    warehouse: 'BH-BT',
    quantity: 500,
    value: 25000,
    last_movement_date: '2026-07-01',
    days_since_last_movement: 60,
    consumption_ratio: 0,
    ...overrides,
  } as NonMovingItem;
}

function ticked(overrides: Partial<BoardWarehouse> = {}): BoardWarehouse {
  return {
    warehouse: 'BH-BT',
    capacity_tonnes: null,
    last_audit_date: null,
    on_board: true,
    updated_at: null,
    updated_by_name: '',
    name: '',
    items: null,
    tonnes: null,
    unweighed_items: null,
    ...overrides,
  };
}

const side = (overrides: Partial<Parameters<typeof rollUpWarehouseSide>[0]> = {}) =>
  rollUpWarehouseSide({
    companyCode: 'JIVO_OIL',
    warehouses: [ticked()],
    stockRows: [stockRow()],
    idleRows: [],
    ageingDays: 90,
    ...overrides,
  });

describe('rollUpWarehouseSide', () => {
  it('weighs the ticked warehouses and tags every row with its company', () => {
    const oil = side();

    expect(oil.stockTonnage.tonnes).toBeCloseTo(1);
    expect(oil.stockRows.every((row) => row.company_code === 'JIVO_OIL')).toBe(true);
  });

  it('narrows idle stock to the ticked warehouses', () => {
    // The non-moving report answers for every warehouse in the company.
    const oil = side({
      idleRows: [idleRow(), idleRow({ warehouse: 'PB-JP' })],
    });

    expect(oil.nonMoving.items).toBe(1);
    expect(oil.nonMoving.tonnes).toBeCloseTo(0.5);
  });

  it('splits idle stock at the ageing threshold', () => {
    const oil = side({
      idleRows: [idleRow(), idleRow({ item_code: 'FG-1', days_since_last_movement: 120 })],
    });

    expect(oil.nonMoving.recentTonnes).toBeCloseTo(0.5);
    expect(oil.nonMoving.ageingTonnes).toBeCloseTo(0.5);
  });

  it('measures "% full" only over the warehouses that have a capacity', () => {
    // BH-BT holds 1 t against 2 t; BH-PTD holds 3 t and has no rating, so it
    // must not make BH-BT look fuller than it is.
    const oil = side({
      warehouses: [ticked({ capacity_tonnes: 2 }), ticked({ warehouse: 'BH-PTD' })],
      stockRows: [stockRow(), stockRow({ warehouse: 'BH-PTD', on_hand: 3000 })],
    });

    expect(oil.stockTonnage.tonnes).toBeCloseTo(4);
    expect(oil.ratedTonnes).toBeCloseTo(1);
    expect(oil.fillPct).toBeCloseTo(50);
    expect(oil.unrated).toEqual(['BH-PTD']);
  });

  it('has no "% full" where nothing is rated', () => {
    expect(side().fillPct).toBeNull();
    expect(side().capacityTonnes).toBeNull();
  });

  it('heads several floors with the oldest audit, and names the unaudited', () => {
    const oil = side({
      warehouses: [
        ticked({ last_audit_date: '2026-09-13' }),
        ticked({ warehouse: 'BH-PF', last_audit_date: '2026-09-01' }),
        ticked({ warehouse: 'GP-FG' }),
      ],
    });

    expect(oil.oldestAudit).toBe('2026-09-01');
    expect(oil.unaudited).toEqual(['GP-FG']);
  });

  it('matches warehouse codes however SAP pads or cases them', () => {
    const oil = side({ stockRows: [stockRow({ warehouse: ' bh-bt ' })] });

    expect(oil.stockTonnage.tonnes).toBeCloseTo(1);
  });
});

describe('combineWarehouseSides', () => {
  const oil = side({ warehouses: [ticked({ capacity_tonnes: 10 })] });
  const mart = rollUpWarehouseSide({
    companyCode: 'JIVO_MART',
    warehouses: [
      ticked({ warehouse: 'GP-FGM', capacity_tonnes: 2 }),
      ticked({ warehouse: 'BH-GR' }),
    ],
    stockRows: [stockRow({ warehouse: 'GP-FGM', on_hand: 2000 })],
    idleRows: [idleRow({ warehouse: 'GP-FGM' })],
    ageingDays: 90,
  });

  it('adds the tonnes and the capacities', () => {
    const both = combineWarehouseSides([oil, mart]);

    expect(both.stockTonnage.tonnes).toBeCloseTo(3);
    expect(both.capacityTonnes).toBe(12);
    expect(both.nonMoving.tonnes).toBeCloseTo(0.5);
  });

  it('recomputes "% full" from the sums rather than averaging the halves', () => {
    // Oil 10% full, Mart 100% full: an average says 55%, the plant is 25%.
    const both = combineWarehouseSides([oil, mart]);

    expect(both.fillPct).toBeCloseTo(25);
  });

  it('names a warehouse with its company, since both have a BH-GR', () => {
    expect(combineWarehouseSides([oil, mart]).unrated).toEqual(['MART BH-GR']);
    // One company needs no prefix.
    expect(combineWarehouseSides([mart]).unrated).toEqual(['BH-GR']);
  });

  it('keeps the rows of both companies apart by their tag', () => {
    const both = combineWarehouseSides([oil, mart]);

    expect(new Set(both.stockRows.map((row) => row.company_code))).toEqual(
      new Set(['JIVO_OIL', 'JIVO_MART']),
    );
  });
});

describe('the per-warehouse breakdowns', () => {
  const oil = side({
    warehouses: [ticked({ capacity_tonnes: 4 }), ticked({ warehouse: 'BH-PF' })],
    stockRows: [stockRow(), stockRow({ warehouse: 'BH-PF', on_hand: 2000 })],
    idleRows: [idleRow(), idleRow({ warehouse: 'BH-PF' })],
  });

  it('adds up to the tile, heaviest first', () => {
    const rows = stockByWarehouse([oil]);

    expect(rows.map((row) => row.warehouse)).toEqual(['BH-PF', 'BH-BT']);
    expect(rows.reduce((total, row) => total + row.tonnes, 0)).toBeCloseTo(oil.stockTonnage.tonnes);
    expect(rows[1].fillPct).toBeCloseTo(25);
    // Named from the stock rows where the ticked list carries no name.
    expect(rows[1].name).toBe('Bhakharpur New Basement');
  });

  it('splits idle stock by warehouse without losing any', () => {
    const rows = idleByWarehouse([oil]);

    expect(rows.reduce((total, row) => total + row.tonnes, 0)).toBeCloseTo(oil.nonMoving.tonnes);
  });
});

describe('warehouseCaption', () => {
  it('lists up to three codes and counts more', () => {
    expect(warehouseCaption(['BH-BT', 'GP-FGM'])).toBe('BH-BT · GP-FGM');
    expect(warehouseCaption(['A', 'B', 'C', 'D'])).toBe('4 warehouses');
    expect(warehouseCaption([])).toBe('no warehouse ticked');
  });
});

describe('sumWorkforceStrips', () => {
  const strip = (overrides: Partial<WorkforceStrip> = {}): WorkforceStrip => ({
    employees: 4,
    employeeCostPerDay: 5400,
    labour: 2,
    labourCostPerDay: 1300,
    ...overrides,
  });

  it('adds each figure across the halves', () => {
    const total = sumWorkforceStrips([strip(), strip({ employees: 6, labour: 0 })]);

    expect(total.employees).toBe(10);
    expect(total.labour).toBe(2);
    expect(total.employeeCostPerDay).toBe(10800);
  });

  it('keeps the known half where the other is unknown, and is null only when both are', () => {
    const total = sumWorkforceStrips([
      strip(),
      strip({ employees: null, employeeCostPerDay: null }),
    ]);

    expect(total.employees).toBe(4);
    expect(
      sumWorkforceStrips([strip({ employees: null }), strip({ employees: null })]).employees,
    ).toBeNull();
  });
});
