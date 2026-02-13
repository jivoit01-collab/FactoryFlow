import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { attachmentApi } from './attachment.api';

export function useGateAttachments(entryId: number | null) {
  return useQuery({
    queryKey: ['gateAttachments', entryId],
    queryFn: () => attachmentApi.getAll(entryId!),
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
