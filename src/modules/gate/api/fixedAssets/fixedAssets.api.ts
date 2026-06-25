import { apiClient } from '@/core/api';

import type { UnitChoice } from '../maintenance/maintenance.api';

// Types
export interface AssetCategory {
  id: number;
  category_name: string;
  description: string;
  is_active: boolean;
}

export interface FixedAssetEntryCategory {
  id: number;
  category_name: string;
}

export interface FixedAssetItem {
  id?: number;
  asset_category: FixedAssetEntryCategory | number;
  asset_name: string;
  serial_number?: string;
  quantity: number | string;
  unit: UnitChoice | number;
}

export interface FixedAssetEntry {
  id: number;
  work_order_number: string;
  supplier_name: string;
  invoice_number?: string;
  remarks?: string;
  inward_time?: string;
  created_at?: string;
  updated_at?: string;
  items: FixedAssetItem[];
}

export interface CreateFixedAssetItem {
  asset_category: number;
  asset_name: string;
  serial_number?: string;
  quantity: number;
  unit: number;
}

export interface CreateFixedAssetRequest {
  supplier_name: string;
  invoice_number?: string;
  remarks?: string;
  items: CreateFixedAssetItem[];
}

export interface CreateFixedAssetResponse {
  message: string;
  id: number;
  work_order_number?: string;
}

// API functions
export const fixedAssetsApi = {
  /**
   * Get asset categories for the dropdown
   */
  getCategories: async (): Promise<AssetCategory[]> => {
    const response = await apiClient.get<AssetCategory[]>(
      '/fixed-asset-gatein/gate-entries/fixed-asset/categories/',
    );
    return response.data;
  },

  /**
   * Get fixed asset entry by vehicle entry ID
   */
  getByEntryId: async (entryId: number): Promise<FixedAssetEntry> => {
    const response = await apiClient.get<FixedAssetEntry>(
      `/fixed-asset-gatein/gate-entries/${entryId}/fixed-asset/`,
    );
    return response.data;
  },

  /**
   * Create fixed asset entry for a vehicle entry
   */
  create: async (
    entryId: number,
    data: CreateFixedAssetRequest,
  ): Promise<CreateFixedAssetResponse> => {
    const response = await apiClient.post<CreateFixedAssetResponse>(
      `/fixed-asset-gatein/gate-entries/${entryId}/fixed-asset/`,
      data,
    );
    return response.data;
  },

  /**
   * Update fixed asset entry for a vehicle entry
   */
  update: async (
    entryId: number,
    data: CreateFixedAssetRequest,
  ): Promise<CreateFixedAssetResponse> => {
    const response = await apiClient.put<CreateFixedAssetResponse>(
      `/fixed-asset-gatein/gate-entries/${entryId}/fixed-asset/update/`,
      data,
    );
    return response.data;
  },

  /**
   * Complete a fixed asset gate entry
   */
  complete: async (entryId: number): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(
      `/fixed-asset-gatein/gate-entries/${entryId}/complete/`,
    );
    return response.data;
  },
};
