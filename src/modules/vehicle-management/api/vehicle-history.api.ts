import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { VehicleHistory } from '../types/vehicle-history.types';

export const vehicleHistoryApi = {
  /** Everything captured about a previously-registered vehicle, by reg number. */
  async getByNumber(vehicleNumber: string): Promise<VehicleHistory> {
    const response = await apiClient.get<VehicleHistory>(
      API_ENDPOINTS.VEHICLE.VEHICLE_HISTORY(vehicleNumber),
    );
    return response.data;
  },
};
