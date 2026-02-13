import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { gateEntryFullViewApi } from './gateEntryFullView.api'

export function useGateEntryFullView(entryId: number | null) {
  return useQuery({
    queryKey: ['gateEntryFullView', entryId],
    queryFn: () => gateEntryFullViewApi.get(entryId!),
    enabled: !!entryId,
  })
}

export function useCompleteGateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) => gateEntryFullViewApi.complete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] })
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
      // Invalidate GRPO pending list so newly completed entries appear
      queryClient.invalidateQueries({ queryKey: ['grpo', 'pending'] })
    },
  })
}
