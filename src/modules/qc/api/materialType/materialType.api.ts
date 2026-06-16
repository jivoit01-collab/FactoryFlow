import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CreateMaterialTypeRequest,
  LinkMaterialTypeSAPItemRequest,
  MaterialType,
  SAPItemMasterOption,
} from '../../types';

export interface ListMaterialTypesParams {
  search?: string;
}

export interface ListSAPItemsParams {
  search?: string;
  limit?: number;
}

export const materialTypeApi = {
  // Get all material types
  async getList(params?: ListMaterialTypesParams): Promise<MaterialType[]> {
    const response = await apiClient.get<MaterialType[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPES,
      { params },
    );
    return response.data;
  },

  // Get material type by ID
  async getById(id: number): Promise<MaterialType> {
    const response = await apiClient.get<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_ID(id),
    );
    return response.data;
  },

  // Get material type linked to a SAP item
  async getBySapItem(itemCode: string): Promise<MaterialType> {
    const response = await apiClient.get<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_SAP_ITEM(itemCode),
    );
    return response.data;
  },

  // Search SAP item master for linking to material types
  async searchSAPItems(params?: ListSAPItemsParams): Promise<SAPItemMasterOption[]> {
    const response = await apiClient.get<SAPItemMasterOption[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.SAP_ITEMS,
      { params },
    );
    return response.data;
  },

  // Link a SAP item to a material type
  async linkSAPItem(data: LinkMaterialTypeSAPItemRequest): Promise<MaterialType> {
    const response = await apiClient.post<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_LINK_SAP_ITEM,
      data,
    );
    return response.data;
  },

  // Create material type
  async create(data: CreateMaterialTypeRequest): Promise<MaterialType> {
    const response = await apiClient.post<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPES,
      data,
    );
    return response.data;
  },

  // Update material type
  async update(id: number, data: CreateMaterialTypeRequest): Promise<MaterialType> {
    const response = await apiClient.put<MaterialType>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_ID(id),
      data,
    );
    return response.data;
  },

  // Delete material type
  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_ID(id));
  },
};
