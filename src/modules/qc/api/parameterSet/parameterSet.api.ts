import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CopyQCParametersRequest,
  CopyQCParametersResponse,
  CreateQCParameterSetRequest,
  QCParameterSet,
} from '../../types';

export const parameterSetApi = {
  // Every parameter set of a material type — the default first, then vendors
  async getByMaterialType(materialTypeId: number): Promise<QCParameterSet[]> {
    const response = await apiClient.get<QCParameterSet[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_PARAMETER_SETS(materialTypeId),
    );
    return response.data;
  },

  async getById(parameterSetId: number): Promise<QCParameterSet> {
    const response = await apiClient.get<QCParameterSet>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PARAMETER_SET_BY_ID(parameterSetId),
    );
    return response.data;
  },

  // Add a vendor's set. Pass copy_parameters_from_set_id to seed it from
  // another set instead of starting empty.
  async create(
    materialTypeId: number,
    data: CreateQCParameterSetRequest,
  ): Promise<QCParameterSet> {
    const response = await apiClient.post<QCParameterSet>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_PARAMETER_SETS(materialTypeId),
      data,
    );
    return response.data;
  },

  async update(
    parameterSetId: number,
    data: CreateQCParameterSetRequest,
  ): Promise<QCParameterSet> {
    const response = await apiClient.put<QCParameterSet>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PARAMETER_SET_BY_ID(parameterSetId),
      data,
    );
    return response.data;
  },

  // Vendor sets only — the default set can't be deleted.
  async delete(parameterSetId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.PARAMETER_SET_BY_ID(parameterSetId));
  },

  async copyParameters(
    parameterSetId: number,
    data: CopyQCParametersRequest,
  ): Promise<CopyQCParametersResponse> {
    const response = await apiClient.post<CopyQCParametersResponse>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.PARAMETER_SET_COPY_PARAMETERS(parameterSetId),
      data,
    );
    return response.data;
  },
};
