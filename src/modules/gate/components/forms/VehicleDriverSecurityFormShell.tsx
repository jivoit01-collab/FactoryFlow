import { Camera, ChevronDown, HelpCircle, Shield, Truck } from 'lucide-react';
import { useState } from 'react';

import { ID_PROOF_TYPES } from '@/config/constants';
import { env } from '@/config/env.config';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { CreateDriverDialog } from '../CreateDriverDialog';
import { CreateTransporterDialog } from '../CreateTransporterDialog';
import { CreateVehicleDialog } from '../CreateVehicleDialog';
import { DriverSelect } from '../DriverSelect';
import { StepFooter } from '../StepFooter';
import { StepHeader } from '../StepHeader';
import { VehicleSelect } from '../VehicleSelect';
import type { DriverSelection, VehicleSelection } from './VehicleDriverFormShell';

// Get the server base URL for media files (without /api/v1)
const getMediaBaseUrl = () => {
  try {
    const url = new URL(env.apiBaseUrl);
    return url.origin;
  } catch {
    return env.apiBaseUrl.replace(/\/api\/v1\/?$/, '');
  }
};

// Format time for display (HH:MM -> h:MM AM/PM)
const formatTime = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour12 = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
};

// Read-only label/value row used inside the "?" detail popovers
function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm break-words">{value || '—'}</span>
    </div>
  );
}

/**
 * Combined form data for the merged "Vehicle, Driver & Security" page.
 * Folds together the previous Step 1 (vehicle/driver) and Step 2 (security check)
 * field sets into a single payload.
 */
export interface VehicleDriverSecurityFormData {
  // Vehicle
  vehicleId: number;
  vehicleNumber: string;
  vehicleType: string;
  transporterId: number;
  transporterName: string;
  transporterContactPerson: string;
  transporterMobile: string;
  vehicleCapacity: string;
  gpsId: string;
  // Driver
  driverId: number;
  driverName: string;
  mobileNumber: string;
  drivingLicenseNumber: string;
  idProofType: string;
  idProofNumber: string;
  driverPhoto: string | null;
  // Security check
  vehicleCondition: string;
  fireExtinguisherAvailable: string;
  tyreCondition: string;
  sealNumberBefore: string;
  sealNumberAfter: string;
  alcoholTestRequired: string;
  entryTime: string;
  inspectedByName: string;
  // Shared
  remarks: string;
}

export interface VehicleDriverSecurityFormShellProps {
  // Form data (controlled component)
  formData: VehicleDriverSecurityFormData;
  onFormChange: (field: string, value: string) => void;

  // State flags
  isReadOnly: boolean;
  isLoading: boolean;
  isSaving: boolean;

  // Errors
  apiErrors: Record<string, string>;

  // Step configuration
  currentStep: number;
  totalSteps: number;

  // Callbacks
  onVehicleSelect: (vehicle: VehicleSelection) => void;
  onDriverSelect: (driver: DriverSelection) => void;
  onCancel: () => void;
  onNext: () => void;
  onUpdate?: () => void;

  // Edit mode configuration
  isEditMode: boolean;
  canUpdate: boolean;
  updateMode: boolean;

  // Server error message (5xx errors)
  serverError?: string | null;

  // Custom content (optional)
  headerTitle?: string;
  topContent?: React.ReactNode;
  children?: React.ReactNode;
}

export function VehicleDriverSecurityFormShell({
  formData,
  onFormChange,
  isReadOnly,
  isLoading,
  isSaving,
  apiErrors,
  currentStep,
  totalSteps,
  onVehicleSelect,
  onDriverSelect,
  onCancel,
  onNext,
  onUpdate,
  isEditMode,
  canUpdate,
  updateMode,
  serverError,
  headerTitle = 'Material Inward',
  topContent,
  children,
}: VehicleDriverSecurityFormShellProps) {
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [isEditTransporterOpen, setIsEditTransporterOpen] = useState(false);

  // Security checks live behind a toggle to keep the page compact.
  const [showSecurityChecks, setShowSecurityChecks] = useState(false);

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const idProofLabel =
    ID_PROOF_TYPES.find((type) => type.value === formData.idProofType)?.label ||
    formData.idProofType;

  // Force the security section open when it has validation errors (otherwise the
  // user can't see/fix the offending fields).
  const hasSecurityError = Boolean(
    apiErrors.vehicleCondition ||
      apiErrors.vehicle_condition_ok ||
      apiErrors.fireExtinguisherAvailable ||
      apiErrors.fire_extinguisher_available ||
      apiErrors.tyreCondition ||
      apiErrors.tyre_condition_ok ||
      apiErrors.sealNumberBefore ||
      apiErrors.seal_no_before ||
      apiErrors.seal_no_after,
  );
  const securityVisible = showSecurityChecks || hasSecurityError;

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={headerTitle}
        error={serverError || apiErrors.general || null}
      />

      {topContent}

      <div className="space-y-6">
        {/* Primary entry details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Gate Entry Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Vehicle Number (with "?" popover for linked vehicle details) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="vehicle-select">
                    Vehicle Number <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        aria-label="Show vehicle details"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 space-y-3">
                      <p className="text-sm font-semibold">Vehicle Details</p>
                      {formData.vehicleId === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Select a vehicle to see its details.
                        </p>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <DetailRow label="Transporter" value={formData.transporterName} />
                            {!!formData.transporterName && !isReadOnly && (
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="px-0 h-auto"
                                onClick={() => setIsEditTransporterOpen(true)}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                          <DetailRow
                            label="Contact Person"
                            value={formData.transporterContactPerson}
                          />
                          <DetailRow label="Transporter Mobile" value={formData.transporterMobile} />
                          <DetailRow label="Vehicle Type" value={formData.vehicleType} />
                          <DetailRow label="Vehicle Capacity" value={formData.vehicleCapacity} />
                          <div className="space-y-1">
                            <Label htmlFor="gpsId" className="text-xs text-muted-foreground">
                              GPS ID (if available)
                            </Label>
                            <Input
                              id="gpsId"
                              placeholder="GPS tracking ID"
                              value={formData.gpsId}
                              onChange={(e) => onFormChange('gpsId', e.target.value)}
                              disabled={isReadOnly || isSaving}
                            />
                          </div>
                        </>
                      )}
                    </PopoverContent>
                  </Popover>
                  {formData.vehicleId != 0 && !isReadOnly && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="px-0 h-auto"
                      onClick={() => setIsEditVehicleOpen(true)}
                    >
                      Edit Vehicle
                    </Button>
                  )}
                </div>
                <VehicleSelect
                  value={formData.vehicleNumber}
                  onChange={(vehicle) => {
                    if (isReadOnly) return;
                    onVehicleSelect({
                      vehicleId: vehicle.vehicleId,
                      vehicleNumber: vehicle.vehicleNumber,
                      vehicleType: vehicle.vehicleType,
                      vehicleCapacity: vehicle.vehicleCapacity,
                      transporterId: vehicle.transporterId,
                      transporterName: vehicle.transporterName,
                      transporterContactPerson: vehicle.transporterContactPerson,
                      transporterMobile: vehicle.transporterMobile,
                    });
                  }}
                  placeholder="Enter vehicle number"
                  required
                  error={apiErrors.vehicle}
                  disabled={isReadOnly}
                />
              </div>

              {/* Driver Name (with "?" popover for linked driver details) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="driver-select">
                    Driver Name <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        aria-label="Show driver details"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 space-y-3">
                      <p className="text-sm font-semibold">Driver Details</p>
                      {formData.driverId === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Select a driver to see its details.
                        </p>
                      ) : (
                        <>
                          <DetailRow label="Mobile Number" value={formData.mobileNumber} />
                          <DetailRow
                            label="Driving License Number"
                            value={formData.drivingLicenseNumber}
                          />
                          <DetailRow label="ID Proof Type" value={idProofLabel} />
                          <DetailRow label="ID Proof Number" value={formData.idProofNumber} />
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Driver Photo
                            </span>
                            {formData.driverPhoto ? (
                              <div className="relative w-full h-32 border rounded-md overflow-hidden bg-muted">
                                <img
                                  src={
                                    formData.driverPhoto.startsWith('http')
                                      ? formData.driverPhoto
                                      : `${getMediaBaseUrl()}${formData.driverPhoto}`
                                  }
                                  alt="Driver photo"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-24 border rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                                <div className="text-center">
                                  <Camera className="h-8 w-8 mx-auto mb-1 opacity-50" />
                                  <p className="text-xs">No photo available</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </PopoverContent>
                  </Popover>
                  {formData.driverId != 0 && !isReadOnly && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="px-0 h-auto"
                      onClick={() => setIsEditDriverOpen(true)}
                    >
                      Edit Driver
                    </Button>
                  )}
                </div>
                <DriverSelect
                  value={formData.driverName}
                  onChange={(driver) => {
                    if (isReadOnly) return;
                    onDriverSelect({
                      driverId: driver.driverId,
                      driverName: driver.driverName,
                      mobileNumber: driver.mobileNumber,
                      drivingLicenseNumber: driver.drivingLicenseNumber,
                      idProofType: driver.idProofType,
                      idProofNumber: driver.idProofNumber,
                      driverPhoto: driver.driverPhoto,
                    });
                  }}
                  placeholder="Enter driver name or license number"
                  required
                  error={apiErrors.driver}
                  disabled={isReadOnly || isSaving}
                />
              </div>

              {/* Entry Time + Security Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="entryTime">
                    Entry Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="entryTime"
                    type="time"
                    value={formData.entryTime}
                    onChange={(e) => onFormChange('entryTime', e.target.value)}
                    disabled={isReadOnly || isSaving}
                  />
                  {formData.entryTime && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {formatTime(formData.entryTime)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspectedByName">
                    Security Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inspectedByName"
                    placeholder="Enter security / inspector name"
                    value={formData.inspectedByName}
                    onChange={(e) => onFormChange('inspectedByName', e.target.value)}
                    disabled={isReadOnly || isSaving}
                    className={cn(
                      apiErrors.inspectedByName || apiErrors.inspected_by_name
                        ? 'border-destructive'
                        : '',
                    )}
                  />
                  {apiErrors.inspectedByName && (
                    <p className="text-sm text-destructive">{apiErrors.inspectedByName}</p>
                  )}
                  {apiErrors.inspected_by_name && (
                    <p className="text-sm text-destructive">{apiErrors.inspected_by_name}</p>
                  )}
                </div>
              </div>

              {/* Remarks (last field in this section) */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <textarea
                  id="remarks"
                  rows={2}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    (apiErrors.remarks || apiErrors.entry_no) && 'border-destructive',
                    isReadOnly && 'cursor-not-allowed opacity-50',
                  )}
                  placeholder="Enter any additional remarks or notes..."
                  value={formData.remarks}
                  onChange={(e) => onFormChange('remarks', e.target.value)}
                  disabled={isReadOnly || isSaving}
                />
                {apiErrors.remarks && (
                  <p className="text-sm text-destructive">{apiErrors.remarks}</p>
                )}
                {apiErrors.entry_no && (
                  <p className="text-sm text-destructive">{apiErrors.entry_no}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security checks toggle */}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={securityVisible}
            onClick={() => setShowSecurityChecks((prev) => !prev)}
          >
            <Shield className="h-4 w-4 mr-2" />
            {securityVisible ? 'Hide Security Checks' : 'Add Security Checks'}
            <ChevronDown
              className={cn('h-4 w-4 ml-2 transition-transform', securityVisible && 'rotate-180')}
            />
          </Button>
        </div>

        {/* Security Checks (revealed via the toggle above) */}
        {securityVisible && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vehicleCondition">Vehicle Condition</Label>
                  <select
                    id="vehicleCondition"
                    className={cn(
                      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      apiErrors.vehicleCondition && 'border-destructive',
                    )}
                    value={formData.vehicleCondition}
                    onChange={(e) => onFormChange('vehicleCondition', e.target.value)}
                    disabled={isReadOnly || isSaving}
                  >
                    <option value="">Select condition</option>
                    <option value="Empty">Empty</option>
                    <option value="Loaded">Loaded</option>
                    <option value="Partially Loaded">Partially Loaded</option>
                  </select>
                  {apiErrors.vehicleCondition && (
                    <p className="text-sm text-destructive">{apiErrors.vehicleCondition}</p>
                  )}
                  {apiErrors.vehicle_condition_ok && (
                    <p className="text-sm text-destructive">{apiErrors.vehicle_condition_ok}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fireExtinguisherAvailable">Fire Extinguisher Available</Label>
                  <select
                    id="fireExtinguisherAvailable"
                    className={cn(
                      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      apiErrors.fireExtinguisherAvailable && 'border-destructive',
                    )}
                    value={formData.fireExtinguisherAvailable}
                    onChange={(e) => onFormChange('fireExtinguisherAvailable', e.target.value)}
                    disabled={isReadOnly || isSaving}
                  >
                    <option value="">Select option</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {apiErrors.fireExtinguisherAvailable && (
                    <p className="text-sm text-destructive">
                      {apiErrors.fireExtinguisherAvailable}
                    </p>
                  )}
                  {apiErrors.fire_extinguisher_available && (
                    <p className="text-sm text-destructive">
                      {apiErrors.fire_extinguisher_available}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tyreCondition">Tyre Condition</Label>
                  <select
                    id="tyreCondition"
                    className={cn(
                      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      apiErrors.tyreCondition && 'border-destructive',
                    )}
                    value={formData.tyreCondition}
                    onChange={(e) => onFormChange('tyreCondition', e.target.value)}
                    disabled={isReadOnly || isSaving}
                  >
                    <option value="">Select condition</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Needs Replacement">Needs Replacement</option>
                  </select>
                  {apiErrors.tyreCondition && (
                    <p className="text-sm text-destructive">{apiErrors.tyreCondition}</p>
                  )}
                  {apiErrors.tyre_condition_ok && (
                    <p className="text-sm text-destructive">{apiErrors.tyre_condition_ok}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sealNumberBefore">Seal Number (Before)</Label>
                  <Input
                    id="sealNumberBefore"
                    placeholder="Enter seal number"
                    value={formData.sealNumberBefore}
                    onChange={(e) => onFormChange('sealNumberBefore', e.target.value)}
                    disabled={isReadOnly || isSaving}
                    className={cn(
                      apiErrors.sealNumberBefore || apiErrors.seal_no_before
                        ? 'border-destructive'
                        : '',
                    )}
                  />
                  {apiErrors.sealNumberBefore && (
                    <p className="text-sm text-destructive">{apiErrors.sealNumberBefore}</p>
                  )}
                  {apiErrors.seal_no_before && (
                    <p className="text-sm text-destructive">{apiErrors.seal_no_before}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sealNumberAfter">Seal Number (After)</Label>
                  <Input
                    id="sealNumberAfter"
                    placeholder="Enter seal number after inspection"
                    value={formData.sealNumberAfter}
                    onChange={(e) => onFormChange('sealNumberAfter', e.target.value)}
                    disabled={isReadOnly || isSaving}
                    className={cn(apiErrors.seal_no_after ? 'border-destructive' : '')}
                  />
                  {apiErrors.seal_no_after && (
                    <p className="text-sm text-destructive">{apiErrors.seal_no_after}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alcoholTestRequired">Alcohol Test Required</Label>
                  <select
                    id="alcoholTestRequired"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.alcoholTestRequired}
                    onChange={(e) => onFormChange('alcoholTestRequired', e.target.value)}
                    disabled={isReadOnly || isSaving}
                  >
                    <option value="Not Required">Not Required</option>
                    <option value="Required">Required</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateDriverDialog
        open={isEditDriverOpen}
        onOpenChange={setIsEditDriverOpen}
        initialData={{
          id: formData.driverId,
          name: formData.driverName,
          mobile_no: formData.mobileNumber,
          license_no: formData.drivingLicenseNumber,
          id_proof_type: formData.idProofType,
          id_proof_number: formData.idProofNumber,
          photo: formData.driverPhoto,
        }}
        onSuccess={(driver) => {
          onDriverSelect({
            driverId: driver.id,
            driverName: driver.name,
            mobileNumber: driver.mobile_no,
            drivingLicenseNumber: driver.license_no,
            idProofType: driver.id_proof_type,
            idProofNumber: driver.id_proof_number,
            driverPhoto: driver.photo,
          });
        }}
      />

      <CreateVehicleDialog
        open={isEditVehicleOpen}
        onOpenChange={setIsEditVehicleOpen}
        initialData={{
          id: formData.vehicleId,
        }}
        onSuccess={(vehicle) => {
          onVehicleSelect({
            vehicleId: vehicle.id,
            vehicleNumber: vehicle.vehicle_number,
            vehicleType: vehicle.vehicle_type?.name ?? '',
            vehicleCapacity: vehicle.capacity_ton ? `${vehicle.capacity_ton} Tons` : '',
            transporterId: vehicle.transporter?.id ?? 0,
            transporterName: vehicle.transporter?.name ?? '',
            transporterContactPerson: vehicle.transporter?.contact_person ?? '',
            transporterMobile: vehicle.transporter?.mobile_no ?? '',
          });
        }}
      />

      <CreateTransporterDialog
        open={isEditTransporterOpen}
        onOpenChange={setIsEditTransporterOpen}
        initialData={{ id: formData.transporterId }}
        onSuccess={(transporter) => {
          onVehicleSelect({
            vehicleId: formData.vehicleId,
            vehicleNumber: formData.vehicleNumber,
            vehicleType: formData.vehicleType,
            vehicleCapacity: formData.vehicleCapacity,
            transporterId: transporter.id,
            transporterName: transporter.name,
            transporterContactPerson: transporter.contact_person,
            transporterMobile: transporter.mobile_no,
          });
        }}
      />

      {children}

      <StepFooter
        onCancel={onCancel}
        onNext={onNext}
        showPrevious={false}
        showUpdate={isEditMode && canUpdate && !updateMode && !!onUpdate}
        onUpdate={onUpdate}
        isSaving={isSaving}
        isEditMode={isEditMode}
        isUpdateMode={updateMode}
      />
    </div>
  );
}
