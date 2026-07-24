import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CreateProductionQCSessionRequest,
  ProductionQCApprovalRequest,
  ProductionQCCounts,
  ProductionQCListParams,
  ProductionQCRejectRequest,
  ProductionQCRunningRun,
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

  // Sessions submitted by production/QC and awaiting QA approval
  async pending(): Promise<ProductionQCSessionListItem[]> {
    const response = await apiClient.get<ProductionQCSessionListItem[]>(
      EP.PRODUCTION_QC_PENDING,
    );
    return response.data;
  },

  // Currently-running production runs a QC user can select to do QC on
  async runningRuns(lineId?: number): Promise<ProductionQCRunningRun[]> {
    const response = await apiClient.get<ProductionQCRunningRun[]>(
      EP.PRODUCTION_QC_RUNNING_RUNS,
      { params: lineId ? { line: lineId } : undefined },
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

  // Production requests final FG QC approval; QC selects parameters later
  async requestFinalApproval(runId: number): Promise<ProductionQCSession> {
    const response = await apiClient.post<ProductionQCSession>(
      EP.PRODUCTION_QC_FINAL_REQUEST(runId),
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

  async approveSession(
    sessionId: number,
    data: ProductionQCApprovalRequest,
  ): Promise<ProductionQCSession> {
    const response = await apiClient.post<ProductionQCSession>(
      EP.PRODUCTION_QC_SESSION_APPROVE(sessionId),
      data,
    );
    return response.data;
  },

  async rejectSession(
    sessionId: number,
    data: ProductionQCRejectRequest,
  ): Promise<ProductionQCSession> {
    const response = await apiClient.post<ProductionQCSession>(
      EP.PRODUCTION_QC_SESSION_REJECT(sessionId),
      data,
    );
    return response.data;
  },
};
