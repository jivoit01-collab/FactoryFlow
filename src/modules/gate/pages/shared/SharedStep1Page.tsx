import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ENTRY_STATUS } from '@/config/constants';
import type { ApiError } from '@/core/api/types';
import { getServerErrorMessage, isServerError as checkServerError } from '@/shared/utils';

import {
  useCreateVehicleEntry,
  useUpdateVehicleEntry,
  useVehicleEntry,
} from '../../api/vehicle/vehicleEntry.queries';
import {
  type DriverSelection,
  type VehicleDriverFormData,
  VehicleDriverFormShell,
  type VehicleSelection,
} from '../../components';
import type { EntryFlowConfig } from '../../constants/entryFlowConfig';

interface SharedStep1PageProps {
  config: EntryFlowConfig;
}

export default function SharedStep1Page({ config }: SharedStep1PageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId } = useParams<{ entryId?: string }>();
  const isEditMode = !!entryId;
  const createVehicleEntry = useCreateVehicleEntry();
  const updateVehicleEntry = useUpdateVehicleEntry();
  const {
    data: entryData,
    isLoading: isLoadingEntry,
    error: entryError,
  } = useVehicleEntry(entryId ? parseInt(entryId) : null);

  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(entryError);

  // State to track if Update button has been clicked (enables editing)
  const [updateMode, _setUpdateMode] = useState(false);

  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<VehicleDriverFormData>({
    vehicleId: 0,
    vehicleNumber: '',
    vehicleType: '',
    transporterName: '',
    transporterContactPerson: '',
    transporterMobile: '',
    vehicleCapacity: '',
    gpsId: '',
    driverId: 0,
    driverName: '',
    mobileNumber: '',
    drivingLicenseNumber: '',
    idProofType: '',
    idProofNumber: '',
    driverPhoto: null,
    remarks: '',
  });

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Load entry data when in edit mode
  useEffect(() => {
    if (isEditMode && entryData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setFormData({
        vehicleId: entryData.vehicle?.id || 0,
        vehicleNumber: entryData.vehicle?.vehicle_number || '',
        vehicleType: entryData.vehicle?.vehicle_type?.name || '',
        transporterName: entryData.vehicle?.transporter?.name || '',
        transporterContactPerson: entryData.vehicle?.transporter?.contact_person || '',
        transporterMobile: entryData.vehicle?.transporter?.mobile_no || '',
        vehicleCapacity: entryData.vehicle?.capacity_ton
          ? `${entryData.vehicle.capacity_ton} Tons`
          : '',
        gpsId: '',
        driverId: entryData.driver?.id || 0,
        driverName: entryData.driver?.name || '',
        mobileNumber: entryData.driver?.mobile_no || '',
        drivingLicenseNumber: entryData.driver?.license_no || '',
        idProofType: entryData.driver?.id_proof_type || '',
        idProofNumber: entryData.driver?.id_proof_number || '',
        driverPhoto: entryData.driver?.photo || null,
        remarks: entryData.remarks || '',
      });
    }
  }, [isEditMode, entryData]);

  const handleInputChange = (field: string, value: string) => {
    // In edit mode, Step 1 is read-only unless updateMode is active
    if (isEditMode && !updateMode) return;
    setFormData((prev: VehicleDriverFormData) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleVehicleSelect = (vehicle: VehicleSelection) => {
    setFormData((prev: VehicleDriverFormData) => ({
      ...prev,
      vehicleId: vehicle.vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      vehicleCapacity: vehicle.vehicleCapacity,
      transporterName: vehicle.transporterName,
      transporterContactPerson: vehicle.transporterContactPerson,
      transporterMobile: vehicle.transporterMobile,
    }));
  };

  const handleDriverSelect = (driver: DriverSelection) => {
    setFormData((prev: VehicleDriverFormData) => ({
      ...prev,
      driverId: driver.driverId,
      driverName: driver.driverName,
      mobileNumber: driver.mobileNumber,
      drivingLicenseNumber: driver.drivingLicenseNumber,
      idProofType: driver.idProofType,
      idProofNumber: driver.idProofNumber,
      driverPhoto: driver.driverPhoto,
    }));
  };

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    navigate(config.routePrefix);
  };

  const handleNext = async () => {
    // In edit mode, navigate to next step without API call (unless in updateMode)
    if (isEditMode && !updateMode && entryId) {
      navigate(`${config.routePrefix}/edit/${entryId}/step2`);
      return;
    }

    // Create mode or update mode - validate and create/update entry
    setApiErrors({});

    // Validation
    if (!formData.vehicleId) {
      setApiErrors({ vehicle: 'Please select a vehicle' });
      return;
    }
    if (!formData.driverId) {
      setApiErrors({ driver: 'Please select a driver' });
      return;
    }

    handleCreate();
  };

  const handleCreate = async () => {
    try {
      // Generate entry number (format: GE-YYYY-NNNN)
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      const entryNo = `GE-${year}-${timestamp}`;

      const result = await createVehicleEntry.mutateAsync({
        entry_no: entryNo,
        vehicle: formData.vehicleId,
        driver: formData.driverId,
        remarks: formData.remarks || undefined,
        entry_type: config.entryType,
      });

      // Navigate to step 2 in edit mode (prevents duplicate submissions on back/forward navigation)
      setIsNavigating(true);
      navigate(`${config.routePrefix}/edit/${result.id}/step2`);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
          }
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to create vehicle entry' });
      }
    }
  };

  const handleUpdate = async () => {
    if (!entryId) return;

    setApiErrors({});

    // Validation
    if (!formData.vehicleId) {
      setApiErrors({ vehicle: 'Please select a vehicle' });
      return;
    }
    if (!formData.driverId) {
      setApiErrors({ driver: 'Please select a driver' });
      return;
    }

    try {
      await updateVehicleEntry.mutateAsync({
        id: parseInt(entryId),
        data: {
          vehicle: formData.vehicleId,
          driver: formData.driverId,
          remarks: formData.remarks || undefined,
        },
      });

      // Navigate to step 2
      setIsNavigating(true);
      navigate(`${config.routePrefix}/edit/${entryId}/step2`);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
          }
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to update vehicle entry' });
      }
    }
  };

  const canUpdate = isEditMode && entryData?.status === ENTRY_STATUS.DRAFT;
  const isReadOnly = isEditMode;

  return (
    <VehicleDriverFormShell
      formData={formData}
      onFormChange={handleInputChange}
      isReadOnly={isReadOnly}
      isLoading={isEditMode && isLoadingEntry}
      isSaving={createVehicleEntry.isPending || updateVehicleEntry.isPending || isNavigating}
      apiErrors={apiErrors}
      currentStep={1}
      totalSteps={config.totalSteps}
      onVehicleSelect={handleVehicleSelect}
      onDriverSelect={handleDriverSelect}
      onCancel={handleCancel}
      onNext={handleNext}
      onUpdate={handleUpdate}
      isEditMode={isEditMode}
      canUpdate={canUpdate}
      updateMode={updateMode}
      serverError={hasServerError ? getServerErrorMessage() : null}
      headerTitle={config.headerTitle}
    />
  );
}
