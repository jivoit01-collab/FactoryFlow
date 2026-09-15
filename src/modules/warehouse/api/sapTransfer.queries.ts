import { useQuery } from '@tanstack/react-query';

import { sapTransferApi } from './sapTransfer.api';

export const SAP_TRANSFER_QUERY_KEYS = {
  all: ['warehouse', 'sap-transfers'] as const,
  search: (search: string) => [...SAP_TRANSFER_QUERY_KEYS.all, 'search', search] as const,
  detail: (docEntry: number) => [...SAP_TRANSFER_QUERY_KEYS.all, 'detail', docEntry] as const,
};

/**
 * Look a posted inventory transfer up by its SAP document number. Every call is
 * a HANA read, so it runs only once a number has actually been submitted —
 * never on each keystroke.
 */
export function useSapTransferSearch(search: string, enabled: boolean) {
  return useQuery({
    queryKey: SAP_TRANSFER_QUERY_KEYS.search(search),
    queryFn: () => sapTransferApi.search(search),
    enabled: enabled && search.length > 0,
  });
}

/** One transfer with its lines — what the printed document is built from. */
export function useSapTransfer(docEntry: number | null) {
  return useQuery({
    queryKey: SAP_TRANSFER_QUERY_KEYS.detail(docEntry!),
    queryFn: () => sapTransferApi.get(docEntry!),
    enabled: docEntry !== null,
  });
}
