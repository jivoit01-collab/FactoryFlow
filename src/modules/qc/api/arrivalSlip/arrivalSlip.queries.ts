import { useQuery } from '@tanstack/react-query'
import { arrivalSlipApi } from './arrivalSlip.api'

// Query keys
export const ARRIVAL_SLIP_QUERY_KEYS = {
  all: ['qc-arrivalSlips'] as const,
  detail: (id: number) => [...ARRIVAL_SLIP_QUERY_KEYS.all, 'detail', id] as const,
}

// Get arrival slip by ID (for prefilling inspection form)
export function useArrivalSlipById(slipId: number | null) {
  return useQuery({
    queryKey: ARRIVAL_SLIP_QUERY_KEYS.detail(slipId!),
    queryFn: () => arrivalSlipApi.getById(slipId!),
    enabled: !!slipId,
  })
}
