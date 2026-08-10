import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';
import { getErrorMessage } from '@/shared/utils';

import type { TrailScope, VerdictOutcome } from '../types';
import { dailyRunApi, supplyChainApi } from './supply-chain.api';

export const SUPPLY_CHAIN_QUERY_KEYS = {
  all: ['supply-chain'] as const,
  dashboard: (companyId?: number | string, forecastId?: number | null) =>
    [...SUPPLY_CHAIN_QUERY_KEYS.all, 'dashboard', companyId, forecastId ?? null] as const,
  alarmPreview: (companyId?: number | string) =>
    [...SUPPLY_CHAIN_QUERY_KEYS.all, 'alarm-preview', companyId] as const,
  // Deliberately NOT keyed on the current company: the trail is a group view
  // built from every book the factory fills, so switching company must not
  // refetch a different answer.
  liveTrail: (scope: TrailScope) => [...SUPPLY_CHAIN_QUERY_KEYS.all, 'live-trail', scope] as const,
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

/** The Live Trail, read straight from SAP.
 *
 * A few seconds per call, so it does not refetch on focus and holds for a
 * minute — long enough to read the page, short enough that "Refresh" means
 * something. Both scopes are cached separately, so toggling between the
 * external and group readings is instant after the first look at each.
 */
export function useLiveTrail(scope: TrailScope) {
  return useQuery({
    queryKey: SUPPLY_CHAIN_QUERY_KEYS.liveTrail(scope),
    queryFn: () => supplyChainApi.getLiveTrail(scope),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
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

/* ── The daily operating loop ─────────────────────────────────────────────── */

export const DAILY_RUN_QUERY_KEYS = {
  all: ['supply-chain-run'] as const,
  latest: (companyId?: number | string) =>
    [...DAILY_RUN_QUERY_KEYS.all, 'latest', companyId] as const,
  detail: (id: number, companyId?: number | string) =>
    [...DAILY_RUN_QUERY_KEYS.all, 'detail', id, companyId] as const,
  weekly: (weeks: number, companyId?: number | string) =>
    [...DAILY_RUN_QUERY_KEYS.all, 'weekly', weeks, companyId] as const,
};

export function useDailyRun(runId?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: runId
      ? DAILY_RUN_QUERY_KEYS.detail(runId, currentCompany?.company_id)
      : DAILY_RUN_QUERY_KEYS.latest(currentCompany?.company_id),
    queryFn: () => (runId ? dailyRunApi.detail(runId) : dailyRunApi.latest()),
    // A run is a snapshot of one morning; it does not drift while you read it.
    staleTime: 60 * 1000,
    retry: (count, error) => {
      // "No run yet" is a real state to show, not a failure to retry into.
      if ((error as { status?: number })?.status === 404) return false;
      return count < 2;
    },
  });
}

export function useWeeklyReview(weeks = 4) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: DAILY_RUN_QUERY_KEYS.weekly(weeks, currentCompany?.company_id),
    queryFn: () => dailyRunApi.weekly(weeks),
    staleTime: 5 * 60 * 1000,
  });
}

function useRunMutation<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  success: string,
  fallback: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success);
      void queryClient.invalidateQueries({ queryKey: DAILY_RUN_QUERY_KEYS.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, fallback)),
  });
}

export function useGenerateRun() {
  return useRunMutation(
    () => dailyRunApi.generate(),
    "Today's run is ready.",
    'Could not build the run.',
  );
}

export function useReviewRun(runId?: number) {
  return useRunMutation(
    ({ comment, override }: { comment: string; override: boolean }) =>
      dailyRunApi.review(runId!, comment, override),
    'Reviewed. It can now be published.',
    'Could not review the run.',
  );
}

export function usePublishRun(runId?: number) {
  return useRunMutation(
    (comment: string) => dailyRunApi.publish(runId!, comment),
    'Published to the buyer and HODs.',
    'Could not publish the run.',
  );
}

export function useSetRowOwner() {
  return useRunMutation(
    ({ rowId, owner }: { rowId: number; owner: string }) =>
      dailyRunApi.setOwner(rowId, owner),
    'Owner set.',
    'Could not set the owner.',
  );
}

export function useSetVerdict() {
  return useRunMutation(
    ({ rowId, outcome, note }: { rowId: number; outcome: VerdictOutcome; note: string }) =>
      dailyRunApi.setVerdict(rowId, outcome, note),
    'Verdict recorded.',
    'Could not record the verdict.',
  );
}
