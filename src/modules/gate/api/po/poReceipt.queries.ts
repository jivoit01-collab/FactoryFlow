import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreatePOReceiptRequest } from './po.api';
import {
  poReceiptApi,
  type ReplacePOReceiptRequest,
  type RepointPOReceiptRequest,
} from './poReceipt.api';

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

/**
 * Move a received PO onto a different open PO for the same vendor, keeping its
 * items and QC. Used from the GRPO preview when the PO ran out before posting.
 */
export function useRepointPOReceipt(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poReceiptId, data }: { poReceiptId: number; data: RepointPOReceiptRequest }) =>
      poReceiptApi.repoint(entryId, poReceiptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
      // The GRPO preview and any saved draft both read the receipt's PO linkage.
      queryClient.invalidateQueries({ queryKey: ['grpo'] });
    },
  });
}
