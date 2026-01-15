import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { ApiResponse, PaginatedResponse, ListParams } from '@/core/api/types'
import type { GateInEntry, CreateGateInRequest, UpdateGateInRequest } from '../types/gateIn.types'

export const gateInApi = {
  async getList(params?: ListParams): Promise<PaginatedResponse<GateInEntry>> {
    const response = await apiClient.get<PaginatedResponse<GateInEntry>>(
      API_ENDPOINTS.GATE_IN.LIST,
      { params }
    )
    return response.data
  },

  async getById(id: string): Promise<GateInEntry> {
    const response = await apiClient.get<ApiResponse<GateInEntry>>(API_ENDPOINTS.GATE_IN.DETAIL(id))
    return response.data.data
  },

  async create(data: CreateGateInRequest): Promise<GateInEntry> {
    const response = await apiClient.post<ApiResponse<GateInEntry>>(
      API_ENDPOINTS.GATE_IN.CREATE,
      data
    )
    return response.data.data
  },

  async update(id: string, data: UpdateGateInRequest): Promise<GateInEntry> {
    const response = await apiClient.patch<ApiResponse<GateInEntry>>(
      API_ENDPOINTS.GATE_IN.UPDATE(id),
      data
    )
    return response.data.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.GATE_IN.DELETE(id))
  },
}
