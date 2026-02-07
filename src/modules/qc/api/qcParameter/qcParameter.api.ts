import { apiClient } from '@/core/api'
import { API_ENDPOINTS } from '@/config/constants'
import type { QCParameter, CreateQCParameterRequest } from '../../types'

export interface ListQCParametersParams {
  material_type_id?: number
}

export const qcParameterApi = {
  // Get parameters for a material type
  async getByMaterialType(materialTypeId: number): Promise<QCParameter[]> {
    const response = await apiClient.get<QCParameter[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_PARAMETERS(materialTypeId)
    )
    return response.data
  },

  // Get parameter by ID
  async getById(id: number): Promise<QCParameter> {
    const response = await apiClient.get<QCParameter>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_PARAMETER_BY_ID(id)
    )
    return response.data
  },

  // Create parameter for material type
  async create(materialTypeId: number, data: CreateQCParameterRequest): Promise<QCParameter> {
    const response = await apiClient.post<QCParameter>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_PARAMETERS(materialTypeId),
      data
    )
    return response.data
  },

  // Update parameter
  async update(id: number, data: CreateQCParameterRequest): Promise<QCParameter> {
    const response = await apiClient.put<QCParameter>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_PARAMETER_BY_ID(id),
      data
    )
    return response.data
  },

  // Delete parameter
  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.QC_PARAMETER_BY_ID(id))
  },
}
