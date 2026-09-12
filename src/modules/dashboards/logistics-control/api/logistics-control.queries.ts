import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import type { BoardSettingsPayload, WarehouseSettingsPayload } from '../types';
import {
  boardSettingsApi,
  getApprovedPartialScans,
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
};

/**
 * The warehouse's configured capacity and last audit date.
 *
 * Long stale time on purpose: these change when somebody walks into the config
 * screen and types, which is a few times a year, not on the board's refresh
 * cadence.
 */
export function useWarehouseSettings(warehouse: string, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: LOGISTICS_CONTROL_QUERY_KEYS.warehouseSettings(
      warehouse,
      currentCompany?.company_id,
    ),
    queryFn: () => logisticsControlApi.getWarehouseSettings(warehouse),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && Boolean(warehouse),
  });
}

export function useSaveWarehouseSettings(warehouse: string) {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: (payload: WarehouseSettingsPayload) =>
      logisticsControlApi.saveWarehouseSettings(warehouse, payload),
    onSuccess: (saved) => {
      // Seed the cache from the response rather than refetching: the board may
      // be open in another tab on the same screen, and it should show the new
      // capacity the moment it is saved.
      queryClient.setQueryData(
        LOGISTICS_CONTROL_QUERY_KEYS.warehouseSettings(
          warehouse,
          currentCompany?.company_id,
        ),
        saved,
      );
    },
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

const BOARD_SETTINGS_KEY = [...LOGISTICS_CONTROL_QUERY_KEYS.all, 'board-settings'] as const;

/** Owned vehicles and per-section staffing, for the active company. */
export function useBoardSettings(enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: [...BOARD_SETTINGS_KEY, currentCompany?.company_id] as const,
    queryFn: () => boardSettingsApi.get(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useSaveBoardSettings() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: (payload: BoardSettingsPayload) => boardSettingsApi.save(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(
        [...BOARD_SETTINGS_KEY, currentCompany?.company_id] as const,
        saved,
      );
    },
  });
}

/**
 * The owned fleet's duty state, polled with the board.
 *
 * Gate arrivals move through the day, so this follows the board's refresh
 * rather than the long stale window the configuration itself uses.
 */
export function useOwnedVehicleStatus(refetchIntervalMs?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'owned-vehicles',
      currentCompany?.company_id,
    ] as const,
    queryFn: () => getOwnedVehicleStatus(),
    staleTime: refetchIntervalMs ?? 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
  });
}

/** Stock in transit, polled with the board — transfers close through the day. */
export function useStockInTransit(refetchIntervalMs?: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'stock-in-transit',
      currentCompany?.company_id,
    ] as const,
    queryFn: () => getStockInTransit(),
    staleTime: refetchIntervalMs ?? 60 * 1000,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: refetchIntervalMs !== undefined,
  });
}

/** Pending bills for each of the board's companies, kept separable. */
export function usePendingBillsByCompany(
  companyCodes: readonly string[],
  window: { date_from: string; date_to: string },
  limit: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...LOGISTICS_CONTROL_QUERY_KEYS.all,
      'pending-bills-by-company',
      companyCodes.join(','),
      window.date_from,
      window.date_to,
    ] as const,
    queryFn: () => getPendingBillsByCompany(companyCodes, window, limit),
    staleTime: 60 * 1000,
    enabled: enabled && companyCodes.length > 0 && Boolean(window.date_from),
  });
}
