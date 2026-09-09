import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  sapIdentityApi,
  type SapIdentityCreatePayload,
  type SapIdentityUpdatePayload,
} from './sapIdentity.api';

export const SAP_IDENTITY_QUERY_KEYS = {
  all: ['sap-identity'] as const,
  identities: () => [...SAP_IDENTITY_QUERY_KEYS.all, 'identities'] as const,
  sapUsers: (includeLocked: boolean) =>
    [...SAP_IDENTITY_QUERY_KEYS.all, 'sap-users', includeLocked] as const,
  me: () => [...SAP_IDENTITY_QUERY_KEYS.all, 'me'] as const,
};

export function useSapIdentities() {
  return useQuery({
    queryKey: SAP_IDENTITY_QUERY_KEYS.identities(),
    queryFn: () => sapIdentityApi.list(),
  });
}

/** SAP accounts to map to. A HANA read, so it is cached for the session. */
export function useSapUsers(includeLocked = false) {
  return useQuery({
    queryKey: SAP_IDENTITY_QUERY_KEYS.sapUsers(includeLocked),
    queryFn: () => sapIdentityApi.sapUsers(includeLocked),
    staleTime: 5 * 60 * 1000,
  });
}

/** The caller's own SAP account. Needs no admin permission. */
export function useMySapIdentity(enabled = true) {
  return useQuery({
    queryKey: SAP_IDENTITY_QUERY_KEYS.me(),
    queryFn: () => sapIdentityApi.me(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

function useInvalidateIdentities() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: SAP_IDENTITY_QUERY_KEYS.all });
    // A mapping decides who may decide, so every SAP approval queue's
    // can_decide flags are stale afterwards.
    queryClient.invalidateQueries({ queryKey: ['warehouse', 'sap-transfer-approvals'] });
  };
}

export function useCreateSapIdentity() {
  const invalidate = useInvalidateIdentities();
  return useMutation({
    mutationFn: (payload: SapIdentityCreatePayload) => sapIdentityApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateSapIdentity() {
  const invalidate = useInvalidateIdentities();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SapIdentityUpdatePayload }) =>
      sapIdentityApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useRemoveSapIdentity() {
  const invalidate = useInvalidateIdentities();
  return useMutation({
    mutationFn: (id: number) => sapIdentityApi.remove(id),
    onSuccess: invalidate,
  });
}
