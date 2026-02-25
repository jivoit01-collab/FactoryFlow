import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { INSPECTION_QUERY_KEYS } from '../inspection/inspection.queries';
import { arrivalSlipApi, type SendBackRequest } from './arrivalSlip.api';

// Query keys
export const ARRIVAL_SLIP_QUERY_KEYS = {
  all: ['qc-arrivalSlips'] as const,
  detail: (id: number) => [...ARRIVAL_SLIP_QUERY_KEYS.all, 'detail', id] as const,
};

// Get arrival slip by ID (for prefilling inspection form)
export function useArrivalSlipById(slipId: number | null) {
  return useQuery({
    queryKey: ARRIVAL_SLIP_QUERY_KEYS.detail(slipId!),
    queryFn: () => arrivalSlipApi.getById(slipId!),
    enabled: !!slipId,
  });
}

// Send arrival slip back to gate for correction
export function useSendBackArrivalSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slipId, data }: { slipId: number; data?: SendBackRequest }) =>
      arrivalSlipApi.sendBack(slipId, data),
    onSuccess: (_, { slipId }) => {
      queryClient.invalidateQueries({ queryKey: ARRIVAL_SLIP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ARRIVAL_SLIP_QUERY_KEYS.detail(slipId) });
      queryClient.invalidateQueries({ queryKey: INSPECTION_QUERY_KEYS.all });
    },
  });
}
