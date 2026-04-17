import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  labourVerificationApi,
  type SubmitLabourResponseRequest,
  type VerificationRequestFilters,
} from './labourVerification.api';

// ─── Query Keys ─────────────────────────────────────────────

const KEYS = {
  all: ['labourVerification'] as const,
  requests: () => [...KEYS.all, 'requests'] as const,
  requestList: (filters?: VerificationRequestFilters) =>
    [...KEYS.requests(), filters] as const,
  today: () => [...KEYS.all, 'today'] as const,
  detail: (id: number) => [...KEYS.all, 'detail', id] as const,
  myResponse: (requestId: number) => [...KEYS.all, 'myResponse', requestId] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function useVerificationRequests(filters?: VerificationRequestFilters) {
  return useQuery({
    queryKey: KEYS.requestList(filters),
    queryFn: () => labourVerificationApi.listRequests(filters),
  });
}

export function useTodayVerificationRequest() {
  return useQuery({
    queryKey: KEYS.today(),
    queryFn: () => labourVerificationApi.getTodayRequest(),
    refetchInterval: 30_000,
  });
}

export function useVerificationRequestDetail(id: number | null) {
  return useQuery({
    queryKey: KEYS.detail(id!),
    queryFn: () => labourVerificationApi.getRequestDetail(id!),
    enabled: id !== null,
    refetchInterval: 15_000,
  });
}

export function useMyDepartmentResponse(requestId: number | null) {
  return useQuery({
    queryKey: KEYS.myResponse(requestId!),
    queryFn: () => labourVerificationApi.getMyResponse(requestId!),
    enabled: requestId !== null,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateVerificationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => labourVerificationApi.createRequest(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useSubmitDepartmentResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data: SubmitLabourResponseRequest;
    }) => labourVerificationApi.submitResponse(requestId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.today() });
      queryClient.invalidateQueries({ queryKey: KEYS.detail(variables.requestId) });
      queryClient.invalidateQueries({ queryKey: KEYS.myResponse(variables.requestId) });
    },
  });
}

export function useCloseVerificationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labourVerificationApi.closeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
