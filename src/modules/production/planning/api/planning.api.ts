import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BOMResponse,
  ClosePlanResponse,
  CreateDailyEntryRequest,
  CreateMaterialRequest,
  CreatePlanRequest,
  CreateWeeklyPlanRequest,
  DailyEntryResponse,
  DailyProductionEntry,
  ItemDropdown,
  PlanMaterial,
  PlanSummary,
  PostToSAPResponse,
  ProductionPlan,
  ProductionPlanDetail,
  UoMDropdown,
  UpdateDailyEntryRequest,
  UpdatePlanRequest,
  UpdateWeeklyPlanRequest,
  WarehouseDropdown,
  WeeklyPlan,
} from '../types';

const EP = API_ENDPOINTS.PRODUCTION_PLANNING;

export const planningApi = {
  // ---- Dropdowns ----

  async getItems(type?: 'finished' | 'raw', search?: string): Promise<ItemDropdown[]> {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (search) params.search = search;
    const response = await apiClient.get<ItemDropdown[]>(EP.DROPDOWN_ITEMS, { params });
    return response.data;
  },

  async getUoMs(): Promise<UoMDropdown[]> {
    const response = await apiClient.get<UoMDropdown[]>(EP.DROPDOWN_UOM);
    return response.data;
  },

  async getWarehouses(): Promise<WarehouseDropdown[]> {
    const response = await apiClient.get<WarehouseDropdown[]>(EP.DROPDOWN_WAREHOUSES);
    return response.data;
  },

  async getBOM(itemCode: string, plannedQty?: number): Promise<BOMResponse> {
    const params: Record<string, string | number> = { item_code: itemCode };
    if (plannedQty) params.planned_qty = plannedQty;
    const response = await apiClient.get<BOMResponse>(EP.DROPDOWN_BOM, { params });
    return response.data;
  },

  // ---- Plans CRUD ----

  async getPlans(status?: string, month?: string): Promise<ProductionPlan[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (month) params.month = month;
    const response = await apiClient.get<ProductionPlan[]>(EP.LIST, { params });
    return response.data;
  },

  async getPlanDetail(planId: number): Promise<ProductionPlanDetail> {
    const response = await apiClient.get<ProductionPlanDetail>(EP.DETAIL(planId));
    return response.data;
  },

  async createPlan(data: CreatePlanRequest): Promise<ProductionPlanDetail> {
    const response = await apiClient.post<ProductionPlanDetail>(EP.CREATE, data);
    return response.data;
  },

  async updatePlan(planId: number, data: UpdatePlanRequest): Promise<ProductionPlanDetail> {
    const response = await apiClient.patch<ProductionPlanDetail>(EP.DETAIL(planId), data);
    return response.data;
  },

  async deletePlan(planId: number): Promise<void> {
    await apiClient.delete(EP.DETAIL(planId));
  },

  // ---- SAP & Close ----

  async postToSAP(planId: number): Promise<PostToSAPResponse> {
    const response = await apiClient.post<PostToSAPResponse>(EP.POST_TO_SAP(planId));
    return response.data;
  },

  async closePlan(planId: number): Promise<ClosePlanResponse> {
    const response = await apiClient.post<ClosePlanResponse>(EP.CLOSE(planId));
    return response.data;
  },

  // ---- Summary ----

  async getSummary(month?: string): Promise<PlanSummary> {
    const params: Record<string, string> = {};
    if (month) params.month = month;
    const response = await apiClient.get<PlanSummary>(EP.SUMMARY, { params });
    return response.data;
  },

  // ---- Materials ----

  async getMaterials(planId: number): Promise<PlanMaterial[]> {
    const response = await apiClient.get<PlanMaterial[]>(EP.MATERIALS(planId));
    return response.data;
  },

  async addMaterial(planId: number, data: CreateMaterialRequest): Promise<PlanMaterial> {
    const response = await apiClient.post<PlanMaterial>(EP.MATERIALS(planId), data);
    return response.data;
  },

  async deleteMaterial(planId: number, materialId: number): Promise<void> {
    await apiClient.delete(EP.MATERIAL_DELETE(planId, materialId));
  },

  // ---- Weekly Plans ----

  async getWeeklyPlans(planId: number): Promise<WeeklyPlan[]> {
    const response = await apiClient.get<WeeklyPlan[]>(EP.WEEKLY_PLANS(planId));
    return response.data;
  },

  async createWeeklyPlan(planId: number, data: CreateWeeklyPlanRequest): Promise<WeeklyPlan> {
    const response = await apiClient.post<WeeklyPlan>(EP.WEEKLY_PLANS(planId), data);
    return response.data;
  },

  async updateWeeklyPlan(
    planId: number,
    weekId: number,
    data: UpdateWeeklyPlanRequest,
  ): Promise<WeeklyPlan> {
    const response = await apiClient.patch<WeeklyPlan>(
      EP.WEEKLY_PLAN_DETAIL(planId, weekId),
      data,
    );
    return response.data;
  },

  async deleteWeeklyPlan(planId: number, weekId: number): Promise<void> {
    await apiClient.delete(EP.WEEKLY_PLAN_DETAIL(planId, weekId));
  },

  // ---- Daily Entries ----

  async getDailyEntries(weekId: number): Promise<DailyProductionEntry[]> {
    const response = await apiClient.get<DailyProductionEntry[]>(EP.DAILY_ENTRIES(weekId));
    return response.data;
  },

  async createDailyEntry(
    weekId: number,
    data: CreateDailyEntryRequest,
  ): Promise<DailyEntryResponse> {
    const response = await apiClient.post<DailyEntryResponse>(EP.DAILY_ENTRIES(weekId), data);
    return response.data;
  },

  async updateDailyEntry(
    weekId: number,
    entryId: number,
    data: UpdateDailyEntryRequest,
  ): Promise<DailyProductionEntry> {
    const response = await apiClient.patch<DailyProductionEntry>(
      EP.DAILY_ENTRY_DETAIL(weekId, entryId),
      data,
    );
    return response.data;
  },

  async getAllDailyEntries(
    planId?: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<DailyProductionEntry[]> {
    const params: Record<string, string | number> = {};
    if (planId) params.plan_id = planId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const response = await apiClient.get<DailyProductionEntry[]>(EP.DAILY_ENTRIES_ALL, { params });
    return response.data;
  },
};
