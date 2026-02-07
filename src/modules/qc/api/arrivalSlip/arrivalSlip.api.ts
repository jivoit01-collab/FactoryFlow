import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { ArrivalSlipForQC } from '../../types'

export const arrivalSlipApi = {
  async getById(slipId: number): Promise<ArrivalSlipForQC> {
    const response = await apiClient.get<ArrivalSlipForQC>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_BY_ID(slipId)
    )
    return response.data
  },
}
