import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  type AssignWarehousesPayload,
  userWarehouseApi,
} from './userWarehouse.api';

export const USER_WAREHOUSE_QUERY_KEYS = {
  all: ['warehouse', 'user-warehouses'] as const,
  mine: () => [...USER_WAREHOUSE_QUERY_KEYS.all, 'mine'] as const,
  list: (user?: number) => [...USER_WAREHOUSE_QUERY_KEYS.all, 'list', user ?? 0] as const,
  gaps: () => [...USER_WAREHOUSE_QUERY_KEYS.all, 'gaps'] as const,
};

/**
 * The warehouses the current user manages.
 *
 * Cached generously: it changes only when an admin reassigns someone, and every
 * warehouse screen asks for it to decide what to enable.
 */
export function useMyWarehouses() {
  return useQuery({
    queryKey: USER_WAREHOUSE_QUERY_KEYS.mine(),
    queryFn: () => userWarehouseApi.mine(),
    staleTime: 5 * 60 * 1000,
    // One retry, not the default three: when the endpoint is absent (a frontend
    // deployed ahead of its backend) every warehouse screen would otherwise
    // spend four failed round-trips before settling.
    retry: 1,
  });
}

/**
 * The current user's warehouse scope, in the form the screens actually need.
 *
 * **Fails open when the scope is unknown**, and that is the important part. The
 * server is the enforcement point; this hook exists only so a user is not sent
 * to fill in a form the server will refuse. If the answer cannot be fetched —
 * still loading, network down, or the endpoint missing because the frontend was
 * deployed ahead of the backend — the client must not invent a restriction.
 *
 * Getting this backwards took out BST creation and transfer raising in
 * production on 27 Aug 2026: the bundle shipped from a working tree whose
 * backend was never deployed, `/warehouse/my-warehouses/` 404'd, `data` came
 * back undefined, and code reading `data?.warehouse_codes ?? []` concluded that
 * every user managed nothing.
 */
export function useWarehouseScope() {
  const { data, isLoading, isError } = useMyWarehouses();

  const known = !isLoading && !isError && !!data;
  const unrestricted = !known || data.unrestricted;

  const codes = useMemo(
    () => new Set((data?.warehouse_codes ?? []).map((c) => c.toUpperCase())),
    [data],
  );

  return {
    /** False while loading or if the lookup failed — nothing is restricted then. */
    scopeKnown: known,
    /** True for superusers, and whenever the scope could not be determined. */
    unrestricted,
    codes,
    /** Does the user run this warehouse? Unknown scope answers yes. */
    manages: (code?: string | null) =>
      unrestricted || (!!code && codes.has(code.trim().toUpperCase())),
    /**
     * The user genuinely manages nothing — known scope, not a superuser, empty
     * list. Only this warrants telling them to see an administrator; an
     * unreachable endpoint must never produce that message.
     */
    managesNothing: known && !data.unrestricted && codes.size === 0,
  };
}

export function useUserWarehouses(user?: number) {
  return useQuery({
    queryKey: USER_WAREHOUSE_QUERY_KEYS.list(user),
    queryFn: () => userWarehouseApi.list({ user }),
  });
}

export function useWarehouseScopeGaps() {
  return useQuery({
    queryKey: USER_WAREHOUSE_QUERY_KEYS.gaps(),
    queryFn: () => userWarehouseApi.gaps(),
  });
}

export function useAssignWarehouses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignWarehousesPayload) => userWarehouseApi.assign(payload),
    onSuccess: () => {
      // Invalidate `mine` too: an admin may be assigning themselves, and a
      // stale copy would leave their own dropdowns empty until a reload.
      void qc.invalidateQueries({ queryKey: USER_WAREHOUSE_QUERY_KEYS.all });
    },
  });
}

export function useRemoveUserWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userWarehouseApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USER_WAREHOUSE_QUERY_KEYS.all });
    },
  });
}
