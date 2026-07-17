import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  MaterialIndent,
  MaterialIndentDecisionPayload,
  MaterialIndentFilters,
  MaterialIndentPayload,
  MaterialIndentPurchasePayload,
  MaterialIndentReviewPayload,
  MaterialIndentUpdatePayload,
} from '../types';

const EP = API_ENDPOINTS.MAINTENANCE;

function cleanFilters(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL',
    ),
  );
}

export const materialIndentApi = {
  async getIndents(filters?: MaterialIndentFilters): Promise<MaterialIndent[]> {
    const response = await apiClient.get<MaterialIndent[]>(EP.MATERIAL_INDENTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getIndent(indentId: number): Promise<MaterialIndent> {
    const response = await apiClient.get<MaterialIndent>(EP.MATERIAL_INDENT_DETAIL(indentId));
    return response.data;
  },

  async createIndent(payload: MaterialIndentPayload): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(EP.MATERIAL_INDENTS, payload);
    return response.data;
  },

  async updateIndent(
    indentId: number,
    payload: MaterialIndentUpdatePayload,
  ): Promise<MaterialIndent> {
    const response = await apiClient.patch<MaterialIndent>(
      EP.MATERIAL_INDENT_DETAIL(indentId),
      payload,
    );
    return response.data;
  },

  async deleteIndent(indentId: number): Promise<void> {
    await apiClient.delete(EP.MATERIAL_INDENT_DETAIL(indentId));
  },

  // ---- Workflow (each stamps user + timestamp server-side) ----

  // Requester → Store Engineer.
  async submitIndent(indentId: number): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(EP.MATERIAL_INDENT_SUBMIT(indentId));
    return response.data;
  },

  // Store engineer records issued qty per item; shortfall goes for purchase approval.
  async reviewIndent(
    indentId: number,
    payload: MaterialIndentReviewPayload,
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_REVIEW(indentId),
      payload,
    );
    return response.data;
  },

  // Higher authority approves the purchase of the shortfall.
  async approveIndent(
    indentId: number,
    payload: MaterialIndentDecisionPayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_APPROVE(indentId),
      payload,
    );
    return response.data;
  },

  // Purchaser marks the approved shortfall as purchased.
  async purchaseIndent(
    indentId: number,
    payload: MaterialIndentPurchasePayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_PURCHASE(indentId),
      payload,
    );
    return response.data;
  },

  async rejectIndent(
    indentId: number,
    payload: MaterialIndentDecisionPayload = {},
  ): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(
      EP.MATERIAL_INDENT_REJECT(indentId),
      payload,
    );
    return response.data;
  },

  async cancelIndent(indentId: number): Promise<MaterialIndent> {
    const response = await apiClient.post<MaterialIndent>(EP.MATERIAL_INDENT_CANCEL(indentId));
    return response.data;
  },
};
