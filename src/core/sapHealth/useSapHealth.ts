import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { SAP_UNAVAILABLE_EVENT } from './events';
import { fetchSapHealth } from './sapHealth.api';

export const SAP_HEALTH_QUERY_KEY = ['sap-health'] as const;

const POLL_MS = 60_000;

export function useSapHealth() {
  const queryClient = useQueryClient();

  // A posting that just came back "SAP is not responding" should not wait up
  // to a minute for the banner to agree with it.
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: SAP_HEALTH_QUERY_KEY });
    };
    window.addEventListener(SAP_UNAVAILABLE_EVENT, refresh);
    return () => window.removeEventListener(SAP_UNAVAILABLE_EVENT, refresh);
  }, [queryClient]);

  return useQuery({
    queryKey: SAP_HEALTH_QUERY_KEY,
    queryFn: fetchSapHealth,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    // A failed poll says nothing about SAP (it may be this app that is down),
    // so it is not retried into a banner either way.
    retry: false,
    staleTime: POLL_MS / 2,
  });
}
