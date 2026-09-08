import { describe, expect, it } from 'vitest';

import type { EmptyVehicleGateInEntry } from '@/modules/gate/api/emptyVehicleIn/emptyVehicleIn.api';

import { placeInsideTrucks, type VehiclePlate } from '../hooks/useGateBoard';

/** An empty road — three posts, nothing parked. */
function emptyRoad(): VehiclePlate[][] {
  return [[], [], []];
}

/** A truck the gate says is inside, at the stage its bills have reached. */
function inside(
  vehicleNumber: string,
  stage?: string,
  extras: Partial<EmptyVehicleGateInEntry> = {},
): EmptyVehicleGateInEntry {
  return {
    id: vehicleNumber.length,
    vehicle_number: vehicleNumber,
    pipeline_status: stage
      ? { stage, stage_label: stage, counts: { total: 2, rejected: 0 } }
      : null,
    ...extras,
  } as unknown as EmptyVehicleGateInEntry;
}

describe('placeInsideTrucks', () => {
  it('puts a truck the plans cannot place onto the road anyway', () => {
    // RJ10GB3459 is standing in the yard against yesterday's plan, so the
    // pipeline — which filters plans on the planned date — cannot see it.
    const road = placeInsideTrucks(emptyRoad(), [inside('RJ10GB3459', 'DOCKED')]);

    expect(road[0]).toHaveLength(0);
    expect(road[1]).toHaveLength(1);
    expect(road[1][0]).toMatchObject({
      vehicle_no: 'RJ10GB3459',
      count: 2,
      stage_label: 'DOCKED',
    });
    expect(road[2]).toHaveLength(0);
  });

  it('parks each truck at the post its own bills have reached', () => {
    const road = placeInsideTrucks(emptyRoad(), [
      inside('HR01AA1111', 'EMPTY_IN'),
      inside('HR02BB2222', 'READY_TO_DOCK'),
      inside('HR03CC3333', 'GATEPASS_PRINTED'),
    ]);

    expect(road[0].map((plate) => plate.vehicle_no)).toEqual(['HR01AA1111']);
    expect(road[1].map((plate) => plate.vehicle_no)).toEqual(['HR02BB2222', 'HR03CC3333']);
  });

  it('leaves a truck the plans already placed exactly where they put it', () => {
    const road = emptyRoad();
    road[0].push({ key: 'v:DL01LAR2914', vehicle_no: 'DL01LAR2914', count: 1 });

    // Same physical truck, reported by the gate in a different case.
    placeInsideTrucks(road, [inside('dl01lar2914', 'READY_TO_DOCK')]);

    expect(road[0]).toHaveLength(1);
    expect(road[1]).toHaveLength(0);
  });

  it('still shows a truck whose bills say nothing the road knows', () => {
    // No covers yet, or a rejected one: it is physically at the gate, which is
    // where a board that exists to show the yard has to draw it.
    const road = placeInsideTrucks(emptyRoad(), [
      inside('HR04DD4444'),
      inside('HR05EE5555', 'REJECTED'),
    ]);

    expect(road[0].map((plate) => plate.vehicle_no)).toEqual(['HR04DD4444', 'HR05EE5555']);
    expect(road[0][0]).toMatchObject({ count: 1, stage_label: 'Inside, not docked' });
  });

  it('skips a gate-in with no plate rather than parking a blank truck', () => {
    const road = placeInsideTrucks(emptyRoad(), [inside('  ', 'READY_TO_DOCK')]);

    expect(road.flat()).toHaveLength(0);
  });
});
