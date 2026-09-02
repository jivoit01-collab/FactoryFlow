import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AddBreakdownRequest,
  AddManualBreakdownRequest,
  AddManualSegmentRequest,
  BlowingAuditLog,
  BlowingBreakdown,
  BlowingBreakdownCategory,
  BlowingMachine,
  BlowingRateConfig,
  BlowingRun,
  BlowingRunCost,
  BlowingRunDetail,
  BlowingSegment,
  BottleBuyPrice,
  CompleteRunRequest,
  CreateBreakdownCategoryRequest,
  CreateBuyPriceRequest,
  CreateMachineRequest,
  CreatePreformSpecRequest,
  CreateRateConfigRequest,
  CreateRunRequest,
  DailyReport,
  MakeVsBuyReport,
  MonthlyReport,
  PreformSpec,
  ResolveBreakdownRequest,
  RunListParams,
  SAPItem,
  StopProductionRequest,
  UpdateRunRequest,
  UpdateSegmentRequest,
  VarianceReport,
} from '../types';

const EP = API_ENDPOINTS.PRODUCTION_BLOWING;

export const blowingApi = {
  // ---- Machines ----
  async getMachines(isActive?: boolean): Promise<BlowingMachine[]> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await apiClient.get<BlowingMachine[]>(EP.MACHINES, { params });
    return res.data;
  },
  async createMachine(data: CreateMachineRequest): Promise<BlowingMachine> {
    const res = await apiClient.post<BlowingMachine>(EP.MACHINES, data);
    return res.data;
  },
  async updateMachine(id: number, data: Partial<CreateMachineRequest> & { is_active?: boolean }): Promise<BlowingMachine> {
    const res = await apiClient.patch<BlowingMachine>(EP.MACHINE_DETAIL(id), data);
    return res.data;
  },
  async deleteMachine(id: number): Promise<void> {
    await apiClient.delete(EP.MACHINE_DETAIL(id));
  },

  // ---- Preform specs ----
  async getPreformSpecs(isActive?: boolean): Promise<PreformSpec[]> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await apiClient.get<PreformSpec[]>(EP.PREFORM_SPECS, { params });
    return res.data;
  },
  async createPreformSpec(data: CreatePreformSpecRequest): Promise<PreformSpec> {
    const res = await apiClient.post<PreformSpec>(EP.PREFORM_SPECS, data);
    return res.data;
  },
  async updatePreformSpec(id: number, data: Partial<CreatePreformSpecRequest> & { is_active?: boolean }): Promise<PreformSpec> {
    const res = await apiClient.patch<PreformSpec>(EP.PREFORM_SPEC_DETAIL(id), data);
    return res.data;
  },
  async deletePreformSpec(id: number): Promise<void> {
    await apiClient.delete(EP.PREFORM_SPEC_DETAIL(id));
  },

  // ---- Rate configs ----
  async getRateConfigs(isActive?: boolean): Promise<BlowingRateConfig[]> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await apiClient.get<BlowingRateConfig[]>(EP.RATE_CONFIGS, { params });
    return res.data;
  },
  async createRateConfig(data: CreateRateConfigRequest): Promise<BlowingRateConfig> {
    const res = await apiClient.post<BlowingRateConfig>(EP.RATE_CONFIGS, data);
    return res.data;
  },
  async updateRateConfig(id: number, data: Partial<CreateRateConfigRequest> & { is_active?: boolean }): Promise<BlowingRateConfig> {
    const res = await apiClient.patch<BlowingRateConfig>(EP.RATE_CONFIG_DETAIL(id), data);
    return res.data;
  },

  // Cost rates are managed on the admin Cost Master page (/admin/cost-master).

  // ---- Runs ----
  async getRuns(params?: RunListParams): Promise<BlowingRun[]> {
    const res = await apiClient.get<BlowingRun[]>(EP.RUNS, { params });
    return res.data;
  },
  async getRun(id: number): Promise<BlowingRunDetail> {
    const res = await apiClient.get<BlowingRunDetail>(EP.RUN_DETAIL(id));
    return res.data;
  },
  async createRun(data: CreateRunRequest): Promise<BlowingRunDetail> {
    const res = await apiClient.post<BlowingRunDetail>(EP.RUNS, data);
    return res.data;
  },
  async updateRun(id: number, data: UpdateRunRequest): Promise<BlowingRunDetail> {
    const res = await apiClient.patch<BlowingRunDetail>(EP.RUN_DETAIL(id), data);
    return res.data;
  },
  async completeRun(id: number, data: CompleteRunRequest): Promise<BlowingRunDetail> {
    const res = await apiClient.post<BlowingRunDetail>(EP.RUN_COMPLETE(id), data);
    return res.data;
  },
  async getRunCost(id: number): Promise<BlowingRunCost> {
    const res = await apiClient.get<BlowingRunCost>(EP.RUN_COST(id));
    return res.data;
  },

  // ---- Lifecycle ----
  async startProduction(runId: number): Promise<BlowingSegment> {
    const res = await apiClient.post<BlowingSegment>(EP.START_PRODUCTION(runId));
    return res.data;
  },
  async stopProduction(runId: number, data: StopProductionRequest): Promise<BlowingSegment> {
    const res = await apiClient.post<BlowingSegment>(EP.STOP_PRODUCTION(runId), data);
    return res.data;
  },
  async addBreakdown(runId: number, data: AddBreakdownRequest): Promise<BlowingBreakdown> {
    const res = await apiClient.post<BlowingBreakdown>(EP.ADD_BREAKDOWN(runId), data);
    return res.data;
  },
  async addManualSegment(runId: number, data: AddManualSegmentRequest): Promise<BlowingSegment> {
    const res = await apiClient.post<BlowingSegment>(EP.ADD_MANUAL_SEGMENT(runId), data);
    return res.data;
  },
  async addManualBreakdown(runId: number, data: AddManualBreakdownRequest): Promise<BlowingBreakdown> {
    const res = await apiClient.post<BlowingBreakdown>(EP.ADD_MANUAL_BREAKDOWN(runId), data);
    return res.data;
  },
  async resolveBreakdown(runId: number, breakdownId: number, data: ResolveBreakdownRequest): Promise<BlowingBreakdown> {
    const res = await apiClient.post<BlowingBreakdown>(EP.RESOLVE_BREAKDOWN(runId, breakdownId), data);
    return res.data;
  },
  async updateSegment(runId: number, segmentId: number, data: UpdateSegmentRequest): Promise<BlowingSegment> {
    const res = await apiClient.patch<BlowingSegment>(EP.SEGMENT_UPDATE(runId, segmentId), data);
    return res.data;
  },

  // ---- Breakdown categories ----
  async getBreakdownCategories(isActive?: boolean): Promise<BlowingBreakdownCategory[]> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await apiClient.get<BlowingBreakdownCategory[]>(EP.BREAKDOWN_CATEGORIES, { params });
    return res.data;
  },
  async createBreakdownCategory(data: CreateBreakdownCategoryRequest): Promise<BlowingBreakdownCategory> {
    const res = await apiClient.post<BlowingBreakdownCategory>(EP.BREAKDOWN_CATEGORIES, data);
    return res.data;
  },

  // ---- Preform request — raised into the Warehouse BOM-request queue ----
  async submitPreformRequest(runId: number, remarks?: string): Promise<BlowingRunDetail> {
    const res = await apiClient.post<BlowingRunDetail>(EP.SUBMIT_PREFORM_REQUEST(runId), { remarks });
    return res.data;
  },

  // ---- Buy prices (Phase 2) ----
  async getBuyPrices(isActive?: boolean, preformSpecId?: number): Promise<BottleBuyPrice[]> {
    const params: Record<string, string | number> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    if (preformSpecId) params.preform_spec_id = preformSpecId;
    const res = await apiClient.get<BottleBuyPrice[]>(EP.BUY_PRICES, { params });
    return res.data;
  },
  async createBuyPrice(data: CreateBuyPriceRequest): Promise<BottleBuyPrice> {
    const res = await apiClient.post<BottleBuyPrice>(EP.BUY_PRICES, data);
    return res.data;
  },
  async updateBuyPrice(id: number, data: Partial<CreateBuyPriceRequest> & { is_active?: boolean }): Promise<BottleBuyPrice> {
    const res = await apiClient.patch<BottleBuyPrice>(EP.BUY_PRICE_DETAIL(id), data);
    return res.data;
  },

  // ---- Reports ----
  async getDailyReport(date: string): Promise<DailyReport> {
    const res = await apiClient.get<DailyReport>(EP.REPORT_DAILY, { params: { date } });
    return res.data;
  },
  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const res = await apiClient.get<MonthlyReport>(EP.REPORT_MONTHLY, { params: { year, month } });
    return res.data;
  },
  async getMakeVsBuy(dateFrom: string, dateTo: string, preformSpecId?: number): Promise<MakeVsBuyReport> {
    const params: Record<string, string | number> = { date_from: dateFrom, date_to: dateTo };
    if (preformSpecId) params.preform_spec_id = preformSpecId;
    const res = await apiClient.get<MakeVsBuyReport>(EP.REPORT_MAKE_VS_BUY, { params });
    return res.data;
  },
  async getVariances(dateFrom: string, dateTo: string): Promise<VarianceReport> {
    const res = await apiClient.get<VarianceReport>(EP.REPORT_VARIANCES, {
      params: { date_from: dateFrom, date_to: dateTo },
    });
    return res.data;
  },

  // ---- Audit log ----
  async getAuditLogs(entityType: string, entityId: number): Promise<BlowingAuditLog[]> {
    const res = await apiClient.get<BlowingAuditLog[]>(EP.AUDIT, {
      params: { entity_type: entityType, entity_id: entityId },
    });
    return res.data;
  },

  // ---- SAP item pickers (read-only) ----
  async searchSAPItems(kind: 'preform' | 'bottle', search: string): Promise<SAPItem[]> {
    const res = await apiClient.get<SAPItem[]>(EP.SAP_ITEMS, { params: { kind, search } });
    return res.data;
  },
};
