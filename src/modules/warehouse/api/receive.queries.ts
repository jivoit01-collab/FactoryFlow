import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { receiveApi,type ReceiveScanPayload } from './receive.api';

export const RECEIVE_QUERY_KEYS = {
  all: ['warehouse', 'receive'] as const,
  session: (warehouse: string) => [...RECEIVE_QUERY_KEYS.all, 'session', warehouse] as const,
};

/** Today's running tally at one warehouse — the receive screen's header. */
export function useReceiveSession(warehouse: string) {
  return useQuery({
    queryKey: RECEIVE_QUERY_KEYS.session(warehouse),
    queryFn: () => receiveApi.session(warehouse),
    enabled: !!warehouse,
  });
}

export function useReceiveScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReceiveScanPayload) => receiveApi.scan(payload),
    onSuccess: (result) => {
      // Refresh the tally on any outcome, not just an accepted one: a rejection
      // is counted too, and the header is how the receiver sees their shift.
      void qc.invalidateQueries({ queryKey: RECEIVE_QUERY_KEYS.session(result.warehouse) });
    },
  });
}
