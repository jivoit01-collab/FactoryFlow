/**
 * The truck a lot travels on, picked from the app's own vehicles (the gate's
 * picker), not typed: the same trucks the gate already knows, and a new one is
 * added there once for both.
 *
 * There is no transporter to pick: a vehicle here belongs to its transporter,
 * so the lot takes the transporter on the vehicle's record. The lot still
 * keeps both as text, as EXIM did, for the Shortages page and the Vehicle
 * Report, and so a number copied from EXIM that the vehicle list lacks still
 * shows.
 */
import { VehicleSelect } from '@/modules/gate/components';

export function TruckFields({
  vehicle,
  onVehicleChange,
  error,
}: {
  vehicle: string;
  /** The vehicle picked and the transporter on its record ('' when none). */
  onVehicleChange: (vehicleNumber: string, transporterName: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <VehicleSelect
        label="Vehicle number"
        value={vehicle}
        defaultDisplayText={vehicle || undefined}
        placeholder="Search or add a vehicle"
        error={error}
        onChange={(picked) => onVehicleChange(picked.vehicleNumber, picked.transporterName)}
      />
    </div>
  );
}
