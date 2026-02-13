import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { constructionApi, type CreateConstructionRequest } from './construction.api';

/**
 * Hook to fetch construction categories for dropdown
 */
export function useConstructionCategories(enabled: boolean = true) {
  return useQuery({
    queryKey: ['constructionCategories'],
    queryFn: () => constructionApi.getCategories(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled,
  });
}

/**
 * Hook to fetch construction entry by vehicle entry ID
 */
export function useConstructionEntry(entryId: number | null) {
  return useQuery({
    queryKey: ['constructionEntry', entryId],
    queryFn: () => constructionApi.getByEntryId(entryId!),
    enabled: !!entryId,
  });
}

/**
 * Hook to create construction entry
 */
export function useCreateConstructionEntry(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConstructionRequest) => constructionApi.create(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constructionEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}

/**
 * Hook to update construction entry
 */
export function useUpdateConstructionEntry(entryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConstructionRequest) => constructionApi.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constructionEntry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['constructionFullView', entryId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}

/**
 * Hook to fetch full construction gate entry view for review page
 */
export function useConstructionFullView(entryId: number | null) {
  return useQuery({
    queryKey: ['constructionFullView', entryId],
    queryFn: () => constructionApi.getFullView(entryId!),
    enabled: !!entryId,
  });
}

/**
 * Hook to complete a construction gate entry
 */
export function useCompleteConstructionEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: number) => constructionApi.complete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constructionFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntriesCount'] });
    },
  });
}
