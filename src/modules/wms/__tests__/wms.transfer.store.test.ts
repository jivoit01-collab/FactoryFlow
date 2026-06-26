import { beforeEach, describe, expect, it } from 'vitest';

import { setActiveWmsAdapter } from '../storage';
import { wmsStore } from '../store';
import { makeInventoryRecord } from '../services';
import type { InventoryRecord, Pallet } from '../types';
import { createWmsId, nowIso } from '../utils';

beforeEach(() => {
  localStorage.clear();
  setActiveWmsAdapter('localstorage');
  wmsStore.reset();
});

function inventoryAt(locationId: string): InventoryRecord[] {
  return wmsStore.getSnapshot('inventory').filter((record) => record.locationId === locationId);
}

describe('moveInventory', () => {
  it('moves a partial quantity, leaving a reduced source', async () => {
    const source = makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 10, uom: 'EA' });
    await wmsStore.create('inventory', source);

    await wmsStore.moveInventory({ sourceId: source.id, toLocationId: 'B', quantity: 4 });

    expect(inventoryAt('A')[0]?.quantity).toBe(6);
    expect(inventoryAt('B')[0]?.quantity).toBe(4);
    // A TRANSFER entry was logged.
    const log = wmsStore.getSnapshot('movements');
    expect(log.some((m) => m.type === 'TRANSFER' && m.quantity === 4)).toBe(true);
  });

  it('clears the source line when fully moved and merges into an existing destination line', async () => {
    const source = makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 5 });
    const existingDest = makeInventoryRecord({ locationId: 'B', itemCode: 'SKU1', quantity: 3 });
    await wmsStore.create('inventory', source);
    await wmsStore.create('inventory', existingDest);

    await wmsStore.moveInventory({ sourceId: source.id, toLocationId: 'B', quantity: 5 });

    expect(inventoryAt('A')).toHaveLength(0);
    expect(inventoryAt('B')).toHaveLength(1);
    expect(inventoryAt('B')[0]?.quantity).toBe(8);
  });
});

describe('movePallet', () => {
  it('relocates the pallet and its inventory', async () => {
    const pallet: Pallet = {
      id: createWmsId(),
      licensePlate: 'LP1',
      currentLocationId: 'A',
      itemCode: 'SKU1',
      itemName: 'Item 1',
      boxCount: 10,
      unitsPerBox: null,
      totalUnits: 100,
      lotNumber: '',
      expiryDate: null,
      status: 'ACTIVE',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const stock = makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 100, palletId: pallet.id });
    await wmsStore.create('pallets', pallet);
    await wmsStore.create('inventory', stock);

    await wmsStore.movePallet({ palletId: pallet.id, toLocationId: 'B' });

    expect(wmsStore.getSnapshot('pallets')[0]?.currentLocationId).toBe('B');
    expect(inventoryAt('B')).toHaveLength(1);
    expect(inventoryAt('A')).toHaveLength(0);
    expect(wmsStore.getSnapshot('movements').some((m) => m.type === 'TRANSFER' && m.palletId === pallet.id)).toBe(true);
  });
});
