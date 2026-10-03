import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { operationsReportApi } from '../api';
import type { ReportPeriod } from '../types';
import { buildReport, fetchSpan } from '../utils';

/**
 * The report for a period.
 *
 * ONE READ PER PERIOD. The server is asked for the span that covers the period,
 * the one it is compared with and the days drawn around it, and the report is
 * added up from that here — so the comparison and the charts can never be from
 * a different read than the headline figures.
 *
 * Keyed on the company because the endpoint is: a report for Oil must never be
 * served from the cache to a viewer who has switched to Beverages.
 */
export function useOperationsReport(period: ReportPeriod) {
  const { currentCompany } = useAuth();
  const span = fetchSpan(period);

  return useQuery({
    queryKey: [
      'dashboards',
      'operations-report',
      currentCompany?.company_code ?? null,
      period.view,
      period.from,
      period.to,
      span.from,
      span.to,
    ],
    queryFn: async () => buildReport(period, await operationsReportApi.getDays(span)),
    // Five minutes: the registers behind it move when somebody books a run or
    // reads a meter, which is a few times a shift.
    staleTime: 5 * 60 * 1000,
    // Stepping from one day to the next keeps the last report on screen until
    // the new one is in, rather than blanking the page between them.
    placeholderData: keepPreviousData,
  });
}
