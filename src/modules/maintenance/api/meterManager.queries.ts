import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { type AssignMetersPayload, meterManagerApi } from './meterManager.api';

export const METER_MANAGER_QUERY_KEYS = {
  all: ['maintenance', 'user-electricity-meters'] as const,
  mine: () => [...METER_MANAGER_QUERY_KEYS.all, 'mine'] as const,
  list: (user?: number) => [...METER_MANAGER_QUERY_KEYS.all, 'list', user ?? 0] as const,
  gaps: () => [...METER_MANAGER_QUERY_KEYS.all, 'gaps'] as const,
};

/**
 * The meters the current user keeps.
 *
 * Cached generously: it changes only when an admin reassigns someone, and the
 * register asks for it on every load to decide what to enable.
 */
export function useMyElectricityMeters() {
  return useQuery({
    queryKey: METER_MANAGER_QUERY_KEYS.mine(),
    queryFn: () => meterManagerApi.mine(),
    staleTime: 5 * 60 * 1000,
    // One retry, not the default three: when the endpoint is absent (a frontend
    // deployed ahead of its backend) the register would otherwise spend four
    // failed round-trips before settling.
    retry: 1,
  });
}

/**
 * The current user's meter scope, in the form the register actually needs.
 *
 * **Fails open when the scope is unknown**, and that is the important part. The
 * server is the enforcement point; this hook exists only so a user is not sent
 * to fill in a form the server will refuse. If the answer cannot be fetched —
 * still loading, network down, or the endpoint missing because the frontend was
 * deployed ahead of the backend — the client must not invent a restriction.
 *
 * This mirrors `useWarehouseScope`, including the reason it is written this
 * way: reading `data?.ids ?? []` as the scope took out BST creation and
 * transfer raising in production on 27 Aug 2026, because an unreachable
 * endpoint concluded that every user managed nothing.
 */
export function useMeterScope() {
  const { data, isLoading, isError } = useMyElectricityMeters();

  const known = !isLoading && !isError && !!data;
  const unrestricted = !known || data.unrestricted;

  const ids = useMemo(() => new Set(data?.meter_ids ?? []), [data]);

  // Stable identity: callers memoise derived lists on it, and a fresh closure
  // every render would quietly defeat that.
  const manages = useCallback(
    (meterId?: number | null) => unrestricted || (meterId != null && ids.has(meterId)),
    [unrestricted, ids],
  );

  return {
    /** False while loading or if the lookup failed — nothing is restricted then. */
    scopeKnown: known,
    /** True for superusers, and whenever the scope could not be determined. */
    unrestricted,
    ids,
    /** The meters by name, for telling the user what they do keep. */
    names: data?.meters?.map((m) => m.name) ?? [],
    /** Does the user keep this meter? Unknown scope answers yes. */
    manages,
    /**
     * The user genuinely keeps nothing — known scope, not a superuser, empty
     * list. Only this warrants telling them to see an administrator; an
     * unreachable endpoint must never produce that message.
     */
    managesNothing: known && !data.unrestricted && ids.size === 0,
  };
}

export function useUserElectricityMeters(user?: number) {
  return useQuery({
    queryKey: METER_MANAGER_QUERY_KEYS.list(user),
    queryFn: () => meterManagerApi.list({ user }),
  });
}

export function useMeterScopeGaps() {
  return useQuery({
    queryKey: METER_MANAGER_QUERY_KEYS.gaps(),
    queryFn: () => meterManagerApi.gaps(),
  });
}

export function useAssignMeters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignMetersPayload) => meterManagerApi.assign(payload),
    onSuccess: () => {
      // Invalidate `mine` too: an admin may be assigning themselves, and a
      // stale copy would leave their own buttons disabled until a reload.
      void queryClient.invalidateQueries({ queryKey: METER_MANAGER_QUERY_KEYS.all });
    },
  });
}

export function useRemoveUserElectricityMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => meterManagerApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: METER_MANAGER_QUERY_KEYS.all });
    },
  });
}
