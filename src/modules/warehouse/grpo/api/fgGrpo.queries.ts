import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { GRPOListParams, PostGRPORequest } from '../types';
import { fgGrpoApi } from './fgGrpo.api';

const FG_GRPO_KEYS = {
  pending: (params: GRPOListParams) => ['fgGrpoPending', params] as const,
  preview: (id: number) => ['fgGrpoPreview', id] as const,
};

export function useFGPendingGRPOEntries(params: GRPOListParams = {}) {
  return useQuery({
    queryKey: FG_GRPO_KEYS.pending(params),
    queryFn: () => fgGrpoApi.getPendingEntries(params),
    refetchInterval: 60_000,
  });
}

export function useFGGRPOPreview(vehicleEntryId: number | null) {
  return useQuery({
    queryKey: FG_GRPO_KEYS.preview(vehicleEntryId ?? 0),
    queryFn: () => fgGrpoApi.getPreview(vehicleEntryId!),
    enabled: !!vehicleEntryId,
  });
}

export function usePostFGGRPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostGRPORequest) => fgGrpoApi.post(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fgGrpoPending'] });
      queryClient.invalidateQueries({ queryKey: ['fgGrpoPreview'] });
    },
  });
}
