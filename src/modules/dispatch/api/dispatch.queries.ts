import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AssignBayRequest,
  DispatchRequest,
  InspectTrailerRequest,
  LinkVehicleRequest,
  LoadRequest,
  PickTaskUpdateRequest,
  RetryGoodsIssueRequest,
  ScanRequest,
  ShipmentFilters,
  SyncFilters,
} from '../types/dispatch.types';
import { dispatchApi } from './dispatch.api';

// Query keys
export const DISPATCH_QUERY_KEYS = {
  all: ['dispatch'] as const,
  shipments: (filters?: ShipmentFilters) =>
    [...DISPATCH_QUERY_KEYS.all, 'shipments', filters] as const,
  shipmentDetail: (id: number) =>
    [...DISPATCH_QUERY_KEYS.all, 'shipment', id] as const,
  pickTasks: (shipmentId: number) =>
    [...DISPATCH_QUERY_KEYS.all, 'pickTasks', shipmentId] as const,
  goodsIssue: (shipmentId: number) =>
    [...DISPATCH_QUERY_KEYS.all, 'goodsIssue', shipmentId] as const,
  dashboard: () => [...DISPATCH_QUERY_KEYS.all, 'dashboard'] as const,
};

// ── Query Hooks ──

export function useShipments(filters?: ShipmentFilters) {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.shipments(filters),
    queryFn: () => dispatchApi.getShipments(filters),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useShipmentDetail(id: number | null) {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.shipmentDetail(id!),
    queryFn: () => dispatchApi.getShipmentDetail(id!),
    enabled: !!id,
  });
}

export function usePickTasks(shipmentId: number | null) {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.pickTasks(shipmentId!),
    queryFn: () => dispatchApi.getPickTasks(shipmentId!),
    enabled: !!shipmentId,
    refetchInterval: 15 * 1000,
  });
}

export function useGoodsIssue(shipmentId: number | null) {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.goodsIssue(shipmentId!),
    queryFn: () => dispatchApi.getGoodsIssue(shipmentId!),
    enabled: !!shipmentId,
  });
}

export function useOutboundDashboard() {
  return useQuery({
    queryKey: DISPATCH_QUERY_KEYS.dashboard(),
    queryFn: () => dispatchApi.getDashboard(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ── Mutation Hooks ──

function useInvalidateShipment() {
  const queryClient = useQueryClient();
  return (shipmentId: number) => {
    queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.shipmentDetail(shipmentId) });
    queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.all });
  };
}

export function useSyncShipments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filters?: SyncFilters) => dispatchApi.syncShipments(filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.all });
    },
  });
}

export function useAssignBay(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: AssignBayRequest) => dispatchApi.assignBay(shipmentId, data),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useGeneratePicks(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => dispatchApi.generatePicks(shipmentId),
    onSuccess: () => {
      invalidate(shipmentId);
      queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.pickTasks(shipmentId) });
    },
  });
}

export function useUpdatePickTask(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: PickTaskUpdateRequest }) =>
      dispatchApi.updatePickTask(taskId, data),
    onSuccess: () => {
      invalidate(shipmentId);
      queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.pickTasks(shipmentId) });
    },
  });
}

export function useScanBarcode(shipmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: ScanRequest }) =>
      dispatchApi.scanBarcode(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.pickTasks(shipmentId) });
    },
  });
}

export function useConfirmPack(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: () => dispatchApi.confirmPack(shipmentId),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useStageShipment(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: () => dispatchApi.stageShipment(shipmentId),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useLinkVehicle(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: LinkVehicleRequest) => dispatchApi.linkVehicle(shipmentId, data),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useInspectTrailer(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: InspectTrailerRequest) => dispatchApi.inspectTrailer(shipmentId, data),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useLoadShipment(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: LoadRequest) => dispatchApi.loadShipment(shipmentId, data),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useSupervisorConfirm(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: () => dispatchApi.supervisorConfirm(shipmentId),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useGenerateBOL(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: () => dispatchApi.generateBOL(shipmentId),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useDispatchShipment(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  return useMutation({
    mutationFn: (data: DispatchRequest) => dispatchApi.dispatchShipment(shipmentId, data),
    onSuccess: () => invalidate(shipmentId),
  });
}

export function useRetryGoodsIssue(shipmentId: number) {
  const invalidate = useInvalidateShipment();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RetryGoodsIssueRequest) => dispatchApi.retryGoodsIssue(shipmentId, data),
    onSuccess: () => {
      invalidate(shipmentId);
      queryClient.invalidateQueries({ queryKey: DISPATCH_QUERY_KEYS.goodsIssue(shipmentId) });
    },
  });
}
