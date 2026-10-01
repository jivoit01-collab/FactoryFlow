import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { nonMovingApi } from '../../non-moving/api';
import type { NonMovingFilters } from '../../non-moving/types';
import { WAREHOUSE_CONTROL_QUERY_KEYS } from '../../warehouse-control/api';
import { getBoardWarehouses, getOccupancyForCompany, LOGISTICS_CONTROL_QUERY_KEYS } from '../api';
import {
  LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS,
  LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS,
  LOGISTICS_CONTROL_NON_MOVING_ITEM_GROUP,
  LOGISTICS_CONTROL_REFRESH_MS,
  LOGISTICS_CONTROL_STALE_TIME,
  LOGISTICS_CONTROL_STOCK_ITEM_GROUPS,
  type LogisticsControlScope,
} from '../constants';
import { combineWarehouseSides, rollUpWarehouseSide, type WarehouseSideFigures } from '../utils';

/** SAP hiccups are worth one retry; an auth or permission answer is not. */
function sapRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

/**
 * The idle-stock read, keyed exactly as the Warehouse Control board keys it so
 * the two share one cache entry per company. The warehouse is not in the key
 * because the endpoint does not filter on it — each side narrows the rows.
 */
const NON_MOVING_FILTERS: NonMovingFilters = {
  age: LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS,
  item_group: LOGISTICS_CONTROL_NON_MOVING_ITEM_GROUP,
  count_production: true,
};

/** One side as the band renders it: its figures and the state of its reads. */
export interface WarehouseSide extends WarehouseSideFigures {
  /** Nothing is ticked for this company, which is not the same as empty. */
  configured: boolean;
  loading: boolean;
  /** Its ticked list or its stock could not be read. */
  error: unknown;
  /** Its idle stock could not be read. */
  idleError: unknown;
}

/**
 * The warehouse band's reads, one company at a time.
 *
 * Three reads per side, each pinned to that side's company: which warehouses
 * are ticked (Postgres, cheap, so polled with the board and a tick made on the
 * settings screen reaches the wall within a minute), what stands in them (one
 * SAP read across all of that company's ticked warehouses), and what has not
 * moved (the company's non-moving report, narrowed here).
 *
 * `useQueries` rather than one hook per company, because how many sides there
 * are follows the scope, and the scope follows whichever company the browser
 * is signed into.
 */
export function useWarehouseSides(scope: LogisticsControlScope, enabled = true) {
  const companies = scope.warehouseSides.map((side) => side.companyCode);
  const companyKey = companies.join(',');

  const ticked = useQueries({
    queries: companies.map((companyCode) => ({
      queryKey: LOGISTICS_CONTROL_QUERY_KEYS.boardWarehouses(companyCode, true, []),
      queryFn: () => getBoardWarehouses(companyCode, { onBoard: true }),
      staleTime: LOGISTICS_CONTROL_STALE_TIME,
      refetchInterval: LOGISTICS_CONTROL_REFRESH_MS,
      refetchIntervalInBackground: true,
      enabled,
    })),
  });

  const codesFor = (index: number) =>
    (ticked[index]?.data?.warehouses ?? []).map((row) => row.warehouse).sort();

  const stock = useQueries({
    queries: companies.map((companyCode, index) => {
      const codes = codesFor(index);
      return {
        queryKey: LOGISTICS_CONTROL_QUERY_KEYS.occupancy(
          companyCode,
          codes,
          LOGISTICS_CONTROL_STOCK_ITEM_GROUPS,
        ),
        queryFn: () =>
          getOccupancyForCompany(companyCode, codes, LOGISTICS_CONTROL_STOCK_ITEM_GROUPS),
        staleTime: LOGISTICS_CONTROL_STALE_TIME,
        refetchInterval: LOGISTICS_CONTROL_REFRESH_MS,
        refetchIntervalInBackground: true,
        retry: sapRetry,
        // Nothing ticked is nothing to read, not an empty warehouse to ask SAP
        // about.
        enabled: enabled && codes.length > 0,
      };
    }),
  });

  const idle = useQueries({
    queries: companies.map((companyCode, index) => ({
      queryKey: WAREHOUSE_CONTROL_QUERY_KEYS.nonMovingReport(companyCode, NON_MOVING_FILTERS),
      queryFn: () => nonMovingApi.getReport(NON_MOVING_FILTERS, companyCode),
      staleTime: LOGISTICS_CONTROL_STALE_TIME,
      retry: sapRetry,
      enabled: enabled && codesFor(index).length > 0,
    })),
  });

  const tickedData = ticked.map((query) => query.data);
  const stockData = stock.map((query) => query.data);
  const idleData = idle.map((query) => query.data);
  /**
   * When each read last landed, as one string.
   *
   * The roll-up's dependency, rather than the data objects spread into the
   * list: how many there are follows the scope, and a dependency list must
   * not change length between renders.
   */
  const dataKey = [...ticked, ...stock, ...idle].map((query) => query.dataUpdatedAt).join(',');

  // The arithmetic is memoised on the data; the read state beside it is not,
  // because a read that fails changes its error without changing its data.
  const figures = useMemo(
    () =>
      companies.map((companyCode, index) =>
        rollUpWarehouseSide({
          companyCode,
          warehouses: tickedData[index]?.warehouses ?? [],
          stockRows: stockData[index]?.data ?? [],
          idleRows: idleData[index]?.data ?? [],
          ageingDays: LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS,
        }),
      ),
    // `dataKey` changes exactly when a read lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyKey, dataKey],
  );

  const sides: WarehouseSide[] = figures.map((side, index) => {
    const configured = side.warehouses.length > 0;
    return {
      ...side,
      configured,
      loading:
        ticked[index].isLoading ||
        (configured && (stock[index].isLoading || idle[index].isLoading)),
      error: ticked[index].error ?? (configured ? stock[index].error : null) ?? null,
      idleError: configured ? (idle[index].error ?? null) : null,
    };
  });

  const combined = useMemo(() => combineWarehouseSides(figures), [figures]);

  return {
    sides,
    combined,
    /** Every ticked warehouse code, across the sides. */
    codes: sides.flatMap((side) => side.warehouses.map((row) => row.warehouse)),
    /**
     * Companies whose stock is missing from the combined figure.
     *
     * Named rather than dropped silently: a total short by a company reads as
     * a quieter warehouse, which is the one reading this band must not invite.
     */
    unread: sides.filter((side) => side.error).map((side) => side.companyCode),
    idleUnread: sides.filter((side) => side.idleError).map((side) => side.companyCode),
    loading: sides.some((side) => side.loading),
    isFetching: [...ticked, ...stock, ...idle].some((query) => query.isFetching),
    error:
      sides.map((side) => side.error).find(Boolean) ??
      sides.map((side) => side.idleError).find(Boolean) ??
      null,
  };
}
