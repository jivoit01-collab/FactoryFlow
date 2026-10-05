import {
  hashKey,
  keepPreviousData,
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  type AgingFilters,
  type OpenBillFilters,
  outstandingApi,
  type PartySide,
} from './outstanding.api';

/**
 * The server keeps each SAP read two minutes, so the page keeps it one: a
 * report opened again soon after shows at once, and Refresh is there for a
 * fresh read. No retry: a read of SAP that failed or timed out is better
 * reported than run again behind the user's back.
 */
const READ_OPTIONS = { staleTime: 60_000, retry: false } as const;

const ALL = ['sapFinance', 'outstanding'] as const;

const KEYS = {
  parties: (side: PartySide, oilSuppliers: boolean) =>
    [...ALL, 'parties', side, oilSuppliers] as const,
  bills: (filters: OpenBillFilters) => [...ALL, 'bills', filters] as const,
  grpos: (rawMaterial: boolean) => [...ALL, 'grpos', rawMaterial] as const,
  aging: (filters: AgingFilters) => [...ALL, 'aging', filters] as const,
};

export function usePartyOutstanding(side: PartySide, oilSuppliers: boolean, enabled = true) {
  return useQuery({
    queryKey: KEYS.parties(side, oilSuppliers),
    queryFn: () => outstandingApi.parties(side, oilSuppliers),
    enabled,
    ...READ_OPTIONS,
  });
}

export function useOpenBills(filters: OpenBillFilters, enabled = true) {
  return useQuery({
    queryKey: KEYS.bills(filters),
    queryFn: () => outstandingApi.bills(filters),
    enabled,
    placeholderData: keepPreviousData,
    ...READ_OPTIONS,
  });
}

export function useOpenGrpos(rawMaterial: boolean) {
  return useQuery({
    queryKey: KEYS.grpos(rawMaterial),
    queryFn: () => outstandingApi.grpos(rawMaterial),
    placeholderData: keepPreviousData,
    ...READ_OPTIONS,
  });
}

export function useCustomerAging(filters: AgingFilters, enabled = true) {
  return useQuery({
    queryKey: KEYS.aging(filters),
    queryFn: () => outstandingApi.aging(filters),
    enabled,
    placeholderData: keepPreviousData,
    ...READ_OPTIONS,
  });
}

/**
 * Refresh: the read on screen is asked for again with `refresh=1`, which reads
 * SAP afresh and replaces the server's copy, and goes straight into the cache.
 * Every other read of the same report is then fetched again, from that new
 * copy, so a summary beside the table does not show the old figures.
 */
function useRefresh<V, T>(
  family: string,
  key: (vars: V) => QueryKey,
  read: (vars: V) => Promise<T>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: read,
    onSuccess: (data, vars) => {
      const fresh = hashKey(key(vars));
      queryClient.setQueryData(key(vars), data);
      void queryClient.invalidateQueries({
        queryKey: [...ALL, family],
        predicate: (query) => query.queryHash !== fresh,
      });
    },
  });
}

export function useRefreshPartyOutstanding() {
  return useRefresh(
    'parties',
    (vars: { side: PartySide; oilSuppliers: boolean }) =>
      KEYS.parties(vars.side, vars.oilSuppliers),
    (vars) => outstandingApi.parties(vars.side, vars.oilSuppliers, true),
  );
}

export function useRefreshOpenBills() {
  return useRefresh('bills', KEYS.bills, (filters: OpenBillFilters) =>
    outstandingApi.bills(filters, true),
  );
}

export function useRefreshOpenGrpos() {
  return useRefresh('grpos', KEYS.grpos, (rawMaterial: boolean) =>
    outstandingApi.grpos(rawMaterial, true),
  );
}

export function useRefreshCustomerAging() {
  return useRefresh('aging', KEYS.aging, (filters: AgingFilters) =>
    outstandingApi.aging(filters, true),
  );
}

/** Every page of the open bills a filter leaves, for the Excel. */
export async function fetchAllOpenBills(
  filters: OpenBillFilters,
  limit: number,
  onProgress?: (done: number, of: number) => void,
) {
  const pageSize = 200;
  const first = await outstandingApi.bills({ ...filters, page: 1, page_size: pageSize });
  const wanted = Math.min(first.count, limit);
  const pages = Math.ceil(wanted / pageSize);
  const rows = [...first.results];
  onProgress?.(rows.length, wanted);
  // A few at a time: the server answers each from its copy of the SAP read.
  for (let page = 2; page <= pages; page += 4) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(4, pages - page + 1) }, (_, i) =>
        outstandingApi.bills({ ...filters, page: page + i, page_size: pageSize }),
      ),
    );
    for (const result of batch) rows.push(...result.results);
    onProgress?.(Math.min(rows.length, wanted), wanted);
  }
  return { rows: rows.slice(0, wanted), count: first.count };
}
