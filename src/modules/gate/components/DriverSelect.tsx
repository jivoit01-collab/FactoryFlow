import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { DriverName } from '../api/driver/driver.api';
import { useDriverById, useDriverNames } from '../api/driver/driver.queries';
import { CreateDriverDialog } from './CreateDriverDialog';

interface DriverSelectProps {
  value?: string;
  onChange: (driver: {
    driverId: number;
    driverName: string;
    mobileNumber: string;
    drivingLicenseNumber: string;
    idProofType: string;
    idProofNumber: string;
    driverPhoto: string | null;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function DriverSelect({
  value,
  onChange,
  placeholder = 'Select driver',
  disabled = false,
  error,
  label,
  required = false,
}: DriverSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: driverNames = [], isLoading } = useDriverNames(isDropdownOpen && !disabled);
  const { data: driverDetails } = useDriverById(selectedId, selectedId !== null);

  const prevDriverDetailsRef = useRef(driverDetails);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Push driver details to parent when fetched
  useEffect(() => {
    if (driverDetails && driverDetails !== prevDriverDetailsRef.current) {
      prevDriverDetailsRef.current = driverDetails;
      onChangeRef.current({
        driverId: driverDetails.id,
        driverName: driverDetails.name,
        mobileNumber: driverDetails.mobile_no,
        drivingLicenseNumber: driverDetails.license_no,
        idProofType: driverDetails.id_proof_type,
        idProofNumber: driverDetails.id_proof_number,
        driverPhoto: driverDetails.photo,
      });
    }
  }, [driverDetails]);

  return (
    <SearchableSelect<DriverName>
      value={value}
      items={driverNames}
      isLoading={isLoading}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="driver-select"
      getItemKey={(d) => d.id}
      getItemLabel={(d) => d.name}
      loadingText="Loading drivers..."
      emptyText="No drivers available"
      notFoundText="No drivers found"
      addNewLabel="Add New Driver"
      onOpenChange={setIsDropdownOpen}
      onSelectedKeyChange={(key) => {
        setSelectedId(key as number | null);
        if (!key) prevDriverDetailsRef.current = undefined;
      }}
      onItemSelect={(driver) => {
        setSelectedId(driver.id);
      }}
      onClear={() => {
        setSelectedId(null);
        prevDriverDetailsRef.current = undefined;
        onChange({
          driverId: 0,
          driverName: '',
          mobileNumber: '',
          drivingLicenseNumber: '',
          idProofType: '',
          idProofNumber: '',
          driverPhoto: null,
        });
      }}
      renderPopoverContent={(selKey) =>
        driverDetails ? (
          <div className="space-y-2">
            <div className="space-y-1.5 text-sm">
              <div>
                <span className="font-medium">Name:</span>{' '}
                <span className="text-muted-foreground">{driverDetails.name}</span>
              </div>
              <div>
                <span className="font-medium">Mobile Number:</span>{' '}
                <span className="text-muted-foreground">{driverDetails.mobile_no}</span>
              </div>
              <div>
                <span className="font-medium">License Number:</span>{' '}
                <span className="text-muted-foreground">{driverDetails.license_no}</span>
              </div>
              <div>
                <span className="font-medium">ID Proof Type:</span>{' '}
                <span className="text-muted-foreground">{driverDetails.id_proof_type}</span>
              </div>
              <div>
                <span className="font-medium">ID Proof Number:</span>{' '}
                <span className="text-muted-foreground">{driverDetails.id_proof_number}</span>
              </div>
            </div>
          </div>
        ) : selKey ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading driver details...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please select a driver to view details.
          </div>
        )
      }
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <CreateDriverDialog
          open={open}
          onOpenChange={onOpenChange}
          onSuccess={(driver) => {
            updateSelection(driver.id, driver.name);
            setSelectedId(driver.id);
          }}
        />
      )}
    />
  );
}
