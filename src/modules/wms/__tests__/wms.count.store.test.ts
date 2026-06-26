import { beforeEach, describe, expect, it } from 'vitest';

import { setActiveWmsAdapter } from '../storage';
import { wmsStore } from '../store';
import { makeInventoryRecord } from '../services';

beforeEach(() => {
  localStorage.clear();
  setActiveWmsAdapter('localstorage');
  wmsStore.reset();
});

describe('postCycleCount', () => {
  it('adjusts a counted line and logs a CYCLE_COUNT discrepancy', async () => {
    const record = makeInventoryRecord({ locationId: 'L1', itemCode: 'SKU1', quantity: 10 });
    await wmsStore.create('inventory', record);

    const { adjustments } = await wmsStore.postCycleCount({
      locationId: 'L1',
      counts: [{ inventoryId: record.id, countedQuantity: 7 }],
    });

    expect(adjustments).toBe(1);
    expect(wmsStore.getSnapshot('inventory')[0]?.quantity).toBe(7);
    const log = wmsStore.getSnapshot('movements').find((m) => m.type === 'CYCLE_COUNT');
    expect(log?.discrepancy).toBe(true);
    expect(log?.quantity).toBe(7);
  });

  it('records no adjustment when the count matches', async () => {
    const record = makeInventoryRecord({ locationId: 'L1', itemCode: 'SKU1', quantity: 5 });
    await wmsStore.create('inventory', record);

    const { adjustments } = await wmsStore.postCycleCount({
      locationId: 'L1',
      counts: [{ inventoryId: record.id, countedQuantity: 5 }],
    });

    expect(adjustments).toBe(0);
    expect(wmsStore.getSnapshot('movements')).toHaveLength(0);
  });

  it('adds a found item that was not on record', async () => {
    const { adjustments } = await wmsStore.postCycleCount({
      locationId: 'L1',
      counts: [],
      additions: [{ itemCode: 'SKU9', quantity: 4 }],
    });

    expect(adjustments).toBe(1);
    const stock = wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'L1');
    expect(stock[0]?.itemCode).toBe('SKU9');
    expect(stock[0]?.quantity).toBe(4);
  });
});
