import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'

export interface QualityCheckItem {
  po_item_code: string
  qc_status: string
  batch_no: string
  expiry_date?: string
  remarks?: string
}

export interface CreateQualityCheckRequest {
  items: QualityCheckItem[]
}

export interface QualityCheck {
  id: number
  items: QualityCheckItem[]
}

export const qualityCheckApi = {
  async create(entryId: number, data: CreateQualityCheckRequest): Promise<QualityCheck> {
    const response = await apiClient.post<QualityCheck>(
      API_ENDPOINTS.QUALITY_CHECK.CREATE(entryId),
      data
    )
    return response.data
  },
}
