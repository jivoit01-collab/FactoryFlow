/**
 * React-query hooks for the tank farm and oil lots.
 *
 * A lot move touches more than the lot: a split changes its parent, an arrival
 * weighed short writes a shortage, the first arrival into the tanks writes the
 * tank log, and a dip can complete older lots. So a write invalidates the whole
 * farm (``['exim', 'farm']``) - one refetch per screen, and no screen left
 * showing a figure another write has moved.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ArrivePayload,
  BulkAction,
  DispatchPayload,
  IntoTankPayload,
  LotChangeParams,
  LotCreatePayload,
  LotDetail,
  LotFieldsPayload,
  LotFilters,
  MovePayload,
  OilPayload,
  OpeningStockPayload,
  TankCreatePayload,
  TankUpdatePayload,
} from '../types';
import { farmApi } from './farm.api';

export const FARM_KEYS = {
  all: ['exim', 'farm'] as const,
  oils: (activeOnly: boolean) => ['exim', 'farm', 'oils', activeOnly] as const,
  sapOils: () => ['exim', 'farm', 'sap-oils'] as const,
  tanks: () => ['exim', 'farm', 'tanks'] as const,
  tankSummary: () => ['exim', 'farm', 'tank-summary'] as const,
  averages: () => ['exim', 'farm', 'averages'] as const,
  average: (item: number) => ['exim', 'farm', 'average', item] as const,
  tankLog: () => ['exim', 'farm', 'tank-log'] as const,
  lots: (filters?: LotFilters) => ['exim', 'farm', 'lots', filters ?? {}] as const,
  lotInsights: (filters?: LotFilters) => ['exim', 'farm', 'lot-insights', filters ?? {}] as const,
  lot: (id: number) => ['exim', 'farm', 'lot', id] as const,
  lotChanges: (params: object) => ['exim', 'farm', 'lot-changes', params] as const,
  stockDashboard: (filters?: object) => ['exim', 'farm', 'stock-dashboard', filters ?? {}] as const,
  vehicleReport: (status: string) => ['exim', 'farm', 'vehicle-report', status] as const,
  shortages: () => ['exim', 'farm', 'shortages'] as const,
  contractHistory: () => ['exim', 'farm', 'contract-history'] as const,
  vendors: () => ['exim', 'farm', 'vendors'] as const,
  director: () => ['exim', 'farm', 'director-inventory'] as const,
};

function useInvalidateFarm() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FARM_KEYS.all });
}

/** Put the lot the server returned straight into its detail cache, then refresh the rest. */
function useSettleLot() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFarm();
  return (lot: LotDetail) => {
    queryClient.setQueryData(FARM_KEYS.lot(lot.id), lot);
    invalidate();
  };
}

// --- oils and tanks ----------------------------------------------------------

export function useOils(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: FARM_KEYS.oils(activeOnly),
    queryFn: () => farmApi.listOils(activeOnly),
    staleTime: 60_000,
    enabled,
  });
}

export function useSaveOil() {
  const invalidate = useInvalidateFarm();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: OilPayload }) =>
      id ? farmApi.updateOil(id, payload) : farmApi.createOil(payload),
    onSuccess: invalidate,
  });
}

/** SAP's raw-material oils. Under the farm key, so adding an oil re-marks which are taken. */
export function useSapOils(enabled = true) {
  return useQuery({
    queryKey: FARM_KEYS.sapOils(),
    queryFn: () => farmApi.sapOils(),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}

export function useDeleteOil() {
  const invalidate = useInvalidateFarm();
  return useMutation({ mutationFn: (id: number) => farmApi.deleteOil(id), onSuccess: invalidate });
}

export function useTanks() {
  return useQuery({ queryKey: FARM_KEYS.tanks(), queryFn: () => farmApi.listTanks() });
}

export function useCreateTank() {
  const invalidate = useInvalidateFarm();
  return useMutation({
    mutationFn: (payload: TankCreatePayload) => farmApi.createTank(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTank() {
  const invalidate = useInvalidateFarm();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TankUpdatePayload }) =>
      farmApi.updateTank(id, payload),
    onSuccess: invalidate,
  });
}

export function useEmptyTank() {
  const invalidate = useInvalidateFarm();
  return useMutation({ mutationFn: (id: number) => farmApi.emptyTank(id), onSuccess: invalidate });
}

export function useDeleteTank() {
  const invalidate = useInvalidateFarm();
  return useMutation({ mutationFn: (id: number) => farmApi.deleteTank(id), onSuccess: invalidate });
}

/** The farm in totals and by oil. Refreshed every minute: a wall screen reads it. */
export function useTankSummary(enabled = true) {
  return useQuery({
    queryKey: FARM_KEYS.tankSummary(),
    queryFn: () => farmApi.tankSummary(),
    refetchInterval: 60_000,
    enabled,
  });
}

export function useAverageCosts(enabled = true) {
  return useQuery({
    queryKey: FARM_KEYS.averages(),
    queryFn: () => farmApi.averageCosts(),
    enabled,
  });
}

export function useAverageCost(item: number | null) {
  return useQuery({
    queryKey: FARM_KEYS.average(item ?? 0),
    queryFn: () => farmApi.averageCost(item as number),
    enabled: !!item,
  });
}

export function useOpeningStock() {
  const invalidate = useInvalidateFarm();
  return useMutation({
    mutationFn: (payload: OpeningStockPayload) => farmApi.openingStock(payload),
    onSuccess: invalidate,
  });
}

export function useTankLog() {
  return useQuery({ queryKey: FARM_KEYS.tankLog(), queryFn: () => farmApi.tankLog() });
}

// --- lots ---------------------------------------------------------------------

export function useLots(filters?: LotFilters) {
  return useQuery({
    queryKey: FARM_KEYS.lots(filters),
    queryFn: () => farmApi.listLots(filters),
    placeholderData: (previous) => previous,
  });
}

export function useLotInsights(filters?: LotFilters) {
  return useQuery({
    queryKey: FARM_KEYS.lotInsights(filters),
    queryFn: () => farmApi.lotInsights(filters),
    placeholderData: (previous) => previous,
  });
}

export function useLot(id: number | null) {
  return useQuery({
    queryKey: FARM_KEYS.lot(id ?? 0),
    queryFn: () => farmApi.getLot(id as number),
    enabled: !!id && id > 0,
  });
}

export function useCreateLot() {
  const settle = useSettleLot();
  return useMutation({
    mutationFn: (payload: LotCreatePayload) => farmApi.createLot(payload),
    onSuccess: settle,
  });
}

export function useUpdateLot(id: number) {
  const settle = useSettleLot();
  return useMutation({
    mutationFn: (payload: LotFieldsPayload) => farmApi.updateLot(id, payload),
    onSuccess: settle,
  });
}

export function useDeleteLot() {
  const invalidate = useInvalidateFarm();
  return useMutation({ mutationFn: (id: number) => farmApi.deleteLot(id), onSuccess: invalidate });
}

export function useMoveLot(id: number) {
  const settle = useSettleLot();
  return useMutation({
    mutationFn: (payload: MovePayload) => farmApi.moveLot(id, payload),
    onSuccess: settle,
  });
}

export function useDispatchLot(id: number) {
  const settle = useSettleLot();
  return useMutation({
    mutationFn: (payload: DispatchPayload) => farmApi.dispatchLot(id, payload),
    onSuccess: settle,
  });
}

export function useArriveLot(id: number) {
  const settle = useSettleLot();
  return useMutation({
    mutationFn: (payload: ArrivePayload) => farmApi.arriveLot(id, payload),
    onSuccess: settle,
  });
}

export function useIntoTank(id: number) {
  const settle = useSettleLot();
  return useMutation({
    mutationFn: (payload: IntoTankPayload) => farmApi.intoTank(id, payload),
    onSuccess: settle,
  });
}

export function useBulkLots() {
  const invalidate = useInvalidateFarm();
  return useMutation({
    mutationFn: ({ action, lots }: { action: BulkAction; lots: number[] }) =>
      farmApi.bulk(action, lots),
    onSuccess: invalidate,
  });
}

export function useLotChanges(params: LotChangeParams) {
  return useQuery({
    queryKey: FARM_KEYS.lotChanges(params),
    queryFn: () => farmApi.lotChanges(params),
    placeholderData: (previous) => previous,
  });
}

// --- read-outs ------------------------------------------------------------------

export function useStockDashboard(filters?: { item?: number; vendor?: string; status?: string }) {
  return useQuery({
    queryKey: FARM_KEYS.stockDashboard(filters),
    queryFn: () => farmApi.stockDashboard(filters),
    placeholderData: (previous) => previous,
  });
}

export function useReorderStockDashboard() {
  const invalidate = useInvalidateFarm();
  return useMutation({
    mutationFn: (items: number[]) => farmApi.reorderStockDashboard(items),
    onSuccess: invalidate,
  });
}

export function useVehicleReport(status: string) {
  return useQuery({
    queryKey: FARM_KEYS.vehicleReport(status),
    queryFn: () => farmApi.vehicleReport(status),
    enabled: !!status,
  });
}

export function useShortages() {
  return useQuery({ queryKey: FARM_KEYS.shortages(), queryFn: () => farmApi.shortages() });
}

export function useContractHistory() {
  return useQuery({
    queryKey: FARM_KEYS.contractHistory(),
    queryFn: () => farmApi.contractHistory(),
  });
}

/** SAP's vendors and the temporary ones. Barely moves within a session. */
export function useVendors(enabled = true) {
  return useQuery({
    queryKey: FARM_KEYS.vendors(),
    queryFn: () => farmApi.vendors(),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}

export function useCreateTemporaryVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => farmApi.createTemporaryVendor(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FARM_KEYS.vendors() }),
  });
}

export function useDirectorInventory() {
  return useQuery({ queryKey: FARM_KEYS.director(), queryFn: () => farmApi.directorInventory() });
}
