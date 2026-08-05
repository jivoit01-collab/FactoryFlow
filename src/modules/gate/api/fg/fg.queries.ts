import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreatePOReceiptRequest } from '../po/po.api';
import { fgApi } from './fg.api';

export function useOpenFGPOs(supplierCode?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['fgOpenPOs', supplierCode],
    queryFn: () => fgApi.getOpenFGPOs(supplierCode),
    enabled: enabled && !!supplierCode,
  });
}

export function useFGReceipts(entryId: number | null) {
  return useQuery({
    queryKey: ['fgReceipts', entryId],
    queryFn: () => fgApi.getReceipts(entryId!),
    enabled: !!entryId,
  });
}

export function useCreateFGReceipt(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOReceiptRequest) => fgApi.createReceipt(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fgReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useUpdateFGReceipt(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poReceiptId, data }: { poReceiptId: number; data: CreatePOReceiptRequest }) =>
      fgApi.updateReceipt(entryId, poReceiptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fgReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useCompleteFGEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => fgApi.complete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useDeleteFGEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => fgApi.deleteEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}
