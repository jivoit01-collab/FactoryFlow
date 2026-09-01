import { useQuery } from '@tanstack/react-query';

import { printInfoApi } from './printInfo.api';

/**
 * Letterhead data (company legal name, warehouse addresses, branch GST) for
 * the Branch Stock Transfer print. SAP master data that changes on the order
 * of years, so it's cached hard; and the print must still work if SAP is down,
 * so callers treat `undefined` as "print with blanks", never as a blocker.
 */
export function useWarehousePrintInfo(warehouseCodes: (string | null | undefined)[]) {
  const codes = [...new Set(warehouseCodes.filter((code): code is string => !!code))].sort();

  return useQuery({
    queryKey: ['warehouse', 'print-info', codes.join(',')],
    queryFn: () => printInfoApi.get(codes),
    enabled: codes.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
