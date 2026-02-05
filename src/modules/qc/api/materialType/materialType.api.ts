import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { MaterialType, CreateMaterialTypeRequest } from '../../types'

export interface ListMaterialTypesParams {
  search?: string
}

export const materialTypeApi = {
  // Get all material types
  async getList(params?: ListMaterialTypesParams): Promise<MaterialType[]> {
    const response = await apiClient.get<MaterialType[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPES,
      { params }
    )
    return response.data
  },

  // Get material type by ID
  async getById(id: number): Promise<MaterialType> {
    const response = await apiClient.get<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_ID(id)
    )
    return response.data
  },

  // Create material type
  async create(data: CreateMaterialTypeRequest): Promise<MaterialType> {
    const response = await apiClient.post<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPES,
      data
    )
    return response.data
  },

  // Update material type
  async update(id: number, data: CreateMaterialTypeRequest): Promise<MaterialType> {
    const response = await apiClient.put<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_ID(id),
      data
    )
    return response.data
  },

  // Delete material type
  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_ID(id))
  },
}
