/**
 * React-query hooks for the ownership chart.
 *
 * The save returns the saved chart, so it is written straight into the cache
 * rather than refetched — the page re-seeds its editor from that response and
 * needs the new row ids in the same tick.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrgChart, OrgChartSavePayload } from '../types';
import { orgChartApi } from './orgChart.api';

export const ORG_CHART_KEYS = {
  all: ['org-chart'] as const,
  chart: () => ['org-chart', 'chart'] as const,
};

export function useOrgChart() {
  return useQuery({
    queryKey: ORG_CHART_KEYS.chart(),
    queryFn: () => orgChartApi.getChart(),
  });
}

export function useSaveOrgChart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrgChartSavePayload) => orgChartApi.saveChart(payload),
    onSuccess: (chart: OrgChart) => {
      queryClient.setQueryData(ORG_CHART_KEYS.chart(), chart);
    },
  });
}
