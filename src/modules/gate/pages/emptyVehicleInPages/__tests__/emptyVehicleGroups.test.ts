import { describe, expect, it } from 'vitest';

import type { EmptyVehicleGateInEntry } from '@/modules/gate/api';

import { buildEmptyVehicleGroups } from '../emptyVehicleInDispatch';

function gateIn(
  overrides: Partial<{
    id: number;
    entry_no: string;
    vehicle: number | null;
    vehicle_number: string;
    arrival: number | null;
    arrival_no: string | null;
    company_name: string;
  }>,
): EmptyVehicleGateInEntry {
  return {
    id: 1,
    entry_no: 'EVGI-1',
    vehicle: 1,
    vehicle_number: 'HR67C4904',
    arrival: null,
    arrival_no: null,
    company_name: 'Jivo Mart',
    ...overrides,
  } as unknown as EmptyVehicleGateInEntry;
}

describe('buildEmptyVehicleGroups', () => {
  it('returns a single-entry group for one company gate-in', () => {
    const groups = buildEmptyVehicleGroups([gateIn({ id: 1, arrival: 5, arrival_no: 'ARV-1' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].subEntries).toHaveLength(1);
    expect(groups[0].vehicleNumber).toBe('HR67C4904');
    expect(groups[0].arrivalNo).toBe('ARV-1');
  });

  it('folds cross-company gate-ins on the same arrival into one group', () => {
    const groups = buildEmptyVehicleGroups([
      gateIn({ id: 1, arrival: 5, arrival_no: 'ARV-1', company_name: 'Jivo Mart' }),
      gateIn({ id: 2, arrival: 5, arrival_no: 'ARV-1', company_name: 'Jivo Oil' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].subEntries).toHaveLength(2);
    expect(groups[0].companies).toEqual(['Jivo Mart', 'Jivo Oil']);
  });

  it('keeps two distinct arrivals of the same vehicle apart', () => {
    const groups = buildEmptyVehicleGroups([
      gateIn({ id: 1, vehicle: 9, arrival: 5, arrival_no: 'ARV-1' }),
      gateIn({ id: 2, vehicle: 9, arrival: 6, arrival_no: 'ARV-2' }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('falls back to vehicle for arrival-less gate-ins', () => {
    const groups = buildEmptyVehicleGroups([
      gateIn({ id: 1, vehicle: 3, arrival: null }),
      gateIn({ id: 2, vehicle: 3, arrival: null }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].subEntries).toHaveLength(2);
  });
});
