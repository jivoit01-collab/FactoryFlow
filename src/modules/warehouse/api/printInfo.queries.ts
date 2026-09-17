import { useQuery } from '@tanstack/react-query';

import { printInfoApi } from './printInfo.api';

/** The de-duplicated, ordered codes that identify one letterhead cache entry. */
const normalizeCodes = (warehouseCodes: (string | null | undefined)[]) =>
  [...new Set(warehouseCodes.filter((code): code is string => !!code))].sort();

/**
 * The letterhead query itself, shared by the hook below and by callers that
 * fetch it imperatively — a print button that only reads SAP once pressed has
 * no hook to hang it on, and must still land on the same cache entry.
 */
export function warehousePrintInfoQuery(warehouseCodes: (string | null | undefined)[]) {
  const codes = normalizeCodes(warehouseCodes);

  return {
    codes,
    options: {
      queryKey: ['warehouse', 'print-info', codes.join(',')],
      queryFn: () => printInfoApi.get(codes),
      staleTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  };
}

/**
 * Letterhead data (company legal name, warehouse addresses, branch GST) for
 * the Branch Stock Transfer print. SAP master data that changes on the order
 * of years, so it's cached hard; and the print must still work if SAP is down,
 * so callers treat `undefined` as "print with blanks", never as a blocker.
 */
export function useWarehousePrintInfo(warehouseCodes: (string | null | undefined)[]) {
  const { codes, options } = warehousePrintInfoQuery(warehouseCodes);

  return useQuery({ ...options, enabled: codes.length > 0 });
}
