/**
 * Shape of the vehicle/driver block captured at both returnable gate stages.
 *
 * Kept out of the component file so the component module only exports a
 * component (react-refresh requirement).
 */
export interface ReturnableVehicleFormData {
  vehicleId: number;
  vehicleNumber: string;
  transporterId: number;
  transporterName: string;
  driverId: number;
  driverName: string;
  driverMobile: string;
  securityName: string;
}

export const EMPTY_VEHICLE_FORM: ReturnableVehicleFormData = {
  vehicleId: 0,
  vehicleNumber: '',
  transporterId: 0,
  transporterName: '',
  driverId: 0,
  driverName: '',
  driverMobile: '',
  securityName: '',
};
