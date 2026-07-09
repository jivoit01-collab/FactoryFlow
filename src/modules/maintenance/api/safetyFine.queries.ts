import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  SafetyFineFilters,
  SafetyFinePayload,
  SafetyFinePhotoUploadPayload,
  SafetyFineSettlePayload,
  SafetyFineUpdatePayload,
  SafetyViolationTypeFilters,
  SafetyViolationTypePayload,
} from '../types';
import { safetyFineApi } from './safetyFine.api';

export const SAFETY_FINE_QUERY_KEYS = {
  all: ['maintenance', 'safety-fines'] as const,
  list: (filters?: SafetyFineFilters) =>
    [...SAFETY_FINE_QUERY_KEYS.all, 'list', filters ?? {}] as const,
  detail: (fineId: number) => [...SAFETY_FINE_QUERY_KEYS.all, 'detail', fineId] as const,
  types: (filters?: SafetyViolationTypeFilters) =>
    ['maintenance', 'safety-violation-types', filters ?? {}] as const,
};

function invalidateFines(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: SAFETY_FINE_QUERY_KEYS.all });
}

function invalidateTypes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'safety-violation-types'] });
}

// ---- Violation types ----

export function useSafetyViolationTypes(filters?: SafetyViolationTypeFilters, enabled = true) {
  return useQuery({
    queryKey: SAFETY_FINE_QUERY_KEYS.types(filters),
    queryFn: () => safetyFineApi.getViolationTypes(filters),
    enabled,
  });
}

export function useCreateSafetyViolationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SafetyViolationTypePayload) => safetyFineApi.createViolationType(payload),
    onSuccess: () => invalidateTypes(queryClient),
  });
}

export function useUpdateSafetyViolationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      payload,
    }: {
      typeId: number;
      payload: Partial<SafetyViolationTypePayload>;
    }) => safetyFineApi.updateViolationType(typeId, payload),
    onSuccess: () => invalidateTypes(queryClient),
  });
}

export function useDeleteSafetyViolationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: number) => safetyFineApi.deleteViolationType(typeId),
    onSuccess: () => invalidateTypes(queryClient),
  });
}

// ---- Fines ----

export function useSafetyFines(filters?: SafetyFineFilters, enabled = true) {
  return useQuery({
    queryKey: SAFETY_FINE_QUERY_KEYS.list(filters),
    queryFn: () => safetyFineApi.getFines(filters),
    enabled,
  });
}

export function useSafetyFine(fineId: number | null) {
  return useQuery({
    queryKey: SAFETY_FINE_QUERY_KEYS.detail(fineId!),
    queryFn: () => safetyFineApi.getFine(fineId!),
    enabled: fineId !== null,
  });
}

export function useCreateSafetyFine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SafetyFinePayload) => safetyFineApi.createFine(payload),
    onSuccess: () => invalidateFines(queryClient),
  });
}

export function useUpdateSafetyFine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fineId, payload }: { fineId: number; payload: SafetyFineUpdatePayload }) =>
      safetyFineApi.updateFine(fineId, payload),
    onSuccess: () => invalidateFines(queryClient),
  });
}

export function useDeleteSafetyFine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fineId: number) => safetyFineApi.deleteFine(fineId),
    onSuccess: () => invalidateFines(queryClient),
  });
}

export function useSettleSafetyFine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fineId, payload }: { fineId: number; payload: SafetyFineSettlePayload }) =>
      safetyFineApi.settleFine(fineId, payload),
    onSuccess: () => invalidateFines(queryClient),
  });
}

export function useUploadSafetyFinePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SafetyFinePhotoUploadPayload) => safetyFineApi.uploadPhoto(payload),
    onSuccess: () => invalidateFines(queryClient),
  });
}

export function useDeleteSafetyFinePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => safetyFineApi.deletePhoto(photoId),
    onSuccess: () => invalidateFines(queryClient),
  });
}
