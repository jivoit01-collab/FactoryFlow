import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeInventoryRecord } from '../services';
import { wmsStore } from '../store';
import type { Pallet } from '../types';
import { createWmsId, nowIso } from '../utils';
import { resetWmsBackend } from './helpers/wmsBackendMock';

vi.mock('@/core/api', async () => {
  const mod = await import('./helpers/wmsBackendMock');
  return { apiClient: mod.apiClient };
});

beforeEach(() => {
  resetWmsBackend();
  wmsStore.reset();
});

describe('syncExternalPalletPlacement (barcode → WMS bridge)', () => {
  it('creates a new pallet + inventory + PUTAWAY for an unknown plate', async () => {
    await wmsStore.syncExternalPalletPlacement({
      licensePlate: 'PLT-NEW',
      toLocationId: 'A',
      itemCode: 'SKU1',
      itemName: 'Item 1',
      lotNumber: 'L1',
      boxCount: 4,
      totalUnits: 40,
      uom: 'EA',
    });

    const pallets = wmsStore.getSnapshot('pallets');
    expect(pallets).toHaveLength(1);
    expect(pallets[0]?.licensePlate).toBe('PLT-NEW');
    expect(pallets[0]?.currentLocationId).toBe('A');

    const inventory = wmsStore.getSnapshot('inventory');
    expect(inventory).toHaveLength(1);
    expect(inventory[0]?.locationId).toBe('A');
    expect(inventory[0]?.quantity).toBe(40);
    expect(inventory[0]?.palletId).toBe(pallets[0]?.id);

    const putaway = wmsStore.getSnapshot('movements').find((m) => m.type === 'PUTAWAY');
    expect(putaway).toBeTruthy();
    // The plate is snapshotted on the movement so the audit row still names the
    // pallet after it later leaves the system.
    expect(putaway?.licensePlate).toBe('PLT-NEW');
  });

  it('relocates an existing pallet (and its stock) and logs a TRANSFER', async () => {
    const pallet: Pallet = {
      id: createWmsId(),
      licensePlate: 'PLT-1',
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
    await wmsStore.create('pallets', pallet);
    await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 100, palletId: pallet.id }));

    await wmsStore.syncExternalPalletPlacement({
      licensePlate: 'plt-1', // case-insensitive match
      toLocationId: 'B',
      itemCode: 'SKU1',
    });

    const pallets = wmsStore.getSnapshot('pallets');
    expect(pallets).toHaveLength(1); // no duplicate created
    expect(pallets[0]?.currentLocationId).toBe('B');
    expect(wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'B')).toHaveLength(1);
    expect(wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'A')).toHaveLength(0);
    expect(wmsStore.getSnapshot('movements').some((m) => m.type === 'TRANSFER' && m.palletId === pallet.id)).toBe(true);
  });

  it('is a no-op when the pallet is already at the destination', async () => {
    const pallet: Pallet = {
      id: createWmsId(),
      licensePlate: 'PLT-2',
      currentLocationId: 'A',
      itemCode: 'SKU1',
      itemName: 'Item 1',
      boxCount: 1,
      unitsPerBox: null,
      totalUnits: 1,
      lotNumber: '',
      expiryDate: null,
      status: 'ACTIVE',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await wmsStore.create('pallets', pallet);

    await wmsStore.syncExternalPalletPlacement({ licensePlate: 'PLT-2', toLocationId: 'A', itemCode: 'SKU1' });

    expect(wmsStore.getSnapshot('movements')).toHaveLength(0);
  });
});

function palletAt(locationId: string | null, overrides: Partial<Pallet> = {}): Pallet {
  return {
    id: createWmsId(),
    licensePlate: 'PLT-R',
    currentLocationId: locationId,
    itemCode: 'SKU1',
    itemName: 'Item 1',
    boxCount: 4,
    unitsPerBox: null,
    totalUnits: 40,
    lotNumber: '',
    expiryDate: null,
    status: 'ACTIVE',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...overrides,
  };
}

describe('reconcileExternalPallet (absolute-state sync)', () => {
  it('updates quantity + box count in place and logs an ADJUSTMENT', async () => {
    const pallet = palletAt('A');
    await wmsStore.create('pallets', pallet);
    await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 40, boxCount: 4, palletId: pallet.id }));

    await wmsStore.reconcileExternalPallet({
      licensePlate: 'PLT-R',
      toLocationId: 'A', // same location
      itemCode: 'SKU1',
      boxCount: 2,
      totalUnits: 20,
    });

    expect(wmsStore.getSnapshot('inventory')[0]?.quantity).toBe(20);
    expect(wmsStore.getSnapshot('inventory')[0]?.boxCount).toBe(2);
    expect(wmsStore.getSnapshot('pallets')[0]?.boxCount).toBe(2);
    expect(wmsStore.getSnapshot('movements').some((m) => m.type === 'ADJUSTMENT')).toBe(true);
  });

  it('relocates and updates quantity with a TRANSFER when the location changes', async () => {
    const pallet = palletAt('A');
    await wmsStore.create('pallets', pallet);
    await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 40, palletId: pallet.id }));

    await wmsStore.reconcileExternalPallet({ licensePlate: 'PLT-R', toLocationId: 'B', itemCode: 'SKU1', totalUnits: 30 });

    expect(wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'B')).toHaveLength(1);
    expect(wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'B')[0]?.quantity).toBe(30);
    expect(wmsStore.getSnapshot('movements').some((m) => m.type === 'TRANSFER')).toBe(true);
  });

  it('does not clobber quantities of a WMS-rich pallet (multiple lines), only relocates', async () => {
    const pallet = palletAt('A');
    await wmsStore.create('pallets', pallet);
    await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 25, lotNumber: 'L1', palletId: pallet.id }));
    await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 15, lotNumber: 'L2', palletId: pallet.id }));

    await wmsStore.reconcileExternalPallet({ licensePlate: 'PLT-R', toLocationId: 'B', itemCode: 'SKU1', totalUnits: 999 });

    const atB = wmsStore.getSnapshot('inventory').filter((r) => r.locationId === 'B');
    expect(atB).toHaveLength(2); // both lines preserved
    expect(atB.reduce((s, r) => s + r.quantity, 0)).toBe(40); // quantities untouched
  });
});

describe('removeExternalPallet (left WMS-managed space)', () => {
  it('clears stock and unplaces a held pallet', async () => {
    const pallet = palletAt('A');
    await wmsStore.create('pallets', pallet);
    await wmsStore.create('inventory', makeInventoryRecord({ locationId: 'A', itemCode: 'SKU1', quantity: 40, palletId: pallet.id }));

    await wmsStore.removeExternalPallet({ licensePlate: 'PLT-R' });

    expect(wmsStore.getSnapshot('inventory')).toHaveLength(0);
    expect(wmsStore.getSnapshot('pallets')[0]?.currentLocationId).toBeNull();
    expect(wmsStore.getSnapshot('pallets')[0]?.status).toBe('SHIPPED');
  });

  it('is a no-op for a plate the WMS never held', async () => {
    await wmsStore.removeExternalPallet({ licensePlate: 'UNKNOWN' });
    expect(wmsStore.getSnapshot('movements')).toHaveLength(0);
  });
});
