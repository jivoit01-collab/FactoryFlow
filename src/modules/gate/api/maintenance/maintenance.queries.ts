import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CreateMaintenanceRequest, maintenanceApi } from './maintenance.api';

/**
 * Hook to fetch unit choices for dropdown
 */
export function useUnitChoices(enabled: boolean = true) {
  return useQuery({
    queryKey: ['unitChoices'],
    queryFn: () => maintenanceApi.getUnitChoices(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * Hook to fetch maintenance types for dropdown
 */
export function useMaintenanceTypes(enabled: boolean = true) {
  return useQuery({
    queryKey: ['maintenanceTypes'],
    queryFn: () => maintenanceApi.getTypes(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled,
  });
}

/**
 * Hook to fetch maintenance entry by vehicle entry ID
 */
export function useMaintenanceEntry(entryId: number | null) {
  return useQuery({
    queryKey: ['maintenanceEntry', entryId],
    queryFn: () => maintenanceApi.getByEntryId(entryId!),
    enabled: !!entryId,
  });
}

/**
 * Hook to create maintenance entry
 */
export function useCreateMaintenanceEntry(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaintenanceRequest) => maintenanceApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}

/**
 * Hook to update maintenance entry
 */
export function useUpdateMaintenanceEntry(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaintenanceRequest) => maintenanceApi.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceFullView', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}

/**
 * Hook to fetch full maintenance gate entry view for review page
 */
export function useMaintenanceFullView(entryId: number | null) {
  return useQuery({
    queryKey: ['maintenanceFullView', entryId],
    queryFn: () => maintenanceApi.getFullView(entryId!),
    enabled: !!entryId,
  });
}

/**
 * Hook to complete a maintenance gate entry
 */
export function useCompleteMaintenanceEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: number) => maintenanceApi.complete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}
