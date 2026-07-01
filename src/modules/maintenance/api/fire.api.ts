import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  FireCategory,
  FireCategoryPayload,
  FireIssuePayload,
  FireItem,
  FireItemFilters,
  FireItemPayload,
  FireMovement,
  FireMovementFilters,
  FireRequest,
  FireRequestActionPayload,
  FireRequestFilters,
  FireRequestPayload,
  FireStockAdjustPayload,
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

export const fireApi = {
  async getFireItems(filters?: FireItemFilters): Promise<FireItem[]> {
    const response = await apiClient.get<FireItem[]>(EP.FIRE_ITEMS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getFireItem(itemId: number): Promise<FireItem> {
    const response = await apiClient.get<FireItem>(EP.FIRE_ITEM_DETAIL(itemId));
    return response.data;
  },

  async createFireItem(payload: FireItemPayload): Promise<FireItem> {
    const response = await apiClient.post<FireItem>(EP.FIRE_ITEMS, payload);
    return response.data;
  },

  async updateFireItem(itemId: number, payload: FireItemPayload): Promise<FireItem> {
    const response = await apiClient.put<FireItem>(EP.FIRE_ITEM_DETAIL(itemId), payload);
    return response.data;
  },

  async adjustFireStock(itemId: number, payload: FireStockAdjustPayload): Promise<FireItem> {
    const response = await apiClient.post<FireItem>(EP.FIRE_ITEM_ADJUST_STOCK(itemId), payload);
    return response.data;
  },

  async getLowStockFireItems(filters?: FireItemFilters): Promise<FireItem[]> {
    const response = await apiClient.get<FireItem[]>(EP.FIRE_ITEMS_LOW_STOCK, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getFireCategories(): Promise<FireCategory[]> {
    const response = await apiClient.get<FireCategory[]>(EP.FIRE_CATEGORIES);
    return response.data;
  },

  async createFireCategory(payload: FireCategoryPayload): Promise<FireCategory> {
    const response = await apiClient.post<FireCategory>(EP.FIRE_CATEGORIES, payload);
    return response.data;
  },

  async updateFireCategory(
    categoryId: number,
    payload: FireCategoryPayload,
  ): Promise<FireCategory> {
    const response = await apiClient.put<FireCategory>(
      EP.FIRE_CATEGORY_DETAIL(categoryId),
      payload,
    );
    return response.data;
  },

  async getFireRequests(filters?: FireRequestFilters): Promise<FireRequest[]> {
    const response = await apiClient.get<FireRequest[]>(EP.FIRE_REQUESTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createFireRequest(payload: FireRequestPayload): Promise<FireRequest> {
    const response = await apiClient.post<FireRequest>(EP.FIRE_REQUESTS, payload);
    return response.data;
  },

  async issueFireRequest(requestId: number, payload: FireIssuePayload): Promise<FireRequest> {
    const response = await apiClient.post<FireRequest>(EP.FIRE_REQUEST_ISSUE(requestId), payload);
    return response.data;
  },

  async consumeFireRequest(
    requestId: number,
    payload: FireRequestActionPayload,
  ): Promise<FireRequest> {
    const response = await apiClient.post<FireRequest>(
      EP.FIRE_REQUEST_CONSUME(requestId),
      payload,
    );
    return response.data;
  },

  async returnUnusedFireRequest(
    requestId: number,
    payload: FireRequestActionPayload,
  ): Promise<FireRequest> {
    const response = await apiClient.post<FireRequest>(
      EP.FIRE_REQUEST_RETURN_UNUSED(requestId),
      payload,
    );
    return response.data;
  },

  async cancelFireRequest(requestId: number): Promise<FireRequest> {
    const response = await apiClient.post<FireRequest>(EP.FIRE_REQUEST_CANCEL(requestId));
    return response.data;
  },

  async getFireMovements(filters?: FireMovementFilters): Promise<FireMovement[]> {
    const response = await apiClient.get<FireMovement[]>(EP.FIRE_MOVEMENTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },
};
