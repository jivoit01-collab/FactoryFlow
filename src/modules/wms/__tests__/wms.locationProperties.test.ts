import { describe, expect, it } from 'vitest';

import { makeWarehouseLocation } from '../services';
import {
  applyLocationDraft,
  draftFromLocations,
  locationToDraft,
  validateLocationDraft,
  type LocationDraftField,
} from '../services/locationProperties';
import type { WarehouseLocation } from '../types';

function loc(overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  const base = makeWarehouseLocation('wh', { code: 'A-01', barcode: 'A-01', column: 0, row: 0, level: 0 });
  return { ...base, ...overrides };
}

const touched = (...fields: LocationDraftField[]) => new Set<LocationDraftField>(fields);

describe('validateLocationDraft', () => {
  it('flags negative capacity', () => {
    const draft = { ...locationToDraft(loc()), maxPallets: -1 };
    expect(validateLocationDraft(draft).maxPallets).toMatch(/negative/i);
  });

  it('flags max stock below min stock', () => {
    const draft = { ...locationToDraft(loc()), minStock: 10, maxStock: 5 };
    expect(validateLocationDraft(draft).maxStock).toMatch(/≥ min/);
  });

  it('flags a type that is both allowed and restricted', () => {
    const draft = {
      ...locationToDraft(loc()),
      allowedMaterialTypes: ['RAW', 'FINISHED'],
      restrictedMaterialTypes: ['FINISHED'],
    };
    const errors = validateLocationDraft(draft);
    expect(errors.allowedMaterialTypes).toMatch(/FINISHED/);
    expect(errors.restrictedMaterialTypes).toBeTruthy();
  });

  it('passes a clean draft', () => {
    expect(validateLocationDraft(locationToDraft(loc()))).toEqual({});
  });
});

describe('applyLocationDraft', () => {
  it('applies only touched fields and merges nested objects', () => {
    const original = loc({
      capacity: { maxPallets: 1, maxUnits: 100, maxWeight: 500, maxVolume: 2 },
    });
    const draft = { ...locationToDraft(original), maxPallets: 8, maxUnits: 999 };

    // Only maxPallets is touched → maxUnits (and the rest of capacity) stays.
    const next = applyLocationDraft(original, draft, touched('maxPallets'));
    expect(next.capacity.maxPallets).toBe(8);
    expect(next.capacity.maxUnits).toBe(100);
  });

  it('leaves a location untouched when nothing is applied', () => {
    const original = loc();
    const next = applyLocationDraft(original, locationToDraft(original), touched());
    expect(next.code).toBe(original.code);
    expect(next.capacity).toEqual(original.capacity);
  });

  it('applies reservation only when its fields are touched', () => {
    const original = loc();
    const draft = { ...locationToDraft(original), isReserved: true, reservationReference: 'ORD-9' };
    const next = applyLocationDraft(original, draft, touched('isReserved', 'reservationReference'));
    expect(next.reservation).toEqual({ isReserved: true, reference: 'ORD-9' });
  });
});

describe('draftFromLocations (bulk)', () => {
  it('keeps shared values and neutralises differing ones', () => {
    const a = loc({ type: 'RACK', enabled: true });
    const b = loc({ type: 'FLOOR', enabled: true });
    const draft = draftFromLocations([a, b]);
    // type differs → neutral '', enabled shared → true.
    expect(draft.type).toBe('');
    expect(draft.enabled).toBe(true);
  });
});
