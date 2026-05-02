import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  type DriverSelection,
  type VehicleDriverFormData,
  VehicleDriverFormShell,
  type VehicleSelection,
} from '@/modules/gate/components';

import {
  readRejectedQCReturnDraft,
  type RejectedQCReturnDraft,
  writeRejectedQCReturnDraft,
} from './rejectedQcReturn.storage';

function draftToFormData(draft: RejectedQCReturnDraft): VehicleDriverFormData {
  return {
    vehicleId: draft.vehicleId,
    vehicleNumber: draft.vehicleNo,
    vehicleType: draft.vehicleType,
    transporterId: draft.transporterId,
    transporterName: draft.transporterName,
    transporterContactPerson: draft.transporterContactPerson,
    transporterMobile: draft.transporterMobile,
    vehicleCapacity: draft.vehicleCapacity,
    gpsId: draft.gpsId,
    driverId: draft.driverId,
    driverName: draft.driverName,
    mobileNumber: draft.mobileNumber,
    drivingLicenseNumber: draft.drivingLicenseNumber,
    idProofType: draft.idProofType,
    idProofNumber: draft.idProofNumber,
    driverPhoto: draft.driverPhoto,
    remarks: draft.remarks,
  };
}

function mergeFormDataIntoDraft(
  draft: RejectedQCReturnDraft,
  formData: VehicleDriverFormData,
): RejectedQCReturnDraft {
  return {
    ...draft,
    vehicleId: formData.vehicleId,
    vehicleNo: formData.vehicleNumber,
    vehicleType: formData.vehicleType,
    transporterId: formData.transporterId,
    transporterName: formData.transporterName,
    transporterContactPerson: formData.transporterContactPerson,
    transporterMobile: formData.transporterMobile,
    vehicleCapacity: formData.vehicleCapacity,
    gpsId: formData.gpsId,
    driverId: formData.driverId,
    driverName: formData.driverName,
    mobileNumber: formData.mobileNumber,
    drivingLicenseNumber: formData.drivingLicenseNumber,
    idProofType: formData.idProofType,
    idProofNumber: formData.idProofNumber,
    driverPhoto: formData.driverPhoto,
    remarks: formData.remarks,
  };
}

export default function RejectedQCReturnVehiclePage() {
  const navigate = useNavigate();
  const [draft] = useState<RejectedQCReturnDraft>(() => readRejectedQCReturnDraft());
  const [formData, setFormData] = useState<VehicleDriverFormData>(() =>
    draftToFormData(readRejectedQCReturnDraft()),
  );
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const handleFormChange = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (apiErrors[field]) {
      setApiErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleVehicleSelect = (vehicle: VehicleSelection) => {
    setFormData((current) => ({
      ...current,
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
    setFormData((current) => ({
      ...current,
      driverId: driver.driverId,
      driverName: driver.driverName,
      mobileNumber: driver.mobileNumber,
      drivingLicenseNumber: driver.drivingLicenseNumber,
      idProofType: driver.idProofType,
      idProofNumber: driver.idProofNumber,
      driverPhoto: driver.driverPhoto,
    }));
  };

  const handleNext = () => {
    const errors: Record<string, string> = {};

    if (!formData.vehicleId) errors.vehicle = 'Please select a vehicle';
    if (!formData.driverId) errors.driver = 'Please select a driver';

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    writeRejectedQCReturnDraft(mergeFormDataIntoDraft(draft, formData));
    navigate('/gate/rejected-qc-return/new/items');
  };

  return (
    <VehicleDriverFormShell
      formData={formData}
      onFormChange={handleFormChange}
      isReadOnly={false}
      isLoading={false}
      isSaving={false}
      apiErrors={apiErrors}
      currentStep={1}
      totalSteps={2}
      onVehicleSelect={handleVehicleSelect}
      onDriverSelect={handleDriverSelect}
      onCancel={() => navigate('/gate/rejected-qc-return')}
      onNext={handleNext}
      isEditMode={false}
      canUpdate={false}
      updateMode={false}
      headerTitle="Rejected QC Return"
    />
  );
}
