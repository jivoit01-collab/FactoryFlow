import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { ApiResponse } from '@/core/api/types'
import type {
  QCItem,
  QCSummary,
  QCInspection,
  SubmitQCRequest,
  QCItemsResponse,
} from '../types/qualityCheck.types'

export const qualityCheckApi = {
  // Get all QC items with summary counts
  async getItems(): Promise<QCItemsResponse> {
    const response = await apiClient.get<ApiResponse<QCItemsResponse>>(
      API_ENDPOINTS.QUALITY_CHECK.ITEMS
    )
    return response.data.data
  },

  // Get QC summary counts only
  async getSummary(): Promise<QCSummary> {
    const response = await apiClient.get<ApiResponse<QCSummary>>(
      API_ENDPOINTS.QUALITY_CHECK.SUMMARY
    )
    return response.data.data
  },

  // Get single QC item detail
  async getItemById(itemId: number): Promise<QCItem> {
    const response = await apiClient.get<ApiResponse<QCItem>>(
      API_ENDPOINTS.QUALITY_CHECK.INSPECTION(itemId)
    )
    return response.data.data
  },

  // Get QC inspection detail (for items that have been started)
  async getInspection(itemId: number): Promise<QCInspection> {
    const response = await apiClient.get<ApiResponse<QCInspection>>(
      API_ENDPOINTS.QUALITY_CHECK.INSPECTION(itemId)
    )
    return response.data.data
  },

  // Start QC inspection for an item
  async startInspection(itemId: number): Promise<QCInspection> {
    const response = await apiClient.post<ApiResponse<QCInspection>>(
      API_ENDPOINTS.QUALITY_CHECK.START(itemId)
    )
    return response.data.data
  },

  // Submit QC inspection (accept/reject/hold)
  async submitInspection(itemId: number, data: SubmitQCRequest): Promise<QCInspection> {
    const response = await apiClient.post<ApiResponse<QCInspection>>(
      API_ENDPOINTS.QUALITY_CHECK.SUBMIT(itemId),
      data
    )
    return response.data.data
  },

  // Upload attachment for QC inspection
  async uploadAttachment(itemId: number, file: File): Promise<{ url: string; fileName: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<ApiResponse<{ url: string; fileName: string }>>(
      API_ENDPOINTS.QUALITY_CHECK.UPLOAD_ATTACHMENT(itemId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.data
  },

  // Delete attachment
  async deleteAttachment(itemId: number, attachmentId: string): Promise<void> {
    await apiClient.delete(
      `${API_ENDPOINTS.QUALITY_CHECK.UPLOAD_ATTACHMENT(itemId)}${attachmentId}/`
    )
  },
}
