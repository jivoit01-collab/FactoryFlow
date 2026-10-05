import { describe, expect, it } from 'vitest';

import {
  capacityKgOf,
  EMPTY_TRUCK_FREIGHT,
  quoteTruckFreight,
  type TruckFreightDraft,
  truckFreightProblem,
} from '../components/freight-approval/truckFreight';
import type { FreightBenchmarkTable, FreightSlab } from '../types/freightBenchmark.types';

const slab = (id: number, label: string, above: number, upTo: number): FreightSlab => ({
  id,
  label,
  above_kg: above,
  up_to_kg: upTo,
  sort_order: id,
  is_active: true,
  destination_count: 1,
});

const TABLE: FreightBenchmarkTable = {
  slabs: [
    slab(1, '5 MT', 0, 5000),
    slab(2, '10 MT', 5000, 10000),
    slab(3, '15 MT', 10000, 15000),
    slab(12, '5,001-8,000 kg', 5000, 8000),
  ],
  destinations: [
    {
      id: 7,
      state: 'PUNJAB',
      district: 'LUDHIANA',
      name: 'KHANNA',
      pin_code: '141401',
      distance_km: 213,
      remarks: '',
      is_active: true,
      updated_at: '',
      updated_by_name: '',
      rates: [
        { slab: 2, basis: 'PER_TRIP', amount: 13500 },
        { slab: 3, basis: 'PER_TRIP', amount: 20250 },
      ],
    },
    {
      id: 8,
      state: 'DELHI NCR',
      district: '',
      name: 'DELHI',
      pin_code: '',
      distance_km: null,
      remarks: '',
      is_active: true,
      updated_at: '',
      updated_by_name: '',
      rates: [{ slab: 12, basis: 'PER_KG', amount: 1.2 }],
    },
  ],
};

const draft = (patch: Partial<TruckFreightDraft>): TruckFreightDraft => ({
  ...EMPTY_TRUCK_FREIGHT,
  touched: true,
  ...patch,
});

describe('quoteTruckFreight', () => {
  it('takes the slab from the capacity until one is picked', () => {
    const byCapacity = quoteTruckFreight(TABLE, draft({ destinationId: 7 }), 9000, null);
    expect(byCapacity.slab?.label).toBe('10 MT');
    expect(byCapacity.benchmark).toBe(13500);

    const picked = quoteTruckFreight(TABLE, draft({ destinationId: 7, slabId: 3 }), 9000, null);
    expect(picked.slab?.label).toBe('15 MT');
    expect(picked.suggestedSlab?.label).toBe('10 MT');
    expect(picked.benchmark).toBe(20250);
  });

  it('multiplies a per-kg rate by the bills, and by the capacity only without them', () => {
    const d = draft({ destinationId: 8 });
    expect(quoteTruckFreight(TABLE, d, 7000, 6400).benchmark).toBe(7680);
    expect(quoteTruckFreight(TABLE, d, 7000, null).benchmark).toBe(8400);
  });

  it('needs approval over the benchmark, or with no benchmark at all', () => {
    const at = quoteTruckFreight(TABLE, draft({ destinationId: 7, actual: '13500' }), 9000, null);
    expect(at.needsApproval).toBe(false);
    const over = quoteTruckFreight(TABLE, draft({ destinationId: 7, actual: '13501' }), 9000, null);
    expect(over.needsApproval).toBe(true);
    const none = quoteTruckFreight(
      TABLE,
      draft({ destinationId: 7, slabId: 1, actual: '5000' }),
      9000,
      null,
    );
    expect(none.benchmark).toBeNull();
    expect(none.needsApproval).toBe(true);
  });

  it('has no suggestion for a truck bigger than every rated slab', () => {
    const quote = quoteTruckFreight(TABLE, draft({ destinationId: 7 }), 18000, null);
    expect(quote.suggestedSlab).toBeNull();
    expect(quote.slab).toBeNull();
  });
});

describe('truckFreightProblem', () => {
  it('asks for each missing piece in turn, then a reason when over', () => {
    const problem = (d: TruckFreightDraft) =>
      truckFreightProblem(d, quoteTruckFreight(TABLE, d, 9000, null));

    expect(problem(draft({}))).toMatch(/where the truck is going/);
    expect(problem(draft({ destinationId: 7, actual: '' }))).toMatch(/Enter the freight/);
    expect(problem(draft({ destinationId: 7, actual: '15000' }))).toMatch(/Say why/);
    expect(problem(draft({ destinationId: 7, actual: '15000', reason: 'Rush' }))).toBe('');
    expect(problem(draft({ destinationId: 7, actual: '12000' }))).toBe('');
  });
});

describe('capacityKgOf', () => {
  it('reads the vehicle master tonnes as kg, and nothing as nothing', () => {
    expect(capacityKgOf('9.00')).toBe(9000);
    expect(capacityKgOf('')).toBeNull();
    expect(capacityKgOf(null)).toBeNull();
  });
});
