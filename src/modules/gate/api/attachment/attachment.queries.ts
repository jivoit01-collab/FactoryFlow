import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { attachmentApi } from './attachment.api';

export function useGateAttachments(entryId: number | null) {
  return useQuery({
    queryKey: ['gateAttachments', entryId],
    queryFn: () => attachmentApi.getAll(entryId!),
    enabled: !!entryId,
  });
}

export function useGateAttachmentHistory(entryId: number | null) {
  return useQuery({
    queryKey: ['gateAttachments', entryId, 'history'],
    queryFn: () => attachmentApi.getHistory(entryId!),
    enabled: !!entryId,
  });
}

export function useUploadAttachment(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => attachmentApi.upload(entryId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateAttachments', entryId] });
    },
  });
}

export function useRemoveAttachment(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attachmentId, reason }: { attachmentId: number; reason?: string }) =>
      attachmentApi.remove(entryId, attachmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateAttachments', entryId] });
    },
  });
}
