import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { WorkflowRuleCreate, WorkflowRuleUpdate } from '../types';
import { settingsApi } from './settings.api';

// ============================================================================
// Query Keys
// ============================================================================

export const SETTINGS_QUERY_KEYS = {
  all: ['settings'] as const,
  actionPoints: () => [...SETTINGS_QUERY_KEYS.all, 'action-points'] as const,
  conditionTypes: () => [...SETTINGS_QUERY_KEYS.all, 'condition-types'] as const,
  rules: (actionKey?: string) => [...SETTINGS_QUERY_KEYS.all, 'rules', { actionKey }] as const,
  rule: (id: number) => [...SETTINGS_QUERY_KEYS.all, 'rule', id] as const,
  auditLog: (ruleId?: number, page?: number) =>
    [...SETTINGS_QUERY_KEYS.all, 'audit-log', { ruleId, page }] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useActionPoints() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.actionPoints(),
    queryFn: () => settingsApi.getActionPoints(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useConditionTypes() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.conditionTypes(),
    queryFn: () => settingsApi.getConditionTypes(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useWorkflowRules(actionKey?: string) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.rules(actionKey),
    queryFn: () => settingsApi.getRules(actionKey ? { action_key: actionKey } : undefined),
    staleTime: 30 * 1000,
  });
}

export function useWorkflowRule(id: number | null) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.rule(id ?? 0),
    queryFn: () => settingsApi.getRule(id!),
    enabled: id !== null,
  });
}

export function useAuditLog(ruleId?: number, page?: number) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.auditLog(ruleId, page),
    queryFn: () => settingsApi.getAuditLog({ rule: ruleId, page }),
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkflowRuleCreate) => settingsApi.createRule(data),
    onSuccess: () => {
      toast.success('Rule created');
      qc.invalidateQueries({ queryKey: [...SETTINGS_QUERY_KEYS.all, 'rules'] });
    },
    onError: () => {
      toast.error('Failed to create rule');
    },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WorkflowRuleUpdate }) =>
      settingsApi.updateRule(id, data),
    onSuccess: () => {
      toast.success('Rule updated');
      qc.invalidateQueries({ queryKey: [...SETTINGS_QUERY_KEYS.all, 'rules'] });
      qc.invalidateQueries({ queryKey: [...SETTINGS_QUERY_KEYS.all, 'rule'] });
    },
    onError: () => {
      toast.error('Failed to update rule');
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => settingsApi.deleteRule(id),
    onSuccess: () => {
      toast.success('Rule deleted');
      qc.invalidateQueries({ queryKey: [...SETTINGS_QUERY_KEYS.all, 'rules'] });
    },
    onError: () => {
      toast.error('Failed to delete rule');
    },
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      settingsApi.toggleRule(id, reason),
    onSuccess: () => {
      toast.success('Rule toggled');
      qc.invalidateQueries({ queryKey: [...SETTINGS_QUERY_KEYS.all, 'rules'] });
    },
    onError: () => {
      toast.error('Failed to toggle rule');
    },
  });
}

export function useCheckRules() {
  return useMutation({
    mutationFn: ({
      action_key,
      context,
    }: {
      action_key: string;
      context?: Record<string, unknown>;
    }) => settingsApi.checkRules(action_key, context),
  });
}
