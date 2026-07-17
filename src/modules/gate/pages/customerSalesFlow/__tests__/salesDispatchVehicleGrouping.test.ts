import { describe, expect, it } from 'vitest';

import type { SalesDispatchDashboardEntry } from '@/modules/gate/api/salesDispatch/salesDispatch.api';

import { buildDockingVehicleGroups } from '../salesDispatchVehicleGrouping';

function docking(
  overrides: Partial<{
    id: number | string;
    entry_no: string;
    vehicle: number | null;
    vehicle_no: string;
    arrival: number | null;
    arrival_no: string | null;
    company_name: string;
    status: string;
  }>,
): SalesDispatchDashboardEntry {
  return {
    id: 1,
    entry_no: 'DOCK-1',
    vehicle: 1,
    vehicle_no: 'HR67C4904',
    arrival: null,
    arrival_no: null,
    company_name: 'Jivo Mart',
    status: 'DOCKED',
    ...overrides,
  } as unknown as SalesDispatchDashboardEntry;
}

function pending(
  overrides: Partial<{ id: string; vehicle: number | null; vehicle_no: string; company_name: string }>,
): SalesDispatchDashboardEntry {
  return {
    row_type: 'PENDING_BOOKING',
    id: 'pending-1',
    vehicle: 1,
    vehicle_no: 'HR67C4904',
    company_name: 'Jivo Oil',
    status: 'PENDING_DOCKING',
    ...overrides,
  } as unknown as SalesDispatchDashboardEntry;
}

describe('buildDockingVehicleGroups', () => {
  it('returns a single-entry group for one company docking', () => {
    const groups = buildDockingVehicleGroups([docking({ id: 1, arrival: 10, arrival_no: 'ARV-1' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].subEntries).toHaveLength(1);
    expect(groups[0].vehicleNo).toBe('HR67C4904');
    expect(groups[0].arrivalNo).toBe('ARV-1');
  });

  it('folds cross-company dockings on the same arrival into one group', () => {
    const groups = buildDockingVehicleGroups([
      docking({ id: 1, arrival: 10, arrival_no: 'ARV-1', company_name: 'Jivo Mart' }),
      docking({ id: 2, arrival: 10, arrival_no: 'ARV-1', company_name: 'Jivo Oil' }),
      docking({ id: 3, arrival: 10, arrival_no: 'ARV-1', company_name: 'Jivo Beverages' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].subEntries).toHaveLength(3);
    expect(groups[0].companies).toEqual(['Jivo Mart', 'Jivo Oil', 'Jivo Beverages']);
  });

  it('keeps a rejected/cancelled docking as its own row, not merged into the live arrival group', () => {
    const groups = buildDockingVehicleGroups([
      docking({ id: 1, arrival: 10, arrival_no: 'ARV-1', company_name: 'Jivo Oil', status: 'DOCKED' }),
      docking({ id: 2, arrival: 10, arrival_no: 'ARV-1', company_name: 'Jivo Mart', status: 'DOCKED' }),
      docking({ id: 3, arrival: 10, arrival_no: 'ARV-1', company_name: 'Jivo Beverages', status: 'REJECTED' }),
    ]);
    // Two groups: the live Oil+Mart pair, and the rejected Beverages docking alone.
    expect(groups).toHaveLength(2);
    const live = groups.find((g) => g.subEntries.length === 2);
    const discarded = groups.find((g) => g.subEntries.length === 1);
    expect(live?.companies).toEqual(['Jivo Oil', 'Jivo Mart']);
    expect(discarded?.subEntries[0].id).toBe(3);
    expect(discarded?.subEntries[0].status).toBe('REJECTED');
  });

  it('keeps two distinct arrivals of the same vehicle in separate groups', () => {
    const groups = buildDockingVehicleGroups([
      docking({ id: 1, vehicle: 5, arrival: 10, arrival_no: 'ARV-1' }),
      docking({ id: 2, vehicle: 5, arrival: 11, arrival_no: 'ARV-2' }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('joins an arrival-less pending booking to its vehicle’s arrival group', () => {
    const groups = buildDockingVehicleGroups([
      docking({ id: 1, vehicle: 7, arrival: 20, arrival_no: 'ARV-9' }),
      pending({ id: 'p1', vehicle: 7 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].subEntries).toHaveLength(2);
  });

  it('groups arrival-less in-flight rows by vehicle', () => {
    const groups = buildDockingVehicleGroups([
      docking({ id: 1, vehicle: 3, arrival: null, arrival_no: null }),
      docking({ id: 2, vehicle: 3, arrival: null, arrival_no: null }),
      docking({ id: 3, vehicle: 4, arrival: null, arrival_no: null }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].subEntries).toHaveLength(2);
    expect(groups[1].subEntries).toHaveLength(1);
  });

  it('keeps a vehicle’s past (dispatched) arrival-less trips as separate rows', () => {
    // The over-merge bug: several finished dispatches of one truck, none with an
    // arrival, must NOT collapse into one dropdown.
    const groups = buildDockingVehicleGroups([
      docking({ id: 1, vehicle: 3, arrival: null, arrival_no: null, status: 'DISPATCHED' }),
      docking({ id: 2, vehicle: 3, arrival: null, arrival_no: null, status: 'DISPATCHED' }),
      docking({ id: 3, vehicle: 3, arrival: null, arrival_no: null, status: 'DISPATCHED' }),
    ]);
    expect(groups).toHaveLength(3);
    expect(groups.every((group) => group.subEntries.length === 1)).toBe(true);
  });

  it('does not fold a dispatched arrival-less row into a live arrival of the same vehicle', () => {
    const groups = buildDockingVehicleGroups([
      docking({ id: 1, vehicle: 3, arrival: 10, arrival_no: 'ARV-1', status: 'DOCKED' }),
      docking({ id: 2, vehicle: 3, arrival: null, arrival_no: null, status: 'DISPATCHED' }),
    ]);
    expect(groups).toHaveLength(2);
  });
});
