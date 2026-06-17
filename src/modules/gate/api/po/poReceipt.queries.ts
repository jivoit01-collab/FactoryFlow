import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreatePOReceiptRequest } from './po.api';
import { poReceiptApi, type ReplacePOReceiptRequest } from './poReceipt.api';

export function usePOReceipts(entryId: number | null) {
  return useQuery({
    queryKey: ['poReceipts', entryId],
    queryFn: () => poReceiptApi.get(entryId!),
    enabled: !!entryId,
  });
}

export function useCreatePOReceipt(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOReceiptRequest) => poReceiptApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useUpdatePOReceipt(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poReceiptId, data }: { poReceiptId: number; data: CreatePOReceiptRequest }) =>
      poReceiptApi.update(entryId, poReceiptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useReplacePOReceipt(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poReceiptId, data }: { poReceiptId: number; data: ReplacePOReceiptRequest }) =>
      poReceiptApi.replace(entryId, poReceiptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}
