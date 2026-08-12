import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { CreateQCParameterRequest, QCParameter } from '../../types';

export interface ListQCParametersParams {
  material_type_id?: number;
}

export const qcParameterApi = {
  // Get the parameters of one parameter set (one vendor's, or the default)
  async getByParameterSet(parameterSetId: number): Promise<QCParameter[]> {
    const response = await apiClient.get<QCParameter[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PARAMETER_SET_PARAMETERS(parameterSetId),
    );
    return response.data;
  },

  // Get a material type's default parameters, whatever vendor sets exist
  async getByMaterialType(materialTypeId: number): Promise<QCParameter[]> {
    const response = await apiClient.get<QCParameter[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_PARAMETERS(materialTypeId),
    );
    return response.data;
  },

  // Get parameter by ID
  async getById(id: number): Promise<QCParameter> {
    const response = await apiClient.get<QCParameter>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_PARAMETER_BY_ID(id),
    );
    return response.data;
  },

  // Create a parameter inside one parameter set
  async create(parameterSetId: number, data: CreateQCParameterRequest): Promise<QCParameter> {
    const response = await apiClient.post<QCParameter>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PARAMETER_SET_PARAMETERS(parameterSetId),
      data,
    );
    return response.data;
  },

  // Update parameter
  async update(id: number, data: CreateQCParameterRequest): Promise<QCParameter> {
    const response = await apiClient.put<QCParameter>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.QC_PARAMETER_BY_ID(id),
      data,
    );
    return response.data;
  },

  // Delete parameter
  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.QC_PARAMETER_BY_ID(id));
  },
};
