import { Car, Truck } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { FleetVehicle } from '../api';

/**
 * Pick a vehicle by tapping it.
 *
 * A dropdown is the wrong control for ten things: it hides them behind a tap,
 * and the labels a driver recognises ("Truck 1", "Office Eeco") are exactly
 * what a closed dropdown does not show. The fleet is small enough to lay out
 * in full, so it is.
 */
export function VehiclePicker({
  vehicles,
  value,
  onChange,
  disabled,
}: {
  vehicles: FleetVehicle[];
  value: number | null;
  onChange: (vehicle: FleetVehicle) => void;
  disabled?: boolean;
}) {
  if (!vehicles.length) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No vehicles on the register yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {vehicles.map((vehicle) => {
        const selected = vehicle.id === value;
        const Icon = vehicle.category === 'TRUCK' || vehicle.category === 'TEMPO' ? Truck : Car;
        return (
          <button
            key={vehicle.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(vehicle)}
            className={cn(
              'flex min-h-[64px] flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'bg-card hover:border-primary/40 hover:bg-muted/50',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {vehicle.vehicle_number}
            </span>
            <span className="text-xs text-muted-foreground">
              {vehicle.nickname || vehicle.category_label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
