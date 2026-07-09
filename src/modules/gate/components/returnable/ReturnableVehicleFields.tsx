import { Truck, User } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';

import { DriverSelect } from '../DriverSelect';
import { TransporterSelect } from '../TransporterSelect';
import { VehicleSelect } from '../VehicleSelect';
import type { ReturnableVehicleFormData } from './returnableVehicleForm';

interface ReturnableVehicleFieldsProps {
  value: ReturnableVehicleFormData;
  onChange: (next: ReturnableVehicleFormData) => void;
  errors?: Partial<Record<keyof ReturnableVehicleFormData, string>>;
  /** "Outgoing Vehicle" at gate out, "Returning Vehicle" at gate in. */
  title?: string;
  description?: string;
}

/**
 * Vehicle + driver capture for both gate stages, built on the same select-or-create
 * typeaheads the rest of the gate uses. The returning vehicle is captured
 * independently of the outgoing one — vendors routinely send their own.
 */
export function ReturnableVehicleFields({
  value,
  onChange,
  errors = {},
  title = 'Vehicle Details',
  description,
}: ReturnableVehicleFieldsProps) {
  const patch = (next: Partial<ReturnableVehicleFormData>) => onChange({ ...value, ...next });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" />
          {title}
        </CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <VehicleSelect
          label="Vehicle Number"
          required
          value={value.vehicleNumber}
          error={errors.vehicleNumber}
          onChange={(vehicle) =>
            patch({
              vehicleId: vehicle.vehicleId,
              vehicleNumber: vehicle.vehicleNumber,
              transporterId: vehicle.transporterId,
              transporterName: vehicle.transporterName,
            })
          }
        />

        <TransporterSelect
          label="Transporter"
          value={value.transporterName}
          onChange={(transporterName) => patch({ transporterName })}
          onTransporterSelect={(transporter) => patch({ transporterId: transporter?.id ?? 0 })}
        />

        <DriverSelect
          label="Driver"
          required
          value={value.driverName}
          error={errors.driverName}
          onChange={(driver) =>
            patch({
              driverId: driver.driverId,
              driverName: driver.driverName,
              driverMobile: driver.mobileNumber,
            })
          }
        />

        <div className="space-y-2">
          <Label htmlFor="driver-mobile">Driver Mobile</Label>
          <Input
            id="driver-mobile"
            value={value.driverMobile}
            onChange={(event) => patch({ driverMobile: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="security-name" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Security Guard Name
          </Label>
          <Input
            id="security-name"
            value={value.securityName}
            onChange={(event) => patch({ securityName: event.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
