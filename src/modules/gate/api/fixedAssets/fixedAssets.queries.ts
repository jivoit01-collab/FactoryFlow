import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CreateFixedAssetRequest,fixedAssetsApi } from './fixedAssets.api';

/**
 * Hook to fetch asset categories for the dropdown
 */
export function useAssetCategories(enabled: boolean = true) {
  return useQuery({
    queryKey: ['assetCategories'],
    queryFn: () => fixedAssetsApi.getCategories(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled,
  });
}

/**
 * Hook to fetch fixed asset entry by vehicle entry ID
 */
export function useFixedAssetEntry(entryId: number | null) {
  return useQuery({
    queryKey: ['fixedAssetEntry', entryId],
    queryFn: () => fixedAssetsApi.getByEntryId(entryId!),
    enabled: !!entryId,
  });
}

/**
 * Hook to create a fixed asset entry
 */
export function useCreateFixedAssetEntry(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFixedAssetRequest) => fixedAssetsApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixedAssetEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

/**
 * Hook to update a fixed asset entry
 */
export function useUpdateFixedAssetEntry(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFixedAssetRequest) => fixedAssetsApi.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixedAssetEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}

/**
 * Hook to complete a fixed asset gate entry
 */
export function useCompleteFixedAssetEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: number) => fixedAssetsApi.complete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixedAssetEntry'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntry'] });
    },
  });
}
