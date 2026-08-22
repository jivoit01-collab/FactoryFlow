import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type SapReportParameterValues,
  sapReportsApi,
  type UpdateSapReportPayload,
} from './sapReports.api';

export const sapReportKeys = {
  all: ['sap-reports'] as const,
  list: (params?: Record<string, unknown>) => ['sap-reports', 'list', params ?? {}] as const,
  detail: (slug: string) => ['sap-reports', 'detail', slug] as const,
  sql: (slug: string) => ['sap-reports', 'sql', slug] as const,
  options: (slug: string, position: number, search: string) =>
    ['sap-reports', 'options', slug, position, search] as const,
  runs: (slug: string) => ['sap-reports', 'runs', slug] as const,
  categories: () => ['sap-reports', 'categories'] as const,
};

export function useSapReports(params?: { search?: string; include_hidden?: boolean }) {
  return useQuery({
    queryKey: sapReportKeys.list(params),
    queryFn: () => sapReportsApi.list(params),
  });
}

export function useSapReport(slug: string | undefined) {
  return useQuery({
    queryKey: sapReportKeys.detail(slug ?? ''),
    queryFn: () => sapReportsApi.get(slug as string),
    enabled: Boolean(slug),
  });
}

export function useSapReportSql(slug: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: sapReportKeys.sql(slug ?? ''),
    queryFn: () => sapReportsApi.getSql(slug as string),
    enabled: Boolean(slug) && enabled,
  });
}

/**
 * Options for one filter.
 *
 * Kept as a query so a dropdown that has been opened before is instant, and
 * gated on `enabled` so nothing is fetched for a report the user has not
 * opened a picker on.
 */
export function useSapReportParameterOptions(
  slug: string | undefined,
  position: number,
  search: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: sapReportKeys.options(slug ?? '', position, search),
    queryFn: () => sapReportsApi.parameterOptions(slug as string, position, search),
    enabled: Boolean(slug) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSapReportRuns(slug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sapReportKeys.runs(slug ?? ''),
    queryFn: () => sapReportsApi.reportRuns(slug as string),
    enabled: Boolean(slug) && enabled,
  });
}

export function useSapReportCategories(enabled: boolean) {
  return useQuery({
    queryKey: sapReportKeys.categories(),
    queryFn: () => sapReportsApi.categories(),
    enabled,
  });
}

/**
 * Running a report is a mutation, not a query.
 *
 * It is an explicit, potentially slow hit on the shared SAP box, so it must
 * happen when the user presses Run — never on render, a refocus or a retry.
 */
export function useRunSapReport(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { parameters: SapReportParameterValues; rowLimit?: number }) =>
      sapReportsApi.run(slug as string, input.parameters, input.rowLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sapReportKeys.runs(slug ?? '') });
    },
  });
}

export function useExportSapReport(slug: string | undefined) {
  return useMutation({
    mutationFn: (input: {
      parameters: SapReportParameterValues;
      exportFormat: 'csv' | 'xlsx';
    }) => sapReportsApi.export(slug as string, input.parameters, input.exportFormat),
  });
}

export function useUpdateSapReport(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSapReportPayload) =>
      sapReportsApi.update(slug as string, payload),
    onSuccess: (report) => {
      queryClient.setQueryData(sapReportKeys.detail(report.slug), report);
      queryClient.invalidateQueries({ queryKey: sapReportKeys.all });
    },
  });
}

export function useSyncSapReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { category?: string; all_categories?: boolean; dry_run?: boolean }) =>
      sapReportsApi.sync(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sapReportKeys.all });
    },
  });
}
