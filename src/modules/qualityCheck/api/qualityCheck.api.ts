import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { ApiResponse, PaginatedResponse, ListParams } from '@/core/api/types'
import type {
  QualityCheckEntry,
  CreateQualityCheckRequest,
  UpdateQualityCheckRequest,
} from '../types/qualityCheck.types'

export const qualityCheckApi = {
  async getList(params?: ListParams): Promise<PaginatedResponse<QualityCheckEntry>> {
    const response = await apiClient.get<PaginatedResponse<QualityCheckEntry>>(
      API_ENDPOINTS.QUALITY_CHECK.LIST,
      { params }
    )
    return response.data
  },

  async getById(id: string): Promise<QualityCheckEntry> {
    const response = await apiClient.get<ApiResponse<QualityCheckEntry>>(
      API_ENDPOINTS.QUALITY_CHECK.DETAIL(id)
    )
    return response.data.data
  },

  async create(data: CreateQualityCheckRequest): Promise<QualityCheckEntry> {
    const response = await apiClient.post<ApiResponse<QualityCheckEntry>>(
      API_ENDPOINTS.QUALITY_CHECK.CREATE,
      data
    )
    return response.data.data
  },

  async update(id: string, data: UpdateQualityCheckRequest): Promise<QualityCheckEntry> {
    const response = await apiClient.patch<ApiResponse<QualityCheckEntry>>(
      API_ENDPOINTS.QUALITY_CHECK.UPDATE(id),
      data
    )
    return response.data.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CHECK.DELETE(id))
  },
}
