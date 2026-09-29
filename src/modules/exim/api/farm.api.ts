import { apiClient } from '@/core/api';

import type {
  ArrivePayload,
  AverageCost,
  BulkAction,
  ContractHistoryRow,
  DirectorInventory,
  DispatchPayload,
  IntoTankPayload,
  Lot,
  LotChangePage,
  LotChangeParams,
  LotCreatePayload,
  LotDetail,
  LotFieldsPayload,
  LotFilters,
  LotInsights,
  MovePayload,
  Oil,
  OilPayload,
  OpeningStockPayload,
  SapOilList,
  ShortageList,
  StockDashboard,
  Tank,
  TankCreatePayload,
  TankLog,
  TankSummary,
  TankUpdatePayload,
  VehicleReportRow,
  Vendor,
  VendorList,
} from '../types';

export const FARM_ENDPOINTS = {
  OILS: '/exim/oils/',
  OIL: (id: number) => `/exim/oils/${id}/`,
  SAP_OILS: '/exim/oils/sap/',
  TANKS: '/exim/tanks/',
  TANK: (id: number) => `/exim/tanks/${id}/`,
  TANK_EMPTY: (id: number) => `/exim/tanks/${id}/empty/`,
  TANK_SUMMARY: '/exim/tanks/summary/',
  TANK_AVERAGE: '/exim/tanks/average/',
  OPENING_STOCK: '/exim/tanks/opening-stock/',
  TANK_LOG: '/exim/tank-log/',
  LOTS: '/exim/lots/',
  LOT: (id: number) => `/exim/lots/${id}/`,
  LOT_MOVE: (id: number) => `/exim/lots/${id}/move/`,
  LOT_DISPATCH: (id: number) => `/exim/lots/${id}/dispatch/`,
  LOT_ARRIVE: (id: number) => `/exim/lots/${id}/arrive/`,
  LOT_INTO_TANK: (id: number) => `/exim/lots/${id}/into-tank/`,
  LOT_INSIGHTS: '/exim/lots/insights/',
  LOT_BULK: '/exim/lots/bulk/',
  LOT_CHANGES: '/exim/lots/changes/',
  STOCK_DASHBOARD: '/exim/lots/dashboard/',
  STOCK_DASHBOARD_ORDER: '/exim/lots/dashboard/order/',
  VEHICLE_REPORT: '/exim/lots/vehicle-report/',
  SHORTAGES: '/exim/shortages/',
  CONTRACT_HISTORY: '/exim/contract-history/',
  VENDORS: '/exim/vendors/',
  DIRECTOR_INVENTORY: '/exim/director-inventory/',
} as const;

/** Writes made from a dialog show the server's reason beside the fields. */
const QUIET = { suppressErrorToast: true };

/** Repeated query parameters (?status=A&status=B), as the lot filters take them. */
function lotParams(filters?: LotFilters) {
  const params = new URLSearchParams();
  filters?.status?.forEach((s) => params.append('status', s));
  filters?.vendor?.forEach((v) => params.append('vendor', v));
  filters?.item?.forEach((i) => params.append('item', String(i)));
  return params;
}

export const farmApi = {
  // --- oils ---------------------------------------------------------------
  async listOils(activeOnly = false): Promise<Oil[]> {
    return (
      await apiClient.get<Oil[]>(FARM_ENDPOINTS.OILS, {
        params: activeOnly ? { active: 1 } : undefined,
      })
    ).data;
  },
  async createOil(payload: OilPayload): Promise<Oil> {
    return (await apiClient.post<Oil>(FARM_ENDPOINTS.OILS, payload, QUIET)).data;
  },
  async updateOil(id: number, payload: Partial<OilPayload>): Promise<Oil> {
    return (await apiClient.patch<Oil>(FARM_ENDPOINTS.OIL(id), payload, QUIET)).data;
  },
  async deleteOil(id: number): Promise<void> {
    await apiClient.delete(FARM_ENDPOINTS.OIL(id));
  },
  /** SAP's raw-material oils, the list an oil is picked from. */
  async sapOils(): Promise<SapOilList> {
    return (await apiClient.get<SapOilList>(FARM_ENDPOINTS.SAP_OILS)).data;
  },

  // --- tanks ----------------------------------------------------------------
  async listTanks(): Promise<Tank[]> {
    return (await apiClient.get<Tank[]>(FARM_ENDPOINTS.TANKS)).data;
  },
  async createTank(payload: TankCreatePayload): Promise<Tank> {
    return (await apiClient.post<Tank>(FARM_ENDPOINTS.TANKS, payload, QUIET)).data;
  },
  async updateTank(id: number, payload: TankUpdatePayload): Promise<Tank> {
    return (await apiClient.patch<Tank>(FARM_ENDPOINTS.TANK(id), payload, QUIET)).data;
  },
  async emptyTank(id: number): Promise<Tank> {
    return (await apiClient.post<Tank>(FARM_ENDPOINTS.TANK_EMPTY(id))).data;
  },
  async deleteTank(id: number): Promise<void> {
    await apiClient.delete(FARM_ENDPOINTS.TANK(id));
  },
  async tankSummary(): Promise<TankSummary> {
    return (await apiClient.get<TankSummary>(FARM_ENDPOINTS.TANK_SUMMARY)).data;
  },
  /** Every oil the farm holds, with what its litres cost. */
  async averageCosts(): Promise<AverageCost[]> {
    return (await apiClient.get<AverageCost[]>(FARM_ENDPOINTS.TANK_AVERAGE)).data;
  },
  async averageCost(item: number): Promise<AverageCost> {
    return (await apiClient.get<AverageCost>(FARM_ENDPOINTS.TANK_AVERAGE, { params: { item } }))
      .data;
  },
  async openingStock(payload: OpeningStockPayload): Promise<Lot> {
    return (await apiClient.post<Lot>(FARM_ENDPOINTS.OPENING_STOCK, payload, QUIET)).data;
  },
  async tankLog(): Promise<TankLog[]> {
    return (await apiClient.get<TankLog[]>(FARM_ENDPOINTS.TANK_LOG)).data;
  },

  // --- lots -----------------------------------------------------------------
  async listLots(filters?: LotFilters): Promise<Lot[]> {
    return (await apiClient.get<Lot[]>(FARM_ENDPOINTS.LOTS, { params: lotParams(filters) })).data;
  },
  async lotInsights(filters?: LotFilters): Promise<LotInsights> {
    return (
      await apiClient.get<LotInsights>(FARM_ENDPOINTS.LOT_INSIGHTS, { params: lotParams(filters) })
    ).data;
  },
  async getLot(id: number): Promise<LotDetail> {
    return (await apiClient.get<LotDetail>(FARM_ENDPOINTS.LOT(id))).data;
  },
  async createLot(payload: LotCreatePayload): Promise<LotDetail> {
    return (await apiClient.post<LotDetail>(FARM_ENDPOINTS.LOTS, payload, QUIET)).data;
  },
  async updateLot(id: number, payload: LotFieldsPayload): Promise<LotDetail> {
    return (await apiClient.patch<LotDetail>(FARM_ENDPOINTS.LOT(id), payload, QUIET)).data;
  },
  async deleteLot(id: number): Promise<void> {
    await apiClient.delete(FARM_ENDPOINTS.LOT(id));
  },
  async moveLot(id: number, payload: MovePayload): Promise<LotDetail> {
    return (await apiClient.post<LotDetail>(FARM_ENDPOINTS.LOT_MOVE(id), payload, QUIET)).data;
  },
  /** Returns the NEW lot that left. */
  async dispatchLot(id: number, payload: DispatchPayload): Promise<LotDetail> {
    return (await apiClient.post<LotDetail>(FARM_ENDPOINTS.LOT_DISPATCH(id), payload, QUIET)).data;
  },
  /** Returns the lot at the refinery that collects the arrival. */
  async arriveLot(id: number, payload: ArrivePayload): Promise<LotDetail> {
    return (await apiClient.post<LotDetail>(FARM_ENDPOINTS.LOT_ARRIVE(id), payload, QUIET)).data;
  },
  async intoTank(id: number, payload: IntoTankPayload): Promise<LotDetail> {
    return (await apiClient.post<LotDetail>(FARM_ENDPOINTS.LOT_INTO_TANK(id), payload, QUIET)).data;
  },
  async bulk(action: BulkAction, lots: number[]): Promise<{ action: BulkAction; lots: number }> {
    return (await apiClient.post(FARM_ENDPOINTS.LOT_BULK, { action, lots })).data;
  },
  async lotChanges(params: LotChangeParams): Promise<LotChangePage> {
    return (await apiClient.get<LotChangePage>(FARM_ENDPOINTS.LOT_CHANGES, { params })).data;
  },

  // --- read-outs ------------------------------------------------------------
  async stockDashboard(filters?: {
    item?: number;
    vendor?: string;
    status?: string;
  }): Promise<StockDashboard> {
    return (
      await apiClient.get<StockDashboard>(FARM_ENDPOINTS.STOCK_DASHBOARD, { params: filters })
    ).data;
  },
  async reorderStockDashboard(items: number[]): Promise<void> {
    await apiClient.put(FARM_ENDPOINTS.STOCK_DASHBOARD_ORDER, { items });
  },
  async vehicleReport(status: string): Promise<VehicleReportRow[]> {
    return (
      await apiClient.get<VehicleReportRow[]>(FARM_ENDPOINTS.VEHICLE_REPORT, { params: { status } })
    ).data;
  },
  async shortages(): Promise<ShortageList> {
    return (await apiClient.get<ShortageList>(FARM_ENDPOINTS.SHORTAGES)).data;
  },
  async contractHistory(): Promise<ContractHistoryRow[]> {
    return (await apiClient.get<ContractHistoryRow[]>(FARM_ENDPOINTS.CONTRACT_HISTORY)).data;
  },
  async vendors(): Promise<VendorList> {
    return (await apiClient.get<VendorList>(FARM_ENDPOINTS.VENDORS)).data;
  },
  async createTemporaryVendor(name: string): Promise<Vendor> {
    return (await apiClient.post<Vendor>(FARM_ENDPOINTS.VENDORS, { name }, QUIET)).data;
  },
  async directorInventory(): Promise<DirectorInventory> {
    return (await apiClient.get<DirectorInventory>(FARM_ENDPOINTS.DIRECTOR_INVENTORY)).data;
  },
};
