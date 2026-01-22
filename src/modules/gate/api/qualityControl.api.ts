import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { ApiError } from '@/core/api/types'

export interface QualityControl {
  id: number
  qc_status: string
  sample_collected: boolean
  batch_no: string
  expiry_date: string
  inspected_by: number
  inspection_time: string
  remarks: string
  is_locked: boolean
}

export interface CreateQualityControlRequest {
  qc_status: string
  batch_no: string
  expiry_date: string
  remarks?: string
}

export const qualityControlApi = {
  async get(poItemId: number): Promise<QualityControl | null> {
    try {
      const response = await apiClient.get<QualityControl>(
        API_ENDPOINTS.QUALITY_CONTROL.GET(poItemId)
      )
      return response.data
    } catch (error) {
      const apiError = error as ApiError
      // Return null if not found (404), throw other errors
      if (apiError.status === 404) {
        return null
      }
      throw error
    }
  },

  async create(poItemId: number, data: CreateQualityControlRequest): Promise<QualityControl> {
    const response = await apiClient.post<QualityControl>(
      API_ENDPOINTS.QUALITY_CONTROL.CREATE(poItemId),
      data
    )
    return response.data
  },
}
