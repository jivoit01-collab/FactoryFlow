import { describe, expect, it } from 'vitest';

import type { MoveItem, MoveValidationInput } from '../services';
import { makeInventoryRecord, makeWarehouseLocation, validateMove } from '../services';
import type { WarehouseLocation, WmsSettings } from '../types';
import { DEFAULT_WMS_SETTINGS } from '../types';

const settings: WmsSettings = { ...DEFAULT_WMS_SETTINGS, masterEnabled: true, updatedAt: 'x' };

function dest(overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  const base = makeWarehouseLocation('wh', { code: 'D-01', barcode: 'D-01', column: 0, row: 0, level: 0 });
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

function input(overrides: Partial<MoveValidationInput> = {}): MoveValidationInput {
  return {
    settings,
    destination: dest(),
    destinationInventory: [],
    destinationPalletCount: 0,
    item,
    quantity: 5,
    added: { pallets: 0, units: 5, weight: 0, volume: 0 },
    ...overrides,
  };
}

describe('validateMove', () => {
  it('passes a clean move', () => {
    const result = validateMove(input());
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('blocks when the feature is off', () => {
    const result = validateMove(input({ settings: { ...settings, masterEnabled: false } }));
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('feature_off');
  });

  it('blocks a disabled or blocked destination', () => {
    expect(validateMove(input({ destination: dest({ enabled: false }) })).errors[0]?.code).toBe('location_disabled');
    expect(validateMove(input({ destination: dest({ status: 'DAMAGED' }) })).errors[0]?.code).toBe('location_blocked');
  });

  it('respects reservation match', () => {
    const reserved = dest({ reservation: { isReserved: true, reference: 'ORD-1' } });
    expect(validateMove(input({ destination: reserved })).ok).toBe(false);
    expect(validateMove(input({ destination: reserved, moveReference: 'ORD-1' })).ok).toBe(true);
  });

  it('enforces capacity as error or warning per settings', () => {
    const small = dest({ capacity: { maxPallets: null, maxUnits: 4, maxWeight: null, maxVolume: null } });
    const block = validateMove(input({ destination: small, settings: { ...settings, capacityViolation: 'BLOCK' } }));
    expect(block.ok).toBe(false);
    expect(block.errors[0]?.code).toBe('capacity');

    const warnOnly = validateMove(input({ destination: small, settings: { ...settings, capacityViolation: 'WARN' } }));
    expect(warnOnly.ok).toBe(true);
    expect(warnOnly.warnings.some((w) => w.code === 'capacity')).toBe(true);
  });

  it('always blocks placing a pallet into a full pallet-capacity location, even when capacityViolation is WARN', () => {
    const oneSlot = dest({ capacity: { maxPallets: 1, maxUnits: null, maxWeight: null, maxVolume: null } });
    const result = validateMove(
      input({
        destination: oneSlot,
        destinationPalletCount: 1,
        added: { pallets: 1, units: 400, weight: 0, volume: 0 },
        settings: { ...settings, capacityViolation: 'WARN' },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'capacity_pallets')).toBe(true);
  });

  it('enforces allowed material types', () => {
    const restricted = dest({
      materialRules: { ...dest().materialRules, allowedMaterialTypes: ['RAW'] },
    });
    const result = validateMove(input({ destination: restricted, settings: { ...settings, materialRuleViolation: 'BLOCK' } }));
    expect(result.errors.some((e) => e.code === 'type_not_allowed')).toBe(true);
  });

  it('blocks mixing and wrong lot', () => {
    const noMix = dest({ materialRules: { ...dest().materialRules, allowMixedItems: false } });
    const existing = makeInventoryRecord({ locationId: 'wh', itemCode: 'OTHER', quantity: 1 });
    const mix = validateMove(input({ destination: noMix, destinationInventory: [existing], settings: { ...settings, materialRuleViolation: 'BLOCK' } }));
    expect(mix.errors.some((e) => e.code === 'no_mixing')).toBe(true);
  });

  it('checks temperature and hazmat', () => {
    const cold = dest({ materialRules: { ...dest().materialRules, temperatureClass: 'FROZEN' } });
    const warmItem = { ...item, temperatureClass: 'AMBIENT' as const };
    expect(
      validateMove(input({ destination: cold, item: warmItem, settings: { ...settings, materialRuleViolation: 'BLOCK' } })).errors.some((e) => e.code === 'temperature'),
    ).toBe(true);

    const hazItem = { ...item, hazmatClass: '3' };
    expect(
      validateMove(input({ item: hazItem, settings: { ...settings, materialRuleViolation: 'BLOCK' } })).errors.some((e) => e.code === 'hazmat_not_allowed'),
    ).toBe(true);
  });

  it('checks source stock and lot existence', () => {
    const source = { location: dest({ code: 'S-01' }), availableQuantity: 2, lotExists: true, serialExists: true };
    const short = validateMove(input({ source }));
    expect(short.errors.some((e) => e.code === 'insufficient_stock')).toBe(true);

    const allowNeg = validateMove(input({ source, settings: { ...settings, allowNegativeStock: true } }));
    expect(allowNeg.ok).toBe(true);
    expect(allowNeg.warnings.some((w) => w.code === 'negative_stock')).toBe(true);

    const lotItem = { ...item, lotNumber: 'L9' };
    const lotMissing = validateMove(input({ item: lotItem, source: { ...source, availableQuantity: 10, lotExists: false } }));
    expect(lotMissing.errors.some((e) => e.code === 'lot_missing')).toBe(true);
  });
});
