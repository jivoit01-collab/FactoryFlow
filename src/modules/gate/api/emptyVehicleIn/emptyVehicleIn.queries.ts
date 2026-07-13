import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AddBillToInsideVehicleRequest,
  type AddBillToTruckRequest,
  type EmptyVehicleGateInCreateRequest,
  type EmptyVehicleGateInParams,
  type EmptyVehicleGateInUpdateRequest,
  emptyVehicleInApi,
  type MoveBillBetweenVehiclesRequest,
  type RemoveBillFromInsideVehicleRequest,
  type UnlinkAllBillsRequest,
} from './emptyVehicleIn.api';

export const EMPTY_VEHICLE_IN_QUERY_KEYS = {
  all: ['emptyVehicleIn'] as const,
  reasons: () => [...EMPTY_VEHICLE_IN_QUERY_KEYS.all, 'reasons'] as const,
  list: (params?: EmptyVehicleGateInParams) =>
    [...EMPTY_VEHICLE_IN_QUERY_KEYS.all, 'list', params] as const,
  detail: (id?: number | null) => [...EMPTY_VEHICLE_IN_QUERY_KEYS.all, 'detail', id] as const,
  eligible: (params?: EmptyVehicleGateInParams) =>
    [...EMPTY_VEHICLE_IN_QUERY_KEYS.all, 'eligible', params] as const,
};

export function useEmptyVehicleGateInReasons() {
  return useQuery({
    queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.reasons(),
    queryFn: () => emptyVehicleInApi.reasons(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmptyVehicleGateInEntries(
  params?: EmptyVehicleGateInParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.list(params),
    queryFn: () => emptyVehicleInApi.list(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useEligibleEmptyVehicleGateInEntries(
  params?: EmptyVehicleGateInParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.eligible(params),
    queryFn: () => emptyVehicleInApi.eligible(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useEmptyVehicleGateIn(id?: number | null) {
  return useQuery({
    queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.detail(id),
    queryFn: () => emptyVehicleInApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateEmptyVehicleGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmptyVehicleGateInCreateRequest) => emptyVehicleInApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}

export function useUpdateEmptyVehicleGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmptyVehicleGateInUpdateRequest }) =>
      emptyVehicleInApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['bstOut'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}

export const INSIDE_DISPATCH_VEHICLES_QUERY_KEY = [
  ...EMPTY_VEHICLE_IN_QUERY_KEYS.all,
  'insideDispatchVehicles',
] as const;

export function useInsideDispatchVehicles(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: INSIDE_DISPATCH_VEHICLES_QUERY_KEY,
    queryFn: () => emptyVehicleInApi.listInsideDispatchVehicles(),
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

function useInsideVehicleInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
    queryClient.invalidateQueries({ queryKey: ['salesDispatch'] });
  };
}

export function useAddBillToInsideVehicle() {
  const invalidate = useInsideVehicleInvalidation();

  return useMutation({
    mutationFn: (data: AddBillToInsideVehicleRequest) =>
      emptyVehicleInApi.addBillToInsideVehicle(data),
    onSuccess: invalidate,
  });
}

/** Add a bill of any company to a physical truck (creates the company's chain). */
export function useAddBillToTruck() {
  const invalidate = useInsideVehicleInvalidation();

  return useMutation({
    mutationFn: (data: AddBillToTruckRequest) => emptyVehicleInApi.addBillToTruck(data),
    onSuccess: invalidate,
  });
}

export function useRemoveBillFromInsideVehicle() {
  const invalidate = useInsideVehicleInvalidation();

  return useMutation({
    mutationFn: (data: RemoveBillFromInsideVehicleRequest) =>
      emptyVehicleInApi.removeBillFromInsideVehicle(data),
    onSuccess: invalidate,
  });
}

export function useMoveBillBetweenVehicles() {
  const invalidate = useInsideVehicleInvalidation();

  return useMutation({
    mutationFn: (data: MoveBillBetweenVehiclesRequest) =>
      emptyVehicleInApi.moveBillBetweenVehicles(data),
    onSuccess: invalidate,
  });
}

export function useUnlinkAllBills() {
  const invalidate = useInsideVehicleInvalidation();

  return useMutation({
    mutationFn: (data: UnlinkAllBillsRequest) => emptyVehicleInApi.unlinkAllBills(data),
    onSuccess: invalidate,
  });
}

export function useCompleteEmptyVehicleGateIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => emptyVehicleInApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPTY_VEHICLE_IN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['salesDispatch'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}
