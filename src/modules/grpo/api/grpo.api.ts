import { API_ENDPOINTS } from '@/config/constants'
import { apiClient } from '@/core/api'

import type {
  GRPOHistoryEntry,
  PendingGRPOEntry,
  PostGRPORequest,
  PostGRPOResponse,
  PreviewPOReceipt,
  Warehouse,
} from '../types'

export const grpoApi = {
  // Get list of pending gate entries for GRPO posting
  async getPendingEntries(): Promise<PendingGRPOEntry[]> {
    const response = await apiClient.get<PendingGRPOEntry[]>(API_ENDPOINTS.GRPO.PENDING)
    return response.data
  },

  // Get preview data for a specific vehicle entry
  async getPreview(vehicleEntryId: number): Promise<PreviewPOReceipt[]> {
    const response = await apiClient.get<PreviewPOReceipt[]>(
      API_ENDPOINTS.GRPO.PREVIEW(vehicleEntryId)
    )
    return response.data
  },

  // Post GRPO to SAP
  async post(data: PostGRPORequest): Promise<PostGRPOResponse> {
    const response = await apiClient.post<PostGRPOResponse>(API_ENDPOINTS.GRPO.POST, data)
    return response.data
  },

  // Get posting history
  async getHistory(vehicleEntryId?: number): Promise<GRPOHistoryEntry[]> {
    const params = vehicleEntryId ? { vehicle_entry_id: vehicleEntryId } : undefined
    const response = await apiClient.get<GRPOHistoryEntry[]>(API_ENDPOINTS.GRPO.HISTORY, {
      params,
    })
    return response.data
  },

  // Get single posting detail
  async getDetail(postingId: number): Promise<GRPOHistoryEntry> {
    const response = await apiClient.get<GRPOHistoryEntry>(API_ENDPOINTS.GRPO.DETAIL(postingId))
    return response.data
  },

  // Get list of warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const response = await apiClient.get<Warehouse[]>(API_ENDPOINTS.PO.WAREHOUSES)
    return response.data
  },
}
