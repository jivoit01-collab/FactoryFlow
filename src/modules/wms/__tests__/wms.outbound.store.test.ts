import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wmsStore } from '../store';
import { makeInventoryRecord, makePallet } from '../services';
import { resetWmsBackend } from './helpers/wmsBackendMock';

vi.mock('@/core/api', async () => {
  const mod = await import('./helpers/wmsBackendMock');
  return { apiClient: mod.apiClient };
});

beforeEach(() => {
  resetWmsBackend();
  wmsStore.reset();
});

async function seedPallet(boxCount = 10, quantity = 100) {
  const pallet = makePallet({
    licensePlate: 'LP1',
    currentLocationId: 'L1',
    itemCode: 'SKU1',
    itemName: 'Item 1',
    boxCount,
    totalUnits: quantity,
  });
  await wmsStore.create('pallets', pallet);
  await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'L1', itemCode: 'SKU1', quantity, palletId: pallet.id, boxCount }));
  return pallet;
}

describe('shipPallet (outbound audit)', () => {
  it('removes stock, marks the pallet shipped, and logs OUTBOUND', async () => {
    const pallet = await seedPallet();
    await wmsStore.shipPallet({ palletId: pallet.id });

    expect(wmsStore.getSnapshot('inventory')).toHaveLength(0);
    expect(wmsStore.getSnapshot('pallets')[0]?.status).toBe('SHIPPED');
    const outbound = wmsStore.getSnapshot('movements').find((m) => m.type === 'OUTBOUND');
    expect(outbound?.auditConfirmed).toBe(true);
  });

  it('logs an ADJUSTMENT when the audited box count differs', async () => {
    const pallet = await seedPallet(10);
    await wmsStore.shipPallet({ palletId: pallet.id, correctedBoxCount: 7, supervisorApproved: true });

    const movements = wmsStore.getSnapshot('movements');
    const adjustment = movements.find((m) => m.type === 'ADJUSTMENT');
    expect(adjustment?.discrepancy).toBe(true);
    expect(adjustment?.boxCount).toBe(7);
    expect(movements.find((m) => m.type === 'OUTBOUND')?.discrepancy).toBe(true);
  });
});

describe('pickInventory', () => {
  it('decrements a line and logs PICK', async () => {
    const stock = makeInventoryRecord({ locationId: 'L1', itemCode: 'SKU1', quantity: 10 });
    await wmsStore.create('inventory', stock);

    await wmsStore.pickInventory({ sourceId: stock.id, quantity: 4 });

    expect(wmsStore.getSnapshot('inventory')[0]?.quantity).toBe(6);
    expect(wmsStore.getSnapshot('movements').some((m) => m.type === 'PICK' && m.quantity === 4)).toBe(true);
  });

  it('clears a fully picked pallet line and marks the pallet PICKED', async () => {
    const pallet = await seedPallet(1, 5);
    const line = wmsStore.getSnapshot('inventory')[0]!;

    await wmsStore.pickInventory({ sourceId: line.id, quantity: 5 });

    expect(wmsStore.getSnapshot('inventory')).toHaveLength(0);
    expect(wmsStore.getSnapshot('pallets')[0]?.status).toBe('PICKED');
  });
});
