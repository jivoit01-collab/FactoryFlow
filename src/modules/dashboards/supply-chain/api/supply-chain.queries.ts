import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';
import { getErrorMessage } from '@/shared/utils';

import { supplyChainApi } from './supply-chain.api';

export const SUPPLY_CHAIN_QUERY_KEYS = {
  all: ['supply-chain'] as const,
  dashboard: (companyId?: number | string, forecastId?: number | null) =>
    [...SUPPLY_CHAIN_QUERY_KEYS.all, 'dashboard', companyId, forecastId ?? null] as const,
  alarmPreview: (companyId?: number | string) =>
    [...SUPPLY_CHAIN_QUERY_KEYS.all, 'alarm-preview', companyId] as const,
};

/** The dashboard reads planning rows already in Postgres, so it is cheap and can
 *  refetch freely — but the numbers only move when the ERP refresh runs, so a
 *  short stale time would just add noise. */
const STALE_TIME = 5 * 60 * 1000;

export function useSupplyChainDashboard(forecastId?: number | null) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SUPPLY_CHAIN_QUERY_KEYS.dashboard(currentCompany?.company_id, forecastId),
    queryFn: () => supplyChainApi.getDashboard(forecastId),
    staleTime: STALE_TIME,
  });
}

export function useAlarmPreview(enabled = false) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: SUPPLY_CHAIN_QUERY_KEYS.alarmPreview(currentCompany?.company_id),
    queryFn: () => supplyChainApi.previewAlarms(),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useSendAlarms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (force: boolean) => supplyChainApi.sendAlarms(force),
    onSuccess: (data) => {
      const sent = data.subscriptions.filter((s) => s.sent);
      const people = sent.reduce((total, s) => total + (s.recipients ?? 0), 0);
      if (sent.length === 0) {
        // Not a failure: an unchanged digest is deliberately not re-sent.
        toast.info('Nothing new to alarm — no department was notified.');
      } else {
        toast.success(`Alarm sent to ${people} user(s) across ${sent.length} department(s).`);
      }
      void queryClient.invalidateQueries({ queryKey: SUPPLY_CHAIN_QUERY_KEYS.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send the alarms.')),
  });
}

export function useUploadReferenceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => supplyChainApi.uploadReferenceTemplate(file),
    onSuccess: (data: {
      lead_times_loaded: number;
      machines_loaded: number;
      mappings_loaded: number;
      examples_skipped: number;
      warnings?: string[];
    }) => {
      toast.success(
        `Loaded ${data.lead_times_loaded} lead time(s), ${data.machines_loaded} machine(s), ` +
          `${data.mappings_loaded} SKU mapping(s).`,
      );
      // Example rows are the template's own format samples — silently skipping them
      // would look like data loss to whoever just uploaded the sheet.
      if (data.examples_skipped) {
        toast.info(`Skipped ${data.examples_skipped} template example row(s).`);
      }
      (data.warnings ?? []).slice(0, 3).forEach((w) => toast.warning(w));
      void queryClient.invalidateQueries({ queryKey: SUPPLY_CHAIN_QUERY_KEYS.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not read that workbook.')),
  });
}
