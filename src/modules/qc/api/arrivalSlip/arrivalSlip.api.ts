import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { ArrivalSlipForQC } from '../../types';

export interface SendBackRequest {
  remarks?: string;
}

export const arrivalSlipApi = {
  async getById(slipId: number): Promise<ArrivalSlipForQC> {
    const response = await apiClient.get<ArrivalSlipForQC>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_BY_ID(slipId),
    );
    return response.data;
  },

  async sendBack(slipId: number, data?: SendBackRequest): Promise<ArrivalSlipForQC> {
    const response = await apiClient.post<ArrivalSlipForQC>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_SEND_BACK(slipId),
      data || {},
    );
    return response.data;
  },
};
