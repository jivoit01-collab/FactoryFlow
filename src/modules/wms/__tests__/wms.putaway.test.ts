import { describe, expect, it } from 'vitest';

import { makeInventoryRecord, makeWarehouseLocation, suggestPutaway } from '../services';
import type { MoveItem } from '../services';
import { DEFAULT_WMS_SETTINGS } from '../types';
import type { WarehouseLocation, WmsSettings } from '../types';

const settings: WmsSettings = { ...DEFAULT_WMS_SETTINGS, masterEnabled: true, updatedAt: 'x' };

function loc(code: string, overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  const base = makeWarehouseLocation('wh', { code, barcode: code, column: 0, row: 0, level: 0 });
  return { ...base, ...overrides };
}

const item: MoveItem = {
  itemCode: 'SKU1',
  materialType: 'FINISHED',
  temperatureClass: null,
  hazmatClass: '',
  lotNumber: '',
  serialNumber: '',
  expiryDate: null,
};

const added = { pallets: 0, units: 10, weight: 0, volume: 0 };

describe('suggestPutaway', () => {
  it('excludes ineligible locations (disabled / blocked)', () => {
    const ok = loc('A-01');
    const disabled = loc('A-02', { enabled: false });
    const blocked = loc('A-03', { status: 'BLOCKED' });
    const result = suggestPutaway({ settings, item, quantity: 10, added, locations: [ok, disabled, blocked], inventory: [], pallets: [] });
    expect(result.map((s) => s.location.code)).toEqual(['A-01']);
  });

  it('prefers consolidating with the same item', () => {
    const empty = loc('A-01');
    const hasItem = loc('A-02');
    const inventory = [makeInventoryRecord({ locationId: hasItem.id, itemCode: 'SKU1', quantity: 5 })];
    const result = suggestPutaway({ settings, item, quantity: 10, added, locations: [empty, hasItem], inventory, pallets: [] });
    expect(result[0]?.location.code).toBe('A-02');
  });

  it('respects capacity when violations hard-block', () => {
    const tiny = loc('A-01', { capacity: { maxPallets: null, maxUnits: 5, maxWeight: null, maxVolume: null } });
    const big = loc('A-02', { capacity: { maxPallets: null, maxUnits: 1000, maxWeight: null, maxVolume: null } });
    const result = suggestPutaway({
      settings: { ...settings, capacityViolation: 'BLOCK' },
      item,
      quantity: 10,
      added,
      locations: [tiny, big],
      inventory: [],
      pallets: [],
    });
    expect(result.map((s) => s.location.code)).toEqual(['A-02']);
  });
});
