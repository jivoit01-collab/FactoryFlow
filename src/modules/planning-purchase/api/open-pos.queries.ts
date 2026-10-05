/**
 * React-query hooks for SAP's open purchase orders.
 *
 * Keyed on the company like the rest of the module: the lines come from that
 * company's SAP schema. The server keeps a read for two minutes, so the page
 * does too, and Refresh asks SAP again rather than the server's copy.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { openPoApi } from './open-pos.api';

export const OPEN_PO_KEYS = {
  all: ['planning-purchase', 'open-pos'] as const,
  list: (companyId?: number | string) => [...OPEN_PO_KEYS.all, companyId] as const,
};

const TWO_MINUTES = 2 * 60 * 1000;

export function useOpenPos() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: OPEN_PO_KEYS.list(currentCompany?.company_id),
    queryFn: () => openPoApi.list(),
    staleTime: TWO_MINUTES,
    refetchOnWindowFocus: false,
    // SAP not answering is not cured by asking twice in a row.
    retry: false,
  });
}

/** Read SAP afresh, past the server's two-minute copy, and show what it says. */
export function useRefreshOpenPos() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => openPoApi.list(true),
    onSuccess: (data) =>
      queryClient.setQueryData(OPEN_PO_KEYS.list(currentCompany?.company_id), data),
  });
}
