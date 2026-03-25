import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CreateOutboundRequest, outboundGateApi } from './outbound.api';

export function useOutboundPurposes(enabled: boolean = true) {
  return useQuery({
    queryKey: ['outboundPurposes'],
    queryFn: () => outboundGateApi.getPurposes(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useOutboundEntry(entryId: number | null) {
  return useQuery({
    queryKey: ['outboundEntry', entryId],
    queryFn: () => outboundGateApi.getByEntryId(entryId!),
    enabled: !!entryId,
  });
}

export function useCreateOutboundEntry(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOutboundRequest) => outboundGateApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outboundEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useUpdateOutboundEntry(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOutboundRequest) => outboundGateApi.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outboundEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['outboundFullView', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useOutboundFullView(entryId: number | null) {
  return useQuery({
    queryKey: ['outboundFullView', entryId],
    queryFn: () => outboundGateApi.getFullView(entryId!),
    enabled: !!entryId,
  });
}

export function useCompleteOutboundEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => outboundGateApi.complete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outboundFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

export function useReleaseForLoading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => outboundGateApi.releaseForLoading(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outboundFullView'] });
      queryClient.invalidateQueries({ queryKey: ['outboundEntry'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['availableVehicles'] });
    },
  });
}

export function useAvailableVehicles(enabled: boolean = true) {
  return useQuery({
    queryKey: ['availableVehicles'],
    queryFn: () => outboundGateApi.getAvailableVehicles(),
    enabled,
  });
}
