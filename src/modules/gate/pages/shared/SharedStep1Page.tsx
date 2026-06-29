import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ENTRY_STATUS,
  ENTRY_TYPES,
  getTyreConditionLabel,
  getVehicleConditionLabel,
  TYRE_CONDITIONS,
  VEHICLE_CONDITIONS,
} from '@/config/constants';
import type { ApiError } from '@/core/api/types';
import { RecordTimestamps } from '@/shared/components';
import { getCurrentTimeHHMM, getTimeFromDatetime } from '@/shared/hooks';
import {
  getServerErrorMessage,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';

import { securityCheckApi } from '../../api/securityCheck/securityCheck.api';
import { useSecurityCheck } from '../../api/securityCheck/securityCheck.queries';
import {
  useCreateVehicleEntry,
  useUpdateVehicleEntry,
  useVehicleEntry,
} from '../../api/vehicle/vehicleEntry.queries';
import {
  type DriverSelection,
  PONumberLookup,
  type VehicleDriverSecurityFormData,
  VehicleDriverSecurityFormShell,
  type VehicleSelection,
} from '../../components';
import type { EntryFlowConfig } from '../../constants/entryFlowConfig';
import { useEntryId, useEntryStepTracker } from '../../hooks';

interface SharedStep1PageProps {
  config: EntryFlowConfig;
}

const createEmptyFormData = (): VehicleDriverSecurityFormData => ({
  vehicleId: 0,
  vehicleNumber: '',
  vehicleType: '',
  transporterId: 0,
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
  vehicleCondition: '',
  fireExtinguisherAvailable: '',
  tyreCondition: '',
  sealNumberBefore: '',
  sealNumberAfter: '',
  alcoholTestRequired: 'Not Required',
  entryTime: '',
  inspectedByName: '',
  remarks: '',
});

export default function SharedStep1Page({ config }: SharedStep1PageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryIdNumber, isEditMode } = useEntryId();
  useEntryStepTracker();

  const createVehicleEntry = useCreateVehicleEntry();
  const updateVehicleEntry = useUpdateVehicleEntry();

  const {
    data: entryData,
    isLoading: isLoadingEntry,
    error: entryError,
  } = useVehicleEntry(isEditMode && entryIdNumber ? entryIdNumber : null);
  const {
    data: securityCheckData,
    isLoading: isLoadingSecurityCheck,
    error: securityCheckError,
  } = useSecurityCheck(isEditMode && entryIdNumber ? entryIdNumber : null);

  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(entryError);
  const isSecurityNotFound = checkNotFoundError(securityCheckError);

  // State to track if Update button has been clicked (enables editing in edit mode)
  const [updateMode, setUpdateMode] = useState(false);
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false);
  // State to track the in-flight security-check save (separate API call)
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  // Track the entry created in this session so retries don't create duplicates
  const createdEntryIdRef = useRef<number | null>(null);

  const [formData, setFormData] = useState<VehicleDriverSecurityFormData>(createEmptyFormData);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Auto-capture entry time on mount in create mode
  useEffect(() => {
    if (!isEditMode) {
       
      setFormData((prev) => ({ ...prev, entryTime: prev.entryTime || getCurrentTimeHHMM() }));
    }
  }, [isEditMode]);

  // Load vehicle/driver data when in edit mode
  useEffect(() => {
    if (isEditMode && entryData) {
       
      setFormData((prev) => ({
        ...prev,
        vehicleId: entryData.vehicle?.id || 0,
        vehicleNumber: entryData.vehicle?.vehicle_number || '',
        vehicleType: entryData.vehicle?.vehicle_type?.name || '',
        transporterId: entryData.vehicle?.transporter?.id || 0,
        transporterName: entryData.vehicle?.transporter?.name || '',
        transporterContactPerson: entryData.vehicle?.transporter?.contact_person || '',
        transporterMobile: entryData.vehicle?.transporter?.mobile_no || '',
        vehicleCapacity: entryData.vehicle?.capacity_ton
          ? `${entryData.vehicle.capacity_ton} Tons`
          : '',
        driverId: entryData.driver?.id || 0,
        driverName: entryData.driver?.name || '',
        mobileNumber: entryData.driver?.mobile_no || '',
        drivingLicenseNumber: entryData.driver?.license_no || '',
        idProofType: entryData.driver?.id_proof_type || '',
        idProofNumber: entryData.driver?.id_proof_number || '',
        driverPhoto: entryData.driver?.photo || null,
        remarks: entryData.remarks || '',
      }));
    }
  }, [isEditMode, entryData]);

  // Load security-check data when in edit mode
  useEffect(() => {
    if (isEditMode && securityCheckData) {
      const vehicleCondition = getVehicleConditionLabel(securityCheckData.vehicle_condition_ok);
      const tyreCondition = getTyreConditionLabel(securityCheckData.tyre_condition_ok);
      const fireExtinguisher = securityCheckData.fire_extinguisher_available ? 'Yes' : 'No';

      let alcoholTest = 'Not Required';
      if (securityCheckData.alcohol_test_done) {
        alcoholTest = securityCheckData.alcohol_test_passed ? 'Passed' : 'Failed';
      }

      let entryTime = getCurrentTimeHHMM();
      if (securityCheckData.inspection_time) {
        entryTime = getTimeFromDatetime(securityCheckData.inspection_time) || getCurrentTimeHHMM();
      }

       
      setFormData((prev) => ({
        ...prev,
        vehicleCondition,
        fireExtinguisherAvailable: fireExtinguisher,
        tyreCondition,
        sealNumberBefore: securityCheckData.seal_no_before || '',
        sealNumberAfter: securityCheckData.seal_no_after || '',
        alcoholTestRequired: alcoholTest,
        entryTime,
        inspectedByName: securityCheckData.inspected_by_name || '',
      }));
    }
  }, [isEditMode, securityCheckData]);

  const isReadOnly = isEditMode && !updateMode;

  const handleInputChange = (field: string, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleVehicleSelect = (vehicle: VehicleSelection) => {
    setFormData((prev) => ({
      ...prev,
      vehicleId: vehicle.vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      vehicleCapacity: vehicle.vehicleCapacity,
      transporterId: vehicle.transporterId,
      transporterName: vehicle.transporterName,
      transporterContactPerson: vehicle.transporterContactPerson,
      transporterMobile: vehicle.transporterMobile,
    }));
  };

  const handleDriverSelect = (driver: DriverSelection) => {
    setFormData((prev) => ({
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

  const handleUpdate = () => {
    setUpdateMode(true);
  };

  const applyApiError = (error: unknown, fallback: string) => {
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
      setApiErrors({ general: apiError.message || fallback });
    }
  };

  // Validate the combined vehicle/driver + security-check fields
  const validate = (): boolean => {
    if (!formData.vehicleId) {
      setApiErrors({ vehicle: 'Please select a vehicle' });
      return false;
    }
    if (!formData.driverId) {
      setApiErrors({ driver: 'Please select a driver' });
      return false;
    }
    if (!formData.inspectedByName) {
      setApiErrors({ inspectedByName: 'Please enter security / inspector name' });
      return false;
    }
    return true;
  };

  // Persist the security check for the given vehicle entry id
  const saveSecurityCheck = async (vehicleEntryId: number) => {
    const vehicleConditionOk =
      formData.vehicleCondition === VEHICLE_CONDITIONS.EMPTY ||
      formData.vehicleCondition === VEHICLE_CONDITIONS.LOADED;
    const tyreConditionOk =
      formData.tyreCondition === TYRE_CONDITIONS.GOOD || formData.tyreCondition === 'Fair';
    const fireExtinguisherAvailable = formData.fireExtinguisherAvailable === 'Yes';
    const alcoholTestDone = formData.alcoholTestRequired !== 'Not Required';
    const alcoholTestPassed = formData.alcoholTestRequired === 'Passed';

    await securityCheckApi.create(vehicleEntryId, {
      vehicle_condition_ok: vehicleConditionOk,
      tyre_condition_ok: tyreConditionOk,
      fire_extinguisher_available: fireExtinguisherAvailable,
      seal_no_before: formData.sealNumberBefore || '',
      seal_no_after: formData.sealNumberAfter || undefined,
      alcohol_test_done: alcoholTestDone,
      alcohol_test_passed: alcoholTestDone ? alcoholTestPassed : undefined,
      inspected_by_name: formData.inspectedByName,
    });

    queryClient.invalidateQueries({ queryKey: ['securityCheck'] });
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
  };

  const goToNextStep = (vehicleEntryId: number) => {
    setIsNavigating(true);
    navigate(`${config.routePrefix}/edit/${vehicleEntryId}/step2`);
  };

  const handleNext = async () => {
    // In edit mode without Update clicked, just advance to the next step.
    if (isEditMode && !updateMode && entryIdNumber) {
      navigate(`${config.routePrefix}/edit/${entryIdNumber}/step2`);
      return;
    }

    setApiErrors({});
    if (!validate()) return;

    try {
      if (isEditMode && entryIdNumber) {
        // Update mode: update the vehicle entry, then (re)save the security check
        setIsSavingSecurity(true);
        await updateVehicleEntry.mutateAsync({
          id: entryIdNumber,
          data: {
            vehicle: formData.vehicleId,
            driver: formData.driverId,
            remarks: formData.remarks || undefined,
          },
        });
        await saveSecurityCheck(entryIdNumber);
        goToNextStep(entryIdNumber);
        return;
      }

      // Create mode: create the entry (once), then save the security check
      let vehicleEntryId = createdEntryIdRef.current;
      if (!vehicleEntryId) {
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
        vehicleEntryId = result.id;
        createdEntryIdRef.current = result.id;
      }

      setIsSavingSecurity(true);
      await saveSecurityCheck(vehicleEntryId);
      goToNextStep(vehicleEntryId);
    } catch (error) {
      applyApiError(error, 'Failed to save gate entry');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const canUpdate = isEditMode && entryData?.status !== ENTRY_STATUS.COMPLETED;
  const isSaving =
    createVehicleEntry.isPending ||
    updateVehicleEntry.isPending ||
    isSavingSecurity ||
    isNavigating;

  return (
    <VehicleDriverSecurityFormShell
      formData={formData}
      onFormChange={handleInputChange}
      isReadOnly={isReadOnly}
      isLoading={isEditMode && (isLoadingEntry || (isLoadingSecurityCheck && !isSecurityNotFound))}
      isSaving={isSaving}
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
      topContent={config.entryType === ENTRY_TYPES.RAW_MATERIAL ? <PONumberLookup /> : null}
    >
      {isEditMode && entryData?.created_at && (
        <RecordTimestamps createdAt={entryData.created_at} updatedAt={entryData.updated_at} />
      )}
    </VehicleDriverSecurityFormShell>
  );
}
