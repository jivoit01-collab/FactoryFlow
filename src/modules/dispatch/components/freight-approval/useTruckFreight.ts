/**
 * The data behind a truck's freight fields: the benchmark table, the vehicle's
 * capacity, the truck's current freight, and the benchmark worked out from the
 * desk's draft. Shared by the linking sheet and the truck card's dialog, which
 * both need the quote for their own save as well as for the fields.
 */
import { useMemo } from 'react';

import { useVehicleById } from '@/modules/gate/api/vehicle/vehicle.queries';

import { type DispatchFreightApproval, useTruckFreights } from '../../api/freightApproval.api';
import { useFreightBenchmarks } from '../../api/freightBenchmark.api';
import { capacityKgOf, quoteTruckFreight, type TruckFreightDraft } from './truckFreight';

const RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const RUPEES_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const KG = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** "₹13,500", or "₹7,680.50" when there are paise to show. */
export function formatRupees(value: number): string {
  return Number.isInteger(value) ? RUPEES.format(value) : RUPEES_PAISE.format(value);
}

/** Everything the freight fields and their caller's save need, in one place. */
export function useTruckFreight(
  vehicleId: number | null,
  draft: TruckFreightDraft,
  loadKg: number | null,
) {
  const benchmarks = useFreightBenchmarks();
  const vehicle = useVehicleById(vehicleId);
  const trucks = useTruckFreights(vehicleId !== null);
  const capacityKg = capacityKgOf(vehicle.data?.capacity_ton);
  const current: DispatchFreightApproval | null =
    trucks.data?.find((row) => row.vehicle_id === vehicleId)?.approval ?? null;
  const quote = useMemo(
    () => quoteTruckFreight(benchmarks.data, draft, capacityKg, loadKg),
    [benchmarks.data, draft, capacityKg, loadKg],
  );
  return {
    table: benchmarks.data,
    isLoading: benchmarks.isLoading,
    isError: benchmarks.isError,
    capacityKg,
    current,
    quote,
  };
}

export type TruckFreight = ReturnType<typeof useTruckFreight>;
