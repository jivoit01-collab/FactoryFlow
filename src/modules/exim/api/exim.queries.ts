/**
 * React-query hooks for Import / Export.
 *
 * Every licence write returns the licence as it now stands — a line moves the
 * licence's totals — so a write puts that answer straight into the detail
 * cache and marks the register stale, rather than waiting on a refetch.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  LicenceCreatePayload,
  LicenceDetail,
  LicenceKind,
  LicencePayload,
  LicenceStatus,
  LineCreatePayload,
  LinePayload,
} from '../types';
import { eximApi } from './exim.api';

export const EXIM_KEYS = {
  licences: (kind: LicenceKind, status?: LicenceStatus) =>
    ['exim', 'licences', kind, status ?? 'all'] as const,
  licence: (id: number) => ['exim', 'licence', id] as const,
  customsRates: () => ['exim', 'customs-rates'] as const,
};

export function useLicences(kind: LicenceKind, status?: LicenceStatus, enabled = true) {
  return useQuery({
    queryKey: EXIM_KEYS.licences(kind, status),
    queryFn: () => eximApi.listLicences(kind, status),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useLicence(id: number) {
  return useQuery({
    queryKey: EXIM_KEYS.licence(id),
    queryFn: () => eximApi.getLicence(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

function useSettle() {
  const queryClient = useQueryClient();
  return (licence: LicenceDetail) => {
    queryClient.setQueryData(EXIM_KEYS.licence(licence.id), licence);
    queryClient.invalidateQueries({ queryKey: ['exim', 'licences'] });
  };
}

export function useCreateLicence() {
  const settle = useSettle();
  return useMutation({
    mutationFn: (payload: LicenceCreatePayload) => eximApi.createLicence(payload),
    onSuccess: settle,
  });
}

export function useUpdateLicence(id: number) {
  const settle = useSettle();
  return useMutation({
    mutationFn: (payload: Partial<LicencePayload>) => eximApi.updateLicence(id, payload),
    onSuccess: settle,
  });
}

export function useDeleteLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eximApi.deleteLicence(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: EXIM_KEYS.licence(id) });
      queryClient.invalidateQueries({ queryKey: ['exim', 'licences'] });
    },
  });
}

export function useAddLine(licenceId: number) {
  const settle = useSettle();
  return useMutation({
    mutationFn: (payload: LineCreatePayload) => eximApi.addLine(licenceId, payload),
    onSuccess: settle,
  });
}

export function useUpdateLine() {
  const settle = useSettle();
  return useMutation({
    mutationFn: ({ lineId, payload }: { lineId: number; payload: Partial<LinePayload> }) =>
      eximApi.updateLine(lineId, payload),
    onSuccess: settle,
  });
}

export function useDeleteLine() {
  const settle = useSettle();
  return useMutation({
    mutationFn: (lineId: number) => eximApi.deleteLine(lineId),
    onSuccess: settle,
  });
}

/** A notification stands for a fortnight; the server caches it for an hour. */
export function useCustomsRates() {
  return useQuery({
    queryKey: EXIM_KEYS.customsRates(),
    queryFn: () => eximApi.getCustomsRates(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRefreshCustomsRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eximApi.getCustomsRates(true),
    onSuccess: (rates) => queryClient.setQueryData(EXIM_KEYS.customsRates(), rates),
  });
}
