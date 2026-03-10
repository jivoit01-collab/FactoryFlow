import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateDailyEntryRequest,
  CreateMaterialRequest,
  CreatePlanRequest,
  CreateWeeklyPlanRequest,
  UpdateDailyEntryRequest,
  UpdatePlanRequest,
  UpdateWeeklyPlanRequest,
} from '../types';
import { planningApi } from './planning.api';

// ============================================================================
// Query Keys
// ============================================================================

export const PLANNING_QUERY_KEYS = {
  all: ['production-planning'] as const,
  plans: (status?: string, month?: string) =>
    [...PLANNING_QUERY_KEYS.all, 'plans', { status, month }] as const,
  planDetail: (planId: number) => [...PLANNING_QUERY_KEYS.all, 'detail', planId] as const,
  summary: (month?: string) => [...PLANNING_QUERY_KEYS.all, 'summary', month] as const,
  materials: (planId: number) => [...PLANNING_QUERY_KEYS.all, 'materials', planId] as const,
  weeklyPlans: (planId: number) => [...PLANNING_QUERY_KEYS.all, 'weekly', planId] as const,
  dailyEntries: (weekId: number) => [...PLANNING_QUERY_KEYS.all, 'daily', weekId] as const,
  dailyEntriesAll: (planId?: number) =>
    [...PLANNING_QUERY_KEYS.all, 'daily-all', planId] as const,
  // Dropdowns
  items: (type?: string, search?: string) =>
    [...PLANNING_QUERY_KEYS.all, 'dropdown-items', { type, search }] as const,
  uoms: () => [...PLANNING_QUERY_KEYS.all, 'dropdown-uom'] as const,
  warehouses: () => [...PLANNING_QUERY_KEYS.all, 'dropdown-warehouses'] as const,
  bom: (itemCode: string, plannedQty?: number) =>
    [...PLANNING_QUERY_KEYS.all, 'dropdown-bom', { itemCode, plannedQty }] as const,
};

// ============================================================================
// Dropdown Queries
// ============================================================================

export function useItemsDropdown(
  type?: 'finished' | 'raw',
  search?: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.items(type, search),
    queryFn: () => planningApi.getItems(type, search),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUoMDropdown(enabled: boolean = true) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.uoms(),
    queryFn: () => planningApi.getUoMs(),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useWarehousesDropdown(enabled: boolean = true) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.warehouses(),
    queryFn: () => planningApi.getWarehouses(),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useBOMDropdown(itemCode: string, plannedQty?: number) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.bom(itemCode, plannedQty),
    queryFn: () => planningApi.getBOM(itemCode, plannedQty),
    enabled: !!itemCode,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// Plan Queries
// ============================================================================

export function usePlans(status?: string, month?: string) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.plans(status, month),
    queryFn: () => planningApi.getPlans(status, month),
    staleTime: 30 * 1000,
  });
}

export function usePlanDetail(planId: number | null) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.planDetail(planId!),
    queryFn: () => planningApi.getPlanDetail(planId!),
    enabled: !!planId,
  });
}

export function usePlanSummary(month?: string) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.summary(month),
    queryFn: () => planningApi.getSummary(month),
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Plan Mutations
// ============================================================================

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanRequest) => planningApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.all });
    },
  });
}

export function useUpdatePlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePlanRequest) => planningApi.updatePlan(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({
        queryKey: PLANNING_QUERY_KEYS.all,
        predicate: (query) => query.queryKey.includes('plans'),
      });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => planningApi.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.all });
    },
  });
}

export function usePostToSAP(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => planningApi.postToSAP(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({
        queryKey: PLANNING_QUERY_KEYS.all,
        predicate: (query) => query.queryKey.includes('plans') || query.queryKey.includes('summary'),
      });
    },
  });
}

export function useClosePlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => planningApi.closePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({
        queryKey: PLANNING_QUERY_KEYS.all,
        predicate: (query) => query.queryKey.includes('plans') || query.queryKey.includes('summary'),
      });
    },
  });
}

// ============================================================================
// Material Mutations
// ============================================================================

export function useAddMaterial(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaterialRequest) => planningApi.addMaterial(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.materials(planId) });
    },
  });
}

export function useDeleteMaterial(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (materialId: number) => planningApi.deleteMaterial(planId, materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.materials(planId) });
    },
  });
}

// ============================================================================
// Weekly Plan Mutations
// ============================================================================

export function useCreateWeeklyPlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWeeklyPlanRequest) => planningApi.createWeeklyPlan(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.weeklyPlans(planId) });
    },
  });
}

export function useUpdateWeeklyPlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weekId, data }: { weekId: number; data: UpdateWeeklyPlanRequest }) =>
      planningApi.updateWeeklyPlan(planId, weekId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.weeklyPlans(planId) });
    },
  });
}

export function useDeleteWeeklyPlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekId: number) => planningApi.deleteWeeklyPlan(planId, weekId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.weeklyPlans(planId) });
    },
  });
}

// ============================================================================
// Daily Entry Queries & Mutations
// ============================================================================

export function useDailyEntries(weekId: number | null) {
  return useQuery({
    queryKey: PLANNING_QUERY_KEYS.dailyEntries(weekId!),
    queryFn: () => planningApi.getDailyEntries(weekId!),
    enabled: !!weekId,
  });
}

export function useCreateDailyEntry(weekId: number, planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDailyEntryRequest) => planningApi.createDailyEntry(weekId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.dailyEntries(weekId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.weeklyPlans(planId) });
    },
  });
}

export function useUpdateDailyEntry(weekId: number, planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: UpdateDailyEntryRequest }) =>
      planningApi.updateDailyEntry(weekId, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.dailyEntries(weekId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.planDetail(planId) });
      queryClient.invalidateQueries({ queryKey: PLANNING_QUERY_KEYS.weeklyPlans(planId) });
    },
  });
}
