import { describe, expect, it } from 'vitest';

import { planPicks } from '../services';
import type { InventoryRecord } from '../types';

function rec(overrides: Partial<InventoryRecord> & { id: string }): InventoryRecord {
  return {
    locationId: 'L',
    itemCode: 'SKU1',
    itemName: 'Item 1',
    palletId: null,
    lotNumber: '',
    serialNumber: '',
    quantity: 10,
    uom: 'EA',
    boxCount: null,
    weight: null,
    volume: null,
    expiryDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('planPicks', () => {
  const inventory = [
    rec({ id: 'a', expiryDate: '2026-12-01', createdAt: '2026-03-01T00:00:00.000Z', quantity: 10 }),
    rec({ id: 'b', expiryDate: '2026-06-01', createdAt: '2026-01-01T00:00:00.000Z', quantity: 10 }),
    rec({ id: 'c', expiryDate: '2026-09-01', createdAt: '2026-02-01T00:00:00.000Z', quantity: 10 }),
  ];

  it('FEFO picks the earliest expiry first', () => {
    const plan = planPicks({ itemCode: 'SKU1', quantity: 5, inventory, strategy: 'FEFO' });
    expect(plan.allocations[0]?.inventoryId).toBe('b'); // 2026-06-01
  });

  it('FIFO picks the oldest received first', () => {
    const plan = planPicks({ itemCode: 'SKU1', quantity: 5, inventory, strategy: 'FIFO' });
    expect(plan.allocations[0]?.inventoryId).toBe('b'); // createdAt Jan
  });

  it('LIFO picks the newest received first', () => {
    const plan = planPicks({ itemCode: 'SKU1', quantity: 5, inventory, strategy: 'LIFO' });
    expect(plan.allocations[0]?.inventoryId).toBe('a'); // createdAt Mar
  });

  it('allocates across lines and reports the shortfall', () => {
    const plan = planPicks({ itemCode: 'SKU1', quantity: 25, inventory, strategy: 'FIFO' });
    expect(plan.allocations).toHaveLength(3);
    expect(plan.allocations.reduce((s, a) => s + a.quantity, 0)).toBe(25);

    const short = planPicks({ itemCode: 'SKU1', quantity: 100, inventory, strategy: 'FIFO' });
    expect(short.shortBy).toBe(70);
  });
});
