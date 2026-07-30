import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ActivityDefinition,
  ActivitySummary,
  AllUsersActivity,
  CompletedActivity,
  PendingActivity,
  UserActivityDetail,
} from '../types';

/**
 * `days` is the completed-work window: 0 = since midnight today, 7 = the last week.
 * Pending work is always "as of now" and ignores the window.
 */
export interface ActivityQuery {
  days?: number;
  module?: string;
}

function params({ days, module }: ActivityQuery = {}) {
  return {
    ...(days === undefined ? {} : { days }),
    ...(module ? { module } : {}),
  };
}

export const activitiesApi = {
  async getMySummary(query: ActivityQuery = {}): Promise<ActivitySummary> {
    const response = await apiClient.get<ActivitySummary>(API_ENDPOINTS.ACTIVITY.MY_SUMMARY, {
      params: params(query),
    });
    return response.data;
  },

  async getMyPending(query: ActivityQuery = {}): Promise<PendingActivity[]> {
    const response = await apiClient.get<PendingActivity[]>(API_ENDPOINTS.ACTIVITY.MY_PENDING, {
      params: params(query),
    });
    return response.data;
  },

  async getMyCompleted(query: ActivityQuery = {}): Promise<CompletedActivity[]> {
    const response = await apiClient.get<CompletedActivity[]>(
      API_ENDPOINTS.ACTIVITY.MY_COMPLETED,
      { params: params(query) },
    );
    return response.data;
  },

  async getDefinitions(): Promise<ActivityDefinition[]> {
    const response = await apiClient.get<ActivityDefinition[]>(API_ENDPOINTS.ACTIVITY.DEFINITIONS);
    return response.data;
  },

  async getAllUsers(query: ActivityQuery = {}): Promise<AllUsersActivity> {
    const response = await apiClient.get<AllUsersActivity>(API_ENDPOINTS.ACTIVITY.USERS, {
      params: params(query),
    });
    return response.data;
  },

  async getUserDetail(userId: number, query: ActivityQuery = {}): Promise<UserActivityDetail> {
    const response = await apiClient.get<UserActivityDetail>(
      API_ENDPOINTS.ACTIVITY.USER_DETAIL(userId),
      { params: params(query) },
    );
    return response.data;
  },

  /**
   * Badge poll mounted on every page — a failure here must not raise an app-wide
   * toast, the badge just renders nothing.
   */
  async getPendingCount(): Promise<number> {
    const response = await apiClient.get<ActivitySummary>(API_ENDPOINTS.ACTIVITY.MY_SUMMARY, {
      suppressErrorToast: true,
    });
    return response.data.pending;
  },
};
