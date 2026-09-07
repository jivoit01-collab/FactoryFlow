import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { bstOutApi } from '@/modules/gate/api/bstOut/bstOut.api';
import { emptyVehicleInApi } from '@/modules/gate/api/emptyVehicleIn/emptyVehicleIn.api';
import { emptyVehicleOutApi } from '@/modules/gate/api/emptyVehicleOut/emptyVehicleOut.api';
import { jobWorkApi } from '@/modules/gate/api/jobWork/jobWork.api';
import { personGateInApi } from '@/modules/gate/api/personGateIn/personGateIn.api';
import { rejectedQCReturnApi } from '@/modules/gate/api/rejectedQcReturn/rejectedQcReturn.api';
import { salesDispatchApi } from '@/modules/gate/api/salesDispatch/salesDispatch.api';
import { vehicleEntryApi } from '@/modules/gate/api/vehicle/vehicleEntry.api';

import { GATE_REFRESH_MS, type GateRange } from '../constants/gate-dashboard.constants';

/** Entry-type tokens accepted by the vehicle-entries count endpoint. */
const ENTRY_TYPE = {
  RAW_MATERIAL: 'RAW_MATERIAL',
  DAILY_NEED: 'DAILY_NEED',
  MAINTENANCE: 'MAINTENANCE',
  CONSTRUCTION: 'CONSTRUCTION',
  FIXED_ASSET: 'FIXED_ASSET',
} as const;

function retry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 1;
}

/** Sum the per-status counts returned by the vehicle-entries count endpoint. */
function sumEntryCounts(r: { total_vehicle_entries: { count: number }[] }): number {
  return (r.total_vehicle_entries ?? []).reduce((sum, s) => sum + (s.count ?? 0), 0);
}

interface CountDescriptor {
  route: string;
  permissions: readonly string[];
  queryKey: readonly unknown[];
  queryFn: () => Promise<number>;
}

export interface GateActivityCounts {
  counts: Record<string, number | undefined>;
  isLoading: boolean;
  /** True while any count is in flight — the wall's spinning refresh icon. */
  isFetching: boolean;
  /** Newest successful read across every count; 0 until the first lands. */
  updatedAt: number;
  refetch: () => void;
}

/**
 * Live count per gate activity, keyed by route. Each is permission-gated (so we
 * never call an endpoint the user can't see) and independently guarded — a
 * failing endpoint just leaves that card without a number. Gate-in variants use
 * the lightweight vehicle-entries count endpoint; the rest use their list/
 * dashboard endpoints.
 *
 * Every descriptor must pass `dateParams` to its endpoint. The list endpoints
 * all accept `from_date`/`to_date` and return *everything* without them, so an
 * omission does not fail loudly — it silently reports a lifetime total under a
 * heading that says "today", and re-fetches it on each date change (the key
 * carries the dates) only to show the same number back. That is how this board
 * came to claim 360 empty-vehicle entries on a single day.
 */
export function useGateActivityCounts(range: GateRange): GateActivityCounts {
  const { hasAnyPermission } = usePermission();
  const { from, to } = range;
  const dateParams = useMemo(() => ({ from_date: from, to_date: to }), [from, to]);

  const descriptors = useMemo<CountDescriptor[]>(
    () => [
      {
        route: '/gate/empty-vehicle-in',
        permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.VIEW],
        queryKey: ['gate-count', 'empty-vehicle-in', dateParams],
        queryFn: async () => (await emptyVehicleInApi.list(dateParams)).length,
      },
      {
        route: '/gate/empty-vehicle-out',
        permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.VIEW],
        queryKey: ['gate-count', 'empty-vehicle-out', dateParams],
        queryFn: async () => (await emptyVehicleOutApi.list(dateParams)).length,
      },
      {
        route: '/gate/sales-dispatch',
        permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
        queryKey: ['gate-count', 'sales-dispatch', dateParams],
        queryFn: async () =>
          (
            await salesDispatchApi.list({
              from_date: from,
              to_date: to,
              document_type: 'INVOICE',
            })
          ).length,
      },
      {
        route: '/gate/raw-materials',
        permissions: [GATE_PERMISSIONS.RAW_MATERIAL.VIEW, GATE_PERMISSIONS.RAW_MATERIAL.VIEW_FULL],
        queryKey: ['gate-count', 'raw-materials', dateParams],
        queryFn: async () =>
          sumEntryCounts(
            await vehicleEntryApi.getCount({ ...dateParams, entry_type: ENTRY_TYPE.RAW_MATERIAL }),
          ),
      },
      {
        route: '/gate/daily-needs',
        permissions: [GATE_PERMISSIONS.DAILY_NEEDS.VIEW, GATE_PERMISSIONS.DAILY_NEEDS.VIEW_FULL],
        queryKey: ['gate-count', 'daily-needs', dateParams],
        queryFn: async () =>
          sumEntryCounts(
            await vehicleEntryApi.getCount({ ...dateParams, entry_type: ENTRY_TYPE.DAILY_NEED }),
          ),
      },
      {
        route: '/gate/maintenance',
        permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
        queryKey: ['gate-count', 'maintenance', dateParams],
        queryFn: async () =>
          sumEntryCounts(
            await vehicleEntryApi.getCount({ ...dateParams, entry_type: ENTRY_TYPE.MAINTENANCE }),
          ),
      },
      {
        route: '/gate/construction',
        permissions: [GATE_PERMISSIONS.CONSTRUCTION.VIEW, GATE_PERMISSIONS.CONSTRUCTION.VIEW_FULL],
        queryKey: ['gate-count', 'construction', dateParams],
        queryFn: async () =>
          sumEntryCounts(
            await vehicleEntryApi.getCount({ ...dateParams, entry_type: ENTRY_TYPE.CONSTRUCTION }),
          ),
      },
      {
        route: '/gate/fixed-assets',
        permissions: [GATE_PERMISSIONS.FIXED_ASSET.VIEW],
        queryKey: ['gate-count', 'fixed-assets', dateParams],
        queryFn: async () =>
          sumEntryCounts(
            await vehicleEntryApi.getCount({ ...dateParams, entry_type: ENTRY_TYPE.FIXED_ASSET }),
          ),
      },
      {
        route: '/gate/rejected-qc-return',
        permissions: [GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW],
        queryKey: ['gate-count', 'rejected-qc-return', dateParams],
        queryFn: async () => (await rejectedQCReturnApi.list(dateParams)).length,
      },
      {
        route: '/gate/job-work',
        permissions: [GATE_PERMISSIONS.JOB_WORK.VIEW],
        queryKey: ['gate-count', 'job-work', dateParams],
        queryFn: async () => (await jobWorkApi.list(dateParams)).length,
      },
      {
        route: '/gate/bst-out',
        permissions: [GATE_PERMISSIONS.BST_OUT.VIEW],
        queryKey: ['gate-count', 'bst-out', dateParams],
        queryFn: async () => (await bstOutApi.list(dateParams)).length,
      },
      {
        route: '/gate/visitor-labour',
        permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
        queryKey: ['gate-count', 'visitor-labour', dateParams],
        queryFn: async () => (await personGateInApi.getDashboard(dateParams)).current.total_inside,
      },
      // Labour is deliberately absent from this list. The same day register
      // carries both the gate head-count and its per-department split, and the
      // wall needs the raw entries for the split, so counting it here as well
      // would pull the same endpoint twice every poll. `useGateBoard` owns it.
    ],
    [dateParams, from, to],
  );

  const results = useQueries({
    queries: descriptors.map((d) => ({
      queryKey: d.queryKey,
      queryFn: d.queryFn,
      enabled: hasAnyPermission([...d.permissions]),
      staleTime: GATE_REFRESH_MS,
      refetchInterval: GATE_REFRESH_MS,
      refetchOnWindowFocus: true,
      retry,
    })),
  });

  return useMemo(() => {
    const counts: Record<string, number | undefined> = {};
    let isLoading = false;
    let isFetching = false;
    let updatedAt = 0;
    descriptors.forEach((d, i) => {
      const r = results[i];
      counts[d.route] = r?.data;
      if (r?.isLoading && r?.fetchStatus !== 'idle') isLoading = true;
      if (r?.isFetching) isFetching = true;
      // Newest wins: the board is as fresh as its freshest register, and a
      // permission-disabled query (which never updates) must not drag it down.
      if (r?.dataUpdatedAt) updatedAt = Math.max(updatedAt, r.dataUpdatedAt);
    });
    const refetch = () => results.forEach((r) => void r?.refetch());
    return { counts, isLoading, isFetching, updatedAt, refetch };
  }, [descriptors, results]);
}
