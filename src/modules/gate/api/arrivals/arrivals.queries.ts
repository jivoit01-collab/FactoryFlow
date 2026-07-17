import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ArrivalCreateRequest,
  type ArrivalWeighmentRequest,
  arrivalsApi,
} from './arrivals.api';

export const ARRIVALS_QUERY_KEYS = {
  all: ['arrivals'] as const,
  expected: (vehicleId?: number | null) =>
    [...ARRIVALS_QUERY_KEYS.all, 'expected', vehicleId] as const,
  list: (openOnly?: boolean) => [...ARRIVALS_QUERY_KEYS.all, 'list', openOnly] as const,
  gatepassReadiness: (id?: number | null) =>
    [...ARRIVALS_QUERY_KEYS.all, 'gatepassReadiness', id] as const,
  workspace: (id?: number | null) => [...ARRIVALS_QUERY_KEYS.all, 'workspace', id] as const,
};

/** Bills booked to a vehicle across the user's companies, grouped by company. */
export function useArrivalExpected(vehicleId?: number | null) {
  return useQuery({
    queryKey: ARRIVALS_QUERY_KEYS.expected(vehicleId),
    queryFn: () => arrivalsApi.expected(vehicleId!),
    enabled: !!vehicleId,
    staleTime: 30 * 1000,
  });
}

export function useArrivals(openOnly = false, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ARRIVALS_QUERY_KEYS.list(openOnly),
    queryFn: () => arrivalsApi.list(openOnly),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/** Invalidate everything an arrival mutation can touch. */
function invalidateArrivalRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ARRIVALS_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: ['emptyVehicleIn'] });
  queryClient.invalidateQueries({ queryKey: ['salesDispatch'] });
  queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
  queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
  queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
}

export function useCreateArrival() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ArrivalCreateRequest) => arrivalsApi.create(data),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}

export function useDepartArrival() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, securityName }: { id: number; securityName?: string }) =>
      arrivalsApi.depart(id, securityName),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}

export function useEmptyOutArrival() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      arrivalsApi.emptyOut(id, reason),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}

/** Per-company readiness for the one combined ARV/... gatepass on a truck. */
export function useArrivalGatepassReadiness(id?: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ARRIVALS_QUERY_KEYS.gatepassReadiness(id),
    queryFn: () => arrivalsApi.gatepassReadiness(id!),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 15 * 1000,
  });
}

export function usePrintArrivalGatepass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, printerName }: { id: number; printerName?: string }) =>
      arrivalsApi.gatepassPrint(id, printerName),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}

export function useCommitArrivalGatepass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => arrivalsApi.gatepassCommit(id),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}

export function useReprintArrivalGatepass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reprintReason,
      printerName,
    }: {
      id: number;
      reprintReason: string;
      printerName?: string;
    }) => arrivalsApi.gatepassReprint(id, reprintReason, printerName),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}

export function useDispatchArrival() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => arrivalsApi.dispatch(id),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}

/** The whole truck as one payload — powers the single-truck workspace screen. */
export function useArrivalWorkspace(id?: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ARRIVALS_QUERY_KEYS.workspace(id),
    queryFn: () => arrivalsApi.workspace(id!),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 10 * 1000,
  });
}

/** Record the truck's single gross weighing across every company's docking at once. */
export function useRecordArrivalWeighment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ArrivalWeighmentRequest }) =>
      arrivalsApi.recordWeighment(id, data),
    onSuccess: () => invalidateArrivalRelated(queryClient),
  });
}
