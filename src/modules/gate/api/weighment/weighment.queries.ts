import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CreateWeighmentRequest, weighmentApi } from './weighment.api';

export function useWeighment(entryId: number | null) {
  return useQuery({
    queryKey: ['weighment', entryId],
    queryFn: () => weighmentApi.get(entryId!),
    enabled: !!entryId,
  });
}

export function useCreateWeighment(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWeighmentRequest) => weighmentApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighment'] });
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] });
    },
  });
}
