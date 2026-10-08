import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import type { BoardSettingsPayload, WarehouseSettingsPayload } from '../types';
import {
  boardSettingsApi,
  getApprovedPartialScans,
  getBoardWarehouses,
  getDayPlanBills,
  getEmployeeRoll,
  getFreightRate,
  getOwnedVehicleStatus,
  getPendingBillsByCompany,
  getPendingBillsForCompany,
  getPendingGrpoSummary,
  getStockInTransit,
  getTransporterAccount,
  logisticsControlApi,
} from './logistics-control.api';

export const LOGISTICS_CONTROL_QUERY_KEYS = {
  all: ['logistics-control'] as const,
  /**
   * Keyed on the company as well as the warehouse: the same warehouse code in
   * another company is a different shelf with its own capacity, and the backend
   * stores them separately.
   */
  warehouseSettings: (warehouse: string, companyId?: number | string) =>
    [...LOGISTICS_CONTROL_QUERY_KEYS.all, 'warehouse-settings', companyId, warehouse] as const,
  /** A company's typed-in board figures; the viewer's company id where none is named. */
  boardSettings: (scopeKey?: number | string) =>
    [...LOGISTICS_CONTROL_QUERY_KEYS.all, 'board-settings', scopeKey] as const,
  /** Every read of one company's warehouse list, ticked-only or full. */
  boardWarehousesFor: (companyCode?: string) =>
    [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'board-warehouses',
      ...(companyCode ? [companyCode] : []),
    ] as const,
  boardWarehouses: (companyCode: string, onBoard: boolean, itemGroups: readonly number[]) =>
    [
      ...LOGISTICS_CONTROL_QUERY_KEYS.boardWarehousesFor(companyCode),
      onBoard ? 'ticked' : 'all',
      itemGroups.join(','),
    ] as const,
  /** One company's stock across the warehouses ticked for it. */
  occupancy: (companyCode: string, warehouses: readonly string[], itemGroups: readonly number[]) =>
    [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'occupancy',
      companyCode,
      warehouses.join(','),
      itemGroups.join(','),
    ] as const,
};

/**
 * The warehouse's configured capacity and last audit date.
 *
 * Long stale time on purpose: these change when somebody walks into the config
 * screen and types, which is a few times a year, not on the board's refresh
 * cadence.
 */
export function useWarehouseSettings(warehouse: string, enabled = true, companyCode?: string) {
  const { currentCompany } = useAuth();
  // The board's own company where it names one, the viewer's otherwise. Both go
  // into the key as well as the request, so the two boards never serve each
  // other BH-FG's capacity from a cache entry keyed only on the warehouse.
  const scopeKey = companyCode ?? currentCompany?.company_id;

  return useQuery({
    queryKey: LOGISTICS_CONTROL_QUERY_KEYS.warehouseSettings(warehouse, scopeKey),
    queryFn: () => logisticsControlApi.getWarehouseSettings(warehouse, companyCode),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && Boolean(warehouse),
  });
}

export function useSaveWarehouseSettings(warehouse: string, companyCode?: string) {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  const scopeKey = companyCode ?? currentCompany?.company_id;

  return useMutation({
    mutationFn: (payload: WarehouseSettingsPayload) =>
      logisticsControlApi.saveWarehouseSettings(warehouse, payload, companyCode),
    onSuccess: (saved) => {
      // Seed the cache from the response rather than refetching: the board may
      // be open in another tab on the same screen, and it should show the new
      // capacity the moment it is saved.
      queryClient.setQueryData(
        LOGISTICS_CONTROL_QUERY_KEYS.warehouseSettings(warehouse, scopeKey),
        saved,
      );
      // The operations board reads capacity off the ticked list, so a capacity
      // typed here for a ticked warehouse has to reach it too. Every company's
      // list where none is named, since the viewer's company is not a code.
      void queryClient.invalidateQueries({
        queryKey: LOGISTICS_CONTROL_QUERY_KEYS.boardWarehousesFor(companyCode),
      });
    },
  });
}

/**
 * Every warehouse one company could put on the board, for the settings screen.
 *
 * One SAP read across the company's whole chart of warehouses, so it is not
 * polled; it refetches when the screen is opened again.
 */
export function useBoardWarehouseList(
  companyCode: string,
  itemGroups: readonly number[],
  enabled = true,
) {
  return useQuery({
    queryKey: LOGISTICS_CONTROL_QUERY_KEYS.boardWarehouses(companyCode, false, itemGroups),
    queryFn: () => getBoardWarehouses(companyCode, { itemGroups }),
    staleTime: 60 * 1000,
    enabled: enabled && Boolean(companyCode),
  });
}

/**
 * Tick a warehouse, or set its capacity or audit date, for one company.
 *
 * Refetches the company's lists rather than patching them: the full list is
 * ordered ticked-first, and the board's ticked list decides which warehouses
 * its stock is read from, so both have to be the server's answer.
 */
export function useSaveBoardWarehouse(companyCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      warehouse,
      payload,
    }: {
      warehouse: string;
      payload: WarehouseSettingsPayload;
    }) => logisticsControlApi.saveWarehouseSettings(warehouse, payload, companyCode),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: LOGISTICS_CONTROL_QUERY_KEYS.boardWarehousesFor(companyCode),
      }),
  });
}

/**
 * Bills dated to leave BH-BT, from the warehouse's own company only.
 *
 * Keyed on the company and window rather than the day, so it never shares a
 * cache entry with the site-wide feed the other control boards read — those
 * answer for every company, and mixing them is how Beverages bills ended up in
 * an Oil warehouse's tile.
 */
export function usePendingBillsForCompany(
  companyCode: string,
  window: { date_from: string; date_to: string },
  limit: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'pending-bills',
      companyCode,
      window.date_from,
      window.date_to,
    ] as const,
    queryFn: () => getPendingBillsForCompany(companyCode, window, limit),
    staleTime: 60 * 1000,
    enabled: enabled && Boolean(companyCode && window.date_from && window.date_to),
  });
}

/**
 * The bills scheduled to leave today, across the board's companies.
 *
 * Polled with the board: a plan booked onto a truck at eleven o'clock is part
 * of the day's commitment from eleven o'clock, so a wall showing this morning's
 * plan against this afternoon's tonnage would report a false overshoot.
 *
 * Keyed on the company list as well as the date — the same day read for one
 * company is a different answer and must not be served from this entry.
 */
export function useDayPlanBills(
  companyCodes: readonly string[],
  date: string,
  limit: number,
  refetchIntervalMs?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'day-plan-bills',
      companyCodes.join(','),
      date,
    ] as const,
    queryFn: () => getDayPlanBills(companyCodes, date, limit),
    staleTime: refetchIntervalMs ?? 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
    enabled: enabled && companyCodes.length > 0 && Boolean(date),
  });
}

/**
 * On-roll employees across the board's companies.
 *
 * Not polled and long stale: a payroll changes when somebody is hired or
 * leaves, which is not the cadence a dispatch board refreshes at, and re-asking
 * two companies for it every thirty seconds would be two requests spent on a
 * figure that moves monthly.
 */
export function useEmployeeRoll(companyCodes: readonly string[], enabled = true) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'employee-roll',
      companyCodes.join(','),
    ] as const,
    queryFn: () => getEmployeeRoll(companyCodes),
    staleTime: 15 * 60 * 1000,
    enabled: enabled && companyCodes.length > 0,
  });
}

/**
 * The pending service-GRPO queue, counted across both companies.
 *
 * Polled on the board's own cadence: a bilty is received and a GRPO posted
 * through the working day, and this is a Postgres aggregate with no SAP call
 * behind it, so it is cheap to keep current.
 */
export function usePendingGrpoSummary(
  companyCodes: readonly string[],
  refetchIntervalMs?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'pending-grpo-summary',
      companyCodes.join(','),
    ] as const,
    queryFn: () => getPendingGrpoSummary(companyCodes),
    staleTime: refetchIntervalMs ?? 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
    enabled: enabled && companyCodes.length > 0,
  });
}

/**
 * What a litre cost to move, across both companies.
 *
 * Slow-moving by nature — it changes when a service GRPO is posted, not when a
 * truck leaves — so it refreshes on the freight cadence rather than the board's.
 */
export function useFreightRate(
  companyCodes: readonly string[],
  dateFrom: string,
  dateTo: string,
  refetchIntervalMs?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'freight-rate',
      companyCodes.join(','),
      dateFrom,
      dateTo,
    ] as const,
    queryFn: () => getFreightRate(companyCodes, dateFrom, dateTo),
    staleTime: refetchIntervalMs ?? 5 * 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
    enabled: enabled && companyCodes.length > 0 && Boolean(dateFrom && dateTo),
  });
}

/**
 * What the plant owes its hauliers, read live off SAP.
 *
 * Polled, but slowly: an A/P invoice is posted and a payment is released a few
 * times a day, not a few times a minute, and each call is three HANA aggregates
 * per company. Long enough that the board is not hammering the shared SAP box,
 * short enough that a payment released this morning shows before lunch.
 */
export function useTransporterAccount(
  companyCodes: readonly string[],
  paymentDays: number,
  refetchIntervalMs?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'transporter-account',
      companyCodes.join(','),
      paymentDays,
    ] as const,
    queryFn: () => getTransporterAccount(companyCodes, paymentDays),
    staleTime: refetchIntervalMs ?? 5 * 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
    enabled: enabled && companyCodes.length > 0,
  });
}

/**
 * Approved partial-scan approvals across the board's companies.
 *
 * Keyed on the company list, so it never shares a cache entry with the Admin
 * screen's single-company read of the same register.
 */
export function useApprovedPartialScans(companyCodes: readonly string[], enabled = true) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'partial-scans',
      companyCodes.join(','),
    ] as const,
    queryFn: () => getApprovedPartialScans(companyCodes),
    staleTime: 60 * 1000,
    enabled: enabled && companyCodes.length > 0,
  });
}

/**
 * Owned vehicles and per-section staffing.
 *
 * For the board's own company where one is named, and the viewer's otherwise —
 * a wall screen must show the same fleet and the same salaries to everybody in
 * front of it, not whichever company the login happens to sit in.
 */
export function useBoardSettings(enabled = true, companyCode?: string) {
  const { currentCompany } = useAuth();
  const scopeKey = companyCode ?? currentCompany?.company_id;

  return useQuery({
    queryKey: LOGISTICS_CONTROL_QUERY_KEYS.boardSettings(scopeKey),
    queryFn: () => boardSettingsApi.get(companyCode),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useSaveBoardSettings(companyCode?: string) {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  const scopeKey = companyCode ?? currentCompany?.company_id;

  return useMutation({
    mutationFn: (payload: BoardSettingsPayload) => boardSettingsApi.save(payload, companyCode),
    onSuccess: (saved) => {
      queryClient.setQueryData(LOGISTICS_CONTROL_QUERY_KEYS.boardSettings(scopeKey), saved);
    },
  });
}

/**
 * The owned fleet's duty state, polled with the board.
 *
 * Gate arrivals move through the day, so this follows the board's refresh
 * rather than the long stale window the configuration itself uses.
 */
export function useOwnedVehicleStatus(
  refetchIntervalMs?: number,
  companyCode?: string,
  enabled = true,
) {
  const { currentCompany } = useAuth();
  const scopeKey = companyCode ?? currentCompany?.company_id;

  return useQuery({
    queryKey: [...LOGISTICS_CONTROL_QUERY_KEYS.all, 'owned-vehicles', scopeKey] as const,
    queryFn: () => getOwnedVehicleStatus(companyCode),
    enabled,
    staleTime: refetchIntervalMs ?? 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
  });
}

/**
 * Stock in transit, polled with the board — transfers close through the day.
 *
 * `enabled` is how a scope with no intercompany route switches it off: the
 * endpoint's route table is a backend constant, so a board with no leg in it
 * would spend a poll to be told nothing, every minute, forever.
 */
export function useStockInTransit(
  refetchIntervalMs?: number,
  companyCode?: string,
  enabled = true,
) {
  const { currentCompany } = useAuth();
  const scopeKey = companyCode ?? currentCompany?.company_id;

  return useQuery({
    queryKey: [...LOGISTICS_CONTROL_QUERY_KEYS.all, 'stock-in-transit', scopeKey] as const,
    queryFn: () => getStockInTransit(companyCode),
    staleTime: refetchIntervalMs ?? 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
    enabled,
  });
}

/** Pending bills for each of the board's companies, kept separable. */
export function usePendingBillsByCompany(
  companyCodes: readonly string[],
  window: { date_from: string; date_to: string },
  limit: number,
  /** Booking states to ask for, one request each. Empty asks once, unfiltered. */
  bookingStatuses: readonly string[] = [],
  enabled = true,
) {
  return useQuery({
    // The states are in the key as well as the window: the same window read
    // for two states is a different answer and must not be served from the
    // entry the unfiltered read left behind.
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'pending-bills-by-company',
      companyCodes.join(','),
      window.date_from,
      window.date_to,
      bookingStatuses.join(','),
    ] as const,
    queryFn: () => getPendingBillsByCompany(companyCodes, window, limit, bookingStatuses),
    staleTime: 60 * 1000,
    enabled: enabled && companyCodes.length > 0 && Boolean(window.date_from),
  });
}
