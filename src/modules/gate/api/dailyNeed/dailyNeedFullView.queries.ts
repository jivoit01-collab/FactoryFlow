import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dailyNeedFullViewApi } from './dailyNeedFullView.api';

export function useDailyNeedFullView(entryId: number | null) {
  return useQuery({
    queryKey: ['dailyNeedFullView', entryId],
    queryFn: () => dailyNeedFullViewApi.get(entryId!),
    enabled: !!entryId,
  });
}

export function useCompleteDailyNeedEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => dailyNeedFullViewApi.complete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyNeedFullView'] });
      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
      queryClient.invalidateQueries({ queryKey: ['dailyNeed'] });
    },
  });
}
