import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { securityCheckApi, type CreateSecurityCheckRequest } from './securityCheck.api'

export function useSecurityCheck(entryId: number | null) {
  return useQuery({
    queryKey: ['securityCheck', entryId],
    queryFn: () => securityCheckApi.get(entryId!),
    enabled: !!entryId,
  })
}

export function useCreateSecurityCheck(entryId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSecurityCheckRequest) => securityCheckApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['securityCheck'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] })
    },
  })
}
