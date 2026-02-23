import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { Vehicle, VehicleName } from '../api/vehicle/vehicle.api';
import { useVehicleById, useVehicleNames } from '../api/vehicle/vehicle.queries';
import { CreateVehicleDialog } from './CreateVehicleDialog';

interface VehicleSelectProps {
  value?: string;
  onChange: (vehicle: {
    vehicleId: number;
    vehicleNumber: string;
    vehicleType: string;
    vehicleCapacity: string;
    transporterId: number;
    transporterName: string;
    transporterContactPerson: string;
    transporterMobile: string;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function VehicleSelect({
  value,
  onChange,
  placeholder = 'Select vehicle',
  disabled = false,
  error,
  label,
  required = false,
}: VehicleSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<Vehicle | null>(null);

  const { data: vehicleNames = [], isLoading } = useVehicleNames(isDropdownOpen && !disabled);
  const { data: vehicleDetails } = useVehicleById(selectedId, selectedId !== null);

  const prevVehicleDetailsRef = useRef(vehicleDetails);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync vehicle details when fetched and call onChange with mapped data
  const syncVehicleDetails = useCallback(() => {
    if (vehicleDetails && vehicleDetails !== prevVehicleDetailsRef.current) {
      prevVehicleDetailsRef.current = vehicleDetails;
      setSelectedVehicleDetails(vehicleDetails);
      const vehicleType = vehicleDetails.vehicle_type.name;
      onChangeRef.current({
        vehicleId: vehicleDetails.id,
        vehicleNumber: vehicleDetails.vehicle_number,
        vehicleType,
        vehicleCapacity: `${vehicleDetails.capacity_ton} Tons`,
        transporterId: vehicleDetails.transporter?.id || 0,
        transporterName: vehicleDetails.transporter?.name || '',
        transporterContactPerson: vehicleDetails.transporter?.contact_person || '',
        transporterMobile: vehicleDetails.transporter?.mobile_no || '',
      });
    }
  }, [vehicleDetails]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with fetched data is a valid pattern
    syncVehicleDetails();
  }, [syncVehicleDetails]);

  return (
    <SearchableSelect<VehicleName>
      value={value}
      items={vehicleNames}
      isLoading={isLoading}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="vehicle-select"
      getItemKey={(v) => v.id}
      getItemLabel={(v) => v.vehicle_number}
      loadingText="Loading vehicles..."
      emptyText="No vehicles available"
      notFoundText="No vehicles found"
      addNewLabel="Add New Vehicle"
      onOpenChange={setIsDropdownOpen}
      onSelectedKeyChange={(key) => {
        setSelectedId(key as number | null);
        if (!key) setSelectedVehicleDetails(null);
      }}
      onItemSelect={(vehicle) => {
        setSelectedId(vehicle.id);
      }}
      onClear={() => {
        setSelectedId(null);
        setSelectedVehicleDetails(null);
        onChange({
          vehicleId: 0,
          vehicleNumber: '',
          vehicleType: '',
          vehicleCapacity: '',
          transporterId: 0,
          transporterName: '',
          transporterContactPerson: '',
          transporterMobile: '',
        });
      }}
      renderPopoverContent={(selKey) =>
        selectedVehicleDetails ? (
          <div className="space-y-2">
            <div className="space-y-1.5 text-sm">
              <div>
                <span className="font-medium">Vehicle Number:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVehicleDetails.vehicle_number}
                </span>
              </div>
              <div>
                <span className="font-medium">Vehicle Type:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVehicleDetails.vehicle_type.name}
                </span>
              </div>
              <div>
                <span className="font-medium">Capacity:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVehicleDetails.capacity_ton} Tons
                </span>
              </div>
              {selectedVehicleDetails.transporter && (
                <div>
                  <span className="font-medium">Transporter:</span>{' '}
                  <span className="text-muted-foreground">
                    {selectedVehicleDetails.transporter.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : selKey ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading vehicle details...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please select a vehicle to view details.
          </div>
        )
      }
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <CreateVehicleDialog
          open={open}
          onOpenChange={onOpenChange}
          onSuccess={(vehicle) => {
            updateSelection(vehicle.id, vehicle.vehicle_number);
            setSelectedId(vehicle.id);
          }}
        />
      )}
    />
  );
}
