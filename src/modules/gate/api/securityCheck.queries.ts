import { useQuery, useMutation } from '@tanstack/react-query'
import { securityCheckApi, type CreateSecurityCheckRequest } from './securityCheck.api'

export function useSecurityCheck(entryId: number | null) {
  return useQuery({
    queryKey: ['securityCheck', entryId],
    queryFn: () => securityCheckApi.get(entryId!),
    enabled: !!entryId,
  })
}

export function useCreateSecurityCheck(entryId: number) {
  return useMutation({
    mutationFn: (data: CreateSecurityCheckRequest) => securityCheckApi.create(entryId, data),
  })
}