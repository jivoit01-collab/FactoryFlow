import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CreateProductionQCEntryRequest,
  ProductionParameter,
  ProductionParameterRequest,
  ProductionParameterType,
  ProductionParameterTypeListParams,
  ProductionParameterTypeRequest,
  ProductionQCDateRangeParams,
  ProductionQCDecisionRequest,
  ProductionQCEntry,
  ProductionQCEntryCounts,
  ProductionQCEntryListItem,
  ProductionQCEntryListParams,
  UpdateProductionQCEntryRequest,
} from '../../types/productionQC.types';

const ENDPOINTS = API_ENDPOINTS.QUALITY_CONTROL_V2;

/** Drop the filters that are not set, so the URL carries only what was picked. */
function cleanParams(params?: object): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') clean[key] = value;
  });
  return clean;
}

export const productionQCApi = {
  // ==================== Entries ====================

  async listEntries(params?: ProductionQCEntryListParams): Promise<ProductionQCEntryListItem[]> {
    const response = await apiClient.get<ProductionQCEntryListItem[]>(
      ENDPOINTS.PRODUCTION_QC_ENTRIES,
      { params: cleanParams(params) },
    );
    return response.data;
  },

  /** A day's entries with their readings, for the sheet view. */
  async listEntriesWithResults(params: ProductionQCEntryListParams): Promise<ProductionQCEntry[]> {
    const response = await apiClient.get<ProductionQCEntry[]>(ENDPOINTS.PRODUCTION_QC_ENTRIES, {
      params: { ...cleanParams(params), include: 'results' },
    });
    return response.data;
  },

  async getEntryCounts(params?: ProductionQCDateRangeParams): Promise<ProductionQCEntryCounts> {
    // Also the sidebar badge's 30s poll, on every page: an outage must not toast
    // app-wide. The badge renders nothing and the dashboard's list says why.
    const response = await apiClient.get<ProductionQCEntryCounts>(
      ENDPOINTS.PRODUCTION_QC_ENTRY_COUNTS,
      { params: cleanParams(params), suppressErrorToast: true },
    );
    return response.data;
  },

  async getEntry(id: number): Promise<ProductionQCEntry> {
    const response = await apiClient.get<ProductionQCEntry>(
      ENDPOINTS.PRODUCTION_QC_ENTRY_BY_ID(id),
    );
    return response.data;
  },

  /** Save a check and send it for approval (there are no drafts). */
  async createEntry(data: CreateProductionQCEntryRequest): Promise<ProductionQCEntry> {
    const response = await apiClient.post<ProductionQCEntry>(ENDPOINTS.PRODUCTION_QC_ENTRIES, data);
    return response.data;
  },

  /** Correct a pending or sent-back check; it goes back to pending. */
  async updateEntry(id: number, data: UpdateProductionQCEntryRequest): Promise<ProductionQCEntry> {
    const response = await apiClient.patch<ProductionQCEntry>(
      ENDPOINTS.PRODUCTION_QC_ENTRY_BY_ID(id),
      data,
    );
    return response.data;
  },

  async approveEntry(
    id: number,
    data: ProductionQCDecisionRequest = {},
  ): Promise<ProductionQCEntry> {
    const response = await apiClient.post<ProductionQCEntry>(
      ENDPOINTS.PRODUCTION_QC_ENTRY_APPROVE(id),
      data,
    );
    return response.data;
  },

  async sendBackEntry(id: number, data: ProductionQCDecisionRequest): Promise<ProductionQCEntry> {
    const response = await apiClient.post<ProductionQCEntry>(
      ENDPOINTS.PRODUCTION_QC_ENTRY_SEND_BACK(id),
      data,
    );
    return response.data;
  },

  // ==================== Parameter types ====================

  async listParameterTypes(
    params?: ProductionParameterTypeListParams,
  ): Promise<ProductionParameterType[]> {
    const response = await apiClient.get<ProductionParameterType[]>(
      ENDPOINTS.PRODUCTION_QC_PARAMETER_TYPES,
      { params: cleanParams(params) },
    );
    return response.data;
  },

  async getParameterType(id: number): Promise<ProductionParameterType> {
    const response = await apiClient.get<ProductionParameterType>(
      ENDPOINTS.PRODUCTION_QC_PARAMETER_TYPE_BY_ID(id),
    );
    return response.data;
  },

  async createParameterType(
    data: ProductionParameterTypeRequest,
  ): Promise<ProductionParameterType> {
    const response = await apiClient.post<ProductionParameterType>(
      ENDPOINTS.PRODUCTION_QC_PARAMETER_TYPES,
      data,
    );
    return response.data;
  },

  async updateParameterType(
    id: number,
    data: Partial<ProductionParameterTypeRequest>,
  ): Promise<ProductionParameterType> {
    const response = await apiClient.patch<ProductionParameterType>(
      ENDPOINTS.PRODUCTION_QC_PARAMETER_TYPE_BY_ID(id),
      data,
    );
    return response.data;
  },

  /** A soft delete: saved entries keep their readings. */
  async deleteParameterType(id: number): Promise<void> {
    await apiClient.delete(ENDPOINTS.PRODUCTION_QC_PARAMETER_TYPE_BY_ID(id));
  },

  // ==================== Parameters ====================

  async listParameters(typeId: number): Promise<ProductionParameter[]> {
    const response = await apiClient.get<ProductionParameter[]>(
      ENDPOINTS.PRODUCTION_QC_TYPE_PARAMETERS(typeId),
    );
    return response.data;
  },

  async createParameter(
    typeId: number,
    data: ProductionParameterRequest,
  ): Promise<ProductionParameter> {
    const response = await apiClient.post<ProductionParameter>(
      ENDPOINTS.PRODUCTION_QC_TYPE_PARAMETERS(typeId),
      data,
    );
    return response.data;
  },

  async updateParameter(
    id: number,
    data: Partial<ProductionParameterRequest>,
  ): Promise<ProductionParameter> {
    const response = await apiClient.patch<ProductionParameter>(
      ENDPOINTS.PRODUCTION_QC_PARAMETER_BY_ID(id),
      data,
    );
    return response.data;
  },

  async deleteParameter(id: number): Promise<void> {
    await apiClient.delete(ENDPOINTS.PRODUCTION_QC_PARAMETER_BY_ID(id));
  },
};
