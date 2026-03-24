import { apiClient } from '@/core/api';

import type {
  ActionPointsResponse,
  ConditionType,
  RuleAuditLog,
  RuleCheckResult,
  WorkflowRule,
  WorkflowRuleCreate,
  WorkflowRuleUpdate,
} from '../types';

const EP = '/workflow-rules';

export const settingsApi = {
  // Action Points
  getActionPoints: () =>
    apiClient.get<ActionPointsResponse>(`${EP}/action-points/`).then((r) => r.data),

  // Condition Types
  getConditionTypes: () =>
    apiClient.get<ConditionType[]>(`${EP}/condition-types/`).then((r) => r.data),

  // Rules CRUD
  getRules: (params?: { action_key?: string; is_active?: string }) =>
    apiClient.get<WorkflowRule[]>(`${EP}/rules/`, { params }).then((r) => r.data),

  getRule: (id: number) =>
    apiClient.get<WorkflowRule>(`${EP}/rules/${id}/`).then((r) => r.data),

  createRule: (data: WorkflowRuleCreate) =>
    apiClient.post<WorkflowRule>(`${EP}/rules/`, data).then((r) => r.data),

  updateRule: (id: number, data: WorkflowRuleUpdate) =>
    apiClient.patch<WorkflowRule>(`${EP}/rules/${id}/`, data).then((r) => r.data),

  deleteRule: (id: number) =>
    apiClient.delete(`${EP}/rules/${id}/`).then((r) => r.data),

  toggleRule: (id: number, reason?: string) =>
    apiClient.post<WorkflowRule>(`${EP}/rules/${id}/toggle/`, { reason }).then((r) => r.data),

  // Rule Check
  checkRules: (action_key: string, context?: Record<string, unknown>) =>
    apiClient
      .post<{ results: RuleCheckResult[] }>(`${EP}/check/`, { action_key, context })
      .then((r) => r.data),

  // Audit Log
  getAuditLog: (params?: { rule?: number; page?: number }) =>
    apiClient
      .get<{ count: number; results: RuleAuditLog[] }>(`${EP}/audit-log/`, { params })
      .then((r) => r.data),
};
