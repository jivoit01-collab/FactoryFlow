import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Family } from '../constants';
import {
  type ApprovePayload,
  type EditPayload,
  type ListFilters,
  partnerLookupsApi,
  partnerOnboardingApi,
  publicRegistrationApi,
  type RegistrationDetail,
} from './partner-onboarding.api';

/** Every query key this module owns. A mutation invalidates every list that shows its rows. */
const KEYS = {
  all: ['partnerOnboarding'] as const,
  list: (family: Family, filters: ListFilters) =>
    ['partnerOnboarding', 'list', family, filters] as const,
  detail: (family: Family, id: number) => ['partnerOnboarding', 'detail', family, id] as const,
  lookup: (name: string, companyCode: string, family?: Family) =>
    ['partnerOnboarding', 'lookup', name, companyCode, family ?? ''] as const,
  publicCompanies: ['partnerOnboarding', 'public', 'companies'] as const,
  publicStates: (company: string) => ['partnerOnboarding', 'public', 'states', company] as const,
};

export function useRegistrations(family: Family, filters: ListFilters, enabled = true) {
  return useQuery({
    queryKey: KEYS.list(family, filters),
    queryFn: () => partnerOnboardingApi.list(family, filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useRegistration(family: Family, id: number) {
  return useQuery({
    queryKey: KEYS.detail(family, id),
    queryFn: () => partnerOnboardingApi.detail(family, id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** After any change: the detail gets the server's answer, every list refetches. */
function useSettle(family: Family, id: number) {
  const queryClient = useQueryClient();
  return (detail: RegistrationDetail) => {
    queryClient.setQueryData(KEYS.detail(family, id), detail);
    queryClient.invalidateQueries({ queryKey: ['partnerOnboarding', 'list', family] });
  };
}

export function useUpdateRegistration(family: Family, id: number) {
  const settle = useSettle(family, id);
  return useMutation({
    mutationFn: (payload: EditPayload) => partnerOnboardingApi.update(family, id, payload),
    onSuccess: settle,
  });
}

export function useVerifyRegistration(family: Family, id: number) {
  const settle = useSettle(family, id);
  return useMutation({
    mutationFn: (note: string) => partnerOnboardingApi.verify(family, id, note),
    onSuccess: settle,
  });
}

export function useRejectRegistration(family: Family, id: number) {
  const settle = useSettle(family, id);
  return useMutation({
    mutationFn: (reason: string) => partnerOnboardingApi.reject(family, id, reason),
    onSuccess: settle,
  });
}

export function useApproveRegistration(family: Family, id: number) {
  const settle = useSettle(family, id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApprovePayload) => partnerOnboardingApi.approve(family, id, payload),
    onSuccess: settle,
    // A refusal still changes the record (the reservation, the error, the history).
    onError: () => queryClient.invalidateQueries({ queryKey: KEYS.detail(family, id) }),
  });
}

export function useOpenDocument(family: Family, id: number) {
  return useMutation({
    mutationFn: (attachmentId: number) => partnerOnboardingApi.document(family, id, attachmentId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}

// ---- SAP pickers, from the registration's own company ----------------------

const LOOKUP_STALE_MS = 10 * 60_000;

function useLookup<T>(
  name: string,
  companyCode: string,
  fetcher: () => Promise<T>,
  enabled: boolean,
  family?: Family,
) {
  return useQuery({
    queryKey: KEYS.lookup(name, companyCode, family),
    queryFn: fetcher,
    enabled: enabled && !!companyCode,
    staleTime: LOOKUP_STALE_MS,
    retry: false,
  });
}

export function usePartnerLookups(companyCode: string, family: Family, enabled: boolean) {
  return {
    bpGroups: useLookup(
      'bpGroups',
      companyCode,
      () => partnerLookupsApi.bpGroups(companyCode, family),
      enabled,
      family,
    ),
    paymentTerms: useLookup(
      'paymentTerms',
      companyCode,
      () => partnerLookupsApi.paymentTerms(companyCode),
      enabled,
    ),
    salesEmployees: useLookup(
      'salesEmployees',
      companyCode,
      () => partnerLookupsApi.salesEmployees(companyCode),
      enabled,
    ),
    controlAccounts: useLookup(
      'controlAccounts',
      companyCode,
      () => partnerLookupsApi.controlAccounts(companyCode, family),
      enabled,
      family,
    ),
    mainGroups: useLookup(
      'mainGroups',
      companyCode,
      () => partnerLookupsApi.mainGroups(companyCode),
      enabled,
    ),
    chains: useLookup('chains', companyCode, () => partnerLookupsApi.chains(companyCode), enabled),
    banks: useLookup(
      'banks',
      companyCode,
      () => partnerLookupsApi.banks(companyCode),
      enabled && family === 'vendor',
    ),
  };
}

/** SAP's states for the registration's company — the verifier's address editor. */
export function useCompanyStates(companyCode: string, enabled: boolean) {
  return useLookup('states', companyCode, () => partnerLookupsApi.states(companyCode), enabled);
}

// ---- the public forms --------------------------------------------------------

export function usePublicCompanies() {
  return useQuery({
    queryKey: KEYS.publicCompanies,
    queryFn: publicRegistrationApi.companies,
    staleTime: Infinity,
    retry: 1,
  });
}

export function usePublicStates(company: string) {
  return useQuery({
    queryKey: KEYS.publicStates(company),
    queryFn: () => publicRegistrationApi.states(company),
    enabled: !!company,
    staleTime: Infinity,
    retry: 1,
  });
}

export function useSubmitRegistration(family: Family) {
  return useMutation({
    mutationFn: (form: FormData) => publicRegistrationApi.submit(family, form),
  });
}
