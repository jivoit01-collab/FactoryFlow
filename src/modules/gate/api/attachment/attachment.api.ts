import { API_ENDPOINTS } from '@/config/constants'
import { apiClient } from '@/core/api'

export interface GateAttachment {
  id: number
  file: string
  file_name?: string
  uploaded_at?: string
}

export const attachmentApi = {
  async getAll(entryId: number): Promise<GateAttachment[]> {
    const response = await apiClient.get<GateAttachment[]>(
      API_ENDPOINTS.GATE_ATTACHMENTS.BY_ENTRY(entryId)
    )
    return Array.isArray(response.data) ? response.data : []
  },

  async upload(entryId: number, file: File): Promise<GateAttachment> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<GateAttachment>(
      API_ENDPOINTS.GATE_ATTACHMENTS.BY_ENTRY(entryId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}
