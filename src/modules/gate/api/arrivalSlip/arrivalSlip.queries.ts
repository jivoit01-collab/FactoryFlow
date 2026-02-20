import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  arrivalSlipApi,
  type ArrivalSlipListParams,
  type CreateArrivalSlipRequest,
  type SubmitArrivalSlipRequest,
} from './arrivalSlip.api';

export function useArrivalSlip(poItemReceiptId: number | null) {
  return useQuery({
    queryKey: ['arrivalSlip', poItemReceiptId],
    queryFn: () => arrivalSlipApi.get(poItemReceiptId!),
    enabled: !!poItemReceiptId,
  });
}

export function useArrivalSlipById(slipId: number | null) {
  return useQuery({
    queryKey: ['arrivalSlipById', slipId],
    queryFn: () => arrivalSlipApi.getById(slipId!),
    enabled: !!slipId,
  });
}

export function useArrivalSlips(params?: ArrivalSlipListParams) {
  return useQuery({
    queryKey: ['arrivalSlips', params],
    queryFn: () => arrivalSlipApi.list(params),
  });
}

export function useCreateArrivalSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      poItemReceiptId,
      data,
    }: {
      poItemReceiptId: number;
      data: CreateArrivalSlipRequest;
    }) => arrivalSlipApi.create(poItemReceiptId, data),
    onSuccess: (_, { poItemReceiptId }) => {
      queryClient.invalidateQueries({ queryKey: ['arrivalSlip', poItemReceiptId] });
      queryClient.invalidateQueries({ queryKey: ['arrivalSlips'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
    },
  });
}

export function useUpdateArrivalSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      poItemReceiptId,
      data,
    }: {
      poItemReceiptId: number;
      data: CreateArrivalSlipRequest;
    }) => arrivalSlipApi.update(poItemReceiptId, data),
    onSuccess: (_, { poItemReceiptId }) => {
      queryClient.invalidateQueries({ queryKey: ['arrivalSlip', poItemReceiptId] });
      queryClient.invalidateQueries({ queryKey: ['arrivalSlips'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
    },
  });
}

export function useSubmitArrivalSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SubmitArrivalSlipRequest) => arrivalSlipApi.submit(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrivalSlip'] });
      queryClient.invalidateQueries({ queryKey: ['arrivalSlips'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
      queryClient.invalidateQueries({ queryKey: ['pendingInspections'] });
    },
  });
}
