import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wmsStore } from '../store';
import { makeInventoryRecord } from '../services';
import { resetWmsBackend } from './helpers/wmsBackendMock';

vi.mock('@/core/api', async () => {
  const mod = await import('./helpers/wmsBackendMock');
  return { apiClient: mod.apiClient };
});

beforeEach(() => {
  resetWmsBackend();
  wmsStore.reset();
});

describe('receiveStock', () => {
  it('receives onto a pallet and the stock appears at the location', async () => {
    await wmsStore.receiveStock({
      destLocationId: 'L1',
      itemCode: 'SKU1',
      itemName: 'Item 1',
      quantity: 100,
      boxCount: 10,
      unitsPerBox: 10,
      licensePlate: 'LP1',
    });

    const stockHere = wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'L1');
    expect(stockHere).toHaveLength(1);
    expect(stockHere[0]?.quantity).toBe(100);

    const pallet = wmsStore.getSnapshot('pallets')[0];
    expect(pallet?.licensePlate).toBe('LP1');
    expect(pallet?.currentLocationId).toBe('L1');

    expect(wmsStore.getSnapshot('movements').some((m) => m.type === 'PUTAWAY')).toBe(true);
  });

  it('merges loose stock into an existing matching line', async () => {
    await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'L1', itemCode: 'SKU1', quantity: 5, boxCount: 1 }));

    await wmsStore.receiveStock({
      destLocationId: 'L1',
      itemCode: 'SKU1',
      quantity: 20,
      boxCount: 2,
    });

    const stockHere = wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'L1');
    expect(stockHere).toHaveLength(1);
    expect(stockHere[0]?.quantity).toBe(25);
    expect(stockHere[0]?.boxCount).toBe(3);
  });
});
