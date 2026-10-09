import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { productionDispatchApi } from '../api';
import type { ReportRange } from '../utils/range';

const KEY = ['dashboards', 'production-dispatch'] as const;

/**
 * The report for a range: one read, added up on the page (`utils/compute.ts`).
 *
 * Always Oil's, whichever company the reader is signed into, so the company is
 * not part of the key.
 */
export function useProductionDispatch(range: ReportRange) {
  return useQuery({
    queryKey: [...KEY, 'report', range.from, range.to],
    queryFn: () => productionDispatchApi.getReport(range),
    // Five minutes: SAP gains a receipt or an invoice a few times an hour.
    staleTime: 5 * 60 * 1000,
    // Moving from one range to the next keeps the last one on screen until the
    // new one is in, rather than blanking the page between them.
    placeholderData: keepPreviousData,
  });
}

/** The production and dispatch lines of one item over the range. */
export function useItemDocuments(range: ReportRange, itemCode: string | null) {
  return useQuery({
    queryKey: [...KEY, 'documents', range.from, range.to, itemCode],
    queryFn: () => productionDispatchApi.getDocuments(range, itemCode ?? undefined),
    enabled: !!itemCode,
    staleTime: 5 * 60 * 1000,
  });
}
