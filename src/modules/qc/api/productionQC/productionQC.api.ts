import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CreateProductionQCSessionRequest,
  ProductionQCCounts,
  ProductionQCListParams,
  ProductionQCSession,
  ProductionQCSessionListItem,
  ProductionQCSubmitRequest,
  UpdateProductionQCResultRequest,
} from '../../types';

const EP = API_ENDPOINTS.QUALITY_CONTROL_V2;

export const productionQCApi = {
  // List all sessions (with filters)
  async list(params?: ProductionQCListParams): Promise<ProductionQCSessionListItem[]> {
    const response = await apiClient.get<ProductionQCSessionListItem[]>(
      EP.PRODUCTION_QC_LIST,
      { params },
    );
    return response.data;
  },

  // Get counts for dashboard
  async counts(): Promise<ProductionQCCounts> {
    const response = await apiClient.get<ProductionQCCounts>(
      EP.PRODUCTION_QC_COUNTS,
    );
    return response.data;
  },

  // List sessions for a specific run
  async getRunSessions(
    runId: number,
    sessionType?: string,
  ): Promise<ProductionQCSessionListItem[]> {
    const response = await apiClient.get<ProductionQCSessionListItem[]>(
      EP.PRODUCTION_QC_RUN_SESSIONS(runId),
      { params: sessionType ? { session_type: sessionType } : undefined },
    );
    return response.data;
  },

  // Create a new QC session for a run
  async createSession(
    runId: number,
    data: CreateProductionQCSessionRequest,
  ): Promise<ProductionQCSession> {
    const response = await apiClient.post<ProductionQCSession>(
      EP.PRODUCTION_QC_RUN_SESSIONS(runId),
      data,
    );
    return response.data;
  },

  // Get session detail
  async getSession(sessionId: number): Promise<ProductionQCSession> {
    const response = await apiClient.get<ProductionQCSession>(
      EP.PRODUCTION_QC_SESSION_DETAIL(sessionId),
    );
    return response.data;
  },

  // Delete session (soft-delete, only DRAFT)
  async deleteSession(sessionId: number): Promise<void> {
    await apiClient.delete(EP.PRODUCTION_QC_SESSION_DETAIL(sessionId));
  },

  // Update parameter results in a session
  async updateResults(
    sessionId: number,
    results: UpdateProductionQCResultRequest[],
  ): Promise<ProductionQCSession> {
    const response = await apiClient.post<ProductionQCSession>(
      EP.PRODUCTION_QC_SESSION_RESULTS(sessionId),
      { results },
    );
    return response.data;
  },

  // Submit session with PASS/FAIL result (finalize, cannot change after)
  async submitSession(
    sessionId: number,
    data: ProductionQCSubmitRequest,
  ): Promise<ProductionQCSession> {
    const response = await apiClient.post<ProductionQCSession>(
      EP.PRODUCTION_QC_SESSION_SUBMIT(sessionId),
      data,
    );
    return response.data;
  },
};
