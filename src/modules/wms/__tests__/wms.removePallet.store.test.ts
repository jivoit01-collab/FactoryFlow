import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeInventoryRecord, makePallet } from '../services';
import { wmsStore } from '../store';
import { resetWmsBackend } from './helpers/wmsBackendMock';

vi.mock('@/core/api', async () => {
  const mod = await import('./helpers/wmsBackendMock');
  return { apiClient: mod.apiClient };
});

beforeEach(() => {
  resetWmsBackend();
  wmsStore.reset();
});

async function seedPlaced(boxCount = 10, quantity = 100) {
  const pallet = makePallet({
    licensePlate: 'LP1',
    currentLocationId: 'L1',
    itemCode: 'SKU1',
    itemName: 'Item 1',
    boxCount,
    totalUnits: quantity,
  });
  await wmsStore.create('pallets', pallet);
  await wmsStore.create(
    'inventory',
    makeInventoryRecord({ locationId: 'L1', itemCode: 'SKU1', quantity, palletId: pallet.id, boxCount }),
  );
  return pallet;
}

describe('removePalletFromLocation (soft delete)', () => {
  it('keeps the pallet as REMOVED (unplaced, stock dropped) instead of hard-deleting', async () => {
    const pallet = await seedPlaced();
    await wmsStore.removePalletFromLocation(pallet.id, { id: '7', name: 'Op' });

    const kept = wmsStore.getSnapshot('pallets');
    expect(kept).toHaveLength(1); // record retained, not deleted
    expect(kept[0]?.status).toBe('REMOVED');
    expect(kept[0]?.currentLocationId).toBeNull();
    expect(wmsStore.getSnapshot('inventory')).toHaveLength(0); // space is empty
    const adj = wmsStore.getSnapshot('movements').find((m) => m.type === 'ADJUSTMENT');
    expect(adj?.userName).toBe('Op'); // the operator is recorded
  });

  it('restores a REMOVED pallet back onto the map with its stock', async () => {
    const pallet = await seedPlaced(10, 100);
    await wmsStore.removePalletFromLocation(pallet.id);
    await wmsStore.restoreRemovedPallet({ palletId: pallet.id, toLocationId: 'L2' });

    const restored = wmsStore.getSnapshot('pallets')[0];
    expect(restored?.status).toBe('ACTIVE');
    expect(restored?.currentLocationId).toBe('L2');
    const stock = wmsStore.getSnapshot('inventory');
    expect(stock).toHaveLength(1);
    expect(stock[0]?.quantity).toBe(100);
  });

  it('purges a REMOVED pallet for good', async () => {
    const pallet = await seedPlaced();
    await wmsStore.removePalletFromLocation(pallet.id);
    await wmsStore.purgeRemovedPallet(pallet.id);
    expect(wmsStore.getSnapshot('pallets')).toHaveLength(0);
  });
});

describe('move / ship guards', () => {
  it('refuses to move a SHIPPED pallet', async () => {
    const pallet = await seedPlaced(1, 5);
    await wmsStore.shipPallet({ palletId: pallet.id });
    await expect(wmsStore.movePallet({ palletId: pallet.id, toLocationId: 'L2' })).rejects.toThrow(
      /already been dispatched/i,
    );
  });

  it('refuses to move a REMOVED pallet', async () => {
    const pallet = await seedPlaced();
    await wmsStore.removePalletFromLocation(pallet.id);
    await expect(wmsStore.movePallet({ palletId: pallet.id, toLocationId: 'L2' })).rejects.toThrow(
      /removed from the map/i,
    );
  });

  it('no-ops a same-location move', async () => {
    const pallet = await seedPlaced();
    await wmsStore.movePallet({ palletId: pallet.id, toLocationId: 'L1' });
    // No TRANSFER logged, pallet unchanged.
    expect(wmsStore.getSnapshot('movements').some((m) => m.type === 'TRANSFER')).toBe(false);
    expect(wmsStore.getSnapshot('pallets')[0]?.currentLocationId).toBe('L1');
  });

  it('refuses to dispatch an already-shipped pallet', async () => {
    const pallet = await seedPlaced(1, 5);
    await wmsStore.shipPallet({ palletId: pallet.id });
    await expect(wmsStore.shipPallet({ palletId: pallet.id })).rejects.toThrow(
      /already been dispatched/i,
    );
  });
});
