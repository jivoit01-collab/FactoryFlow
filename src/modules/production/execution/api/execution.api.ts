import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AddBreakdownRequest,
  AnalyticsParams,
  ApproveClearanceRequest,
  BreakdownCategory,
  BulkChecklistRequest,
  ChecklistTemplate,
  CompleteRunRequest,
  CreateBreakdownCategoryRequest,
  CreateChecklistEntryRequest,
  CreateCompressedAirRequest,
  CreateElectricityRequest,
  CreateGasRequest,
  CreateLabourRequest,
  CreateLineClearanceRequest,
  CreateMachineCostRequest,
  CreateMachineRequest,
  CreateManpowerRequest,
  CreateMaterialUsageRequest,
  CreateLineRequest,
  CreateOverheadRequest,
  CreateRunRequest,
  CreateRuntimeRequest,
  CreateTemplateRequest,
  CreateWasteLogRequest,
  CreateWaterRequest,
  CreateInProcessQCRequest,
  CreateFinalQCRequest,
  DailyProductionReport,
  DowntimeAnalytics,
  FinalQCCheck,
  InProcessQCCheck,
  LineClearance,
  LineClearanceDetail,
  Machine,
  MachineBreakdown,
  MachineChecklistEntry,
  MachineRuntime,
  Manpower,
  MaterialUsage,
  OEEAnalytics,
  ProductionLine,
  ProductionRun,
  ProductionRunCost,
  ProductionRunDetail,
  ProductionSegment,
  ResolveBreakdownRequest,
  StopProductionRequest,
  UpdateBreakdownRemarksRequest,
  UpdateSegmentRequest,
  ResourceCompressedAir,
  ResourceElectricity,
  ResourceGas,
  ResourceLabour,
  ResourceMachineCost,
  ResourceOverhead,
  ResourceWater,
  SAPBOMResponse,
  SAPItem,
  SAPOrderDetail,
  SAPProductionOrder,
  UpdateLineClearanceRequest,
  UpdateRunRequest,
  WasteAnalytics,
  WasteApprovalRequest,
  WasteLog,
  YieldReport,
  ResourceConsumptionReport,
  MonthlySummaryReport,
  PlanVsProductionReport,
  ProcurementVsPlannedReport,
  OEETrendReport,
  DowntimeParetoReport,
  CostAnalysisReport,
  WasteTrendReport,
} from '../types';

const EP = API_ENDPOINTS.PRODUCTION_EXECUTION;

export const executionApi = {
  // =========================================================================
  // Master Data — Lines
  // =========================================================================

  async getLines(isActive?: boolean): Promise<ProductionLine[]> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await apiClient.get<ProductionLine[]>(EP.LINES, { params });
    return res.data;
  },

  async createLine(data: CreateLineRequest): Promise<ProductionLine> {
    const res = await apiClient.post<ProductionLine>(EP.LINES, data);
    return res.data;
  },

  async updateLine(lineId: number, data: Partial<CreateLineRequest>): Promise<ProductionLine> {
    const res = await apiClient.patch<ProductionLine>(EP.LINE_DETAIL(lineId), data);
    return res.data;
  },

  async deleteLine(lineId: number): Promise<void> {
    await apiClient.delete(EP.LINE_DETAIL(lineId));
  },

  // =========================================================================
  // Master Data — Machines
  // =========================================================================

  async getMachines(lineId?: number, machineType?: string): Promise<Machine[]> {
    const params: Record<string, string | number> = {};
    if (lineId) params.line_id = lineId;
    if (machineType) params.machine_type = machineType;
    const res = await apiClient.get<Machine[]>(EP.MACHINES, { params });
    return res.data;
  },

  async createMachine(data: CreateMachineRequest): Promise<Machine> {
    const res = await apiClient.post<Machine>(EP.MACHINES, data);
    return res.data;
  },

  async updateMachine(machineId: number, data: Partial<CreateMachineRequest>): Promise<Machine> {
    const res = await apiClient.patch<Machine>(EP.MACHINE_DETAIL(machineId), data);
    return res.data;
  },

  async deleteMachine(machineId: number): Promise<void> {
    await apiClient.delete(EP.MACHINE_DETAIL(machineId));
  },

  // =========================================================================
  // Master Data — Checklist Templates
  // =========================================================================

  async getChecklistTemplates(machineType?: string): Promise<ChecklistTemplate[]> {
    const params: Record<string, string> = {};
    if (machineType) params.machine_type = machineType;
    const res = await apiClient.get<ChecklistTemplate[]>(EP.CHECKLIST_TEMPLATES, { params });
    return res.data;
  },

  async createChecklistTemplate(data: CreateTemplateRequest): Promise<ChecklistTemplate> {
    const res = await apiClient.post<ChecklistTemplate>(EP.CHECKLIST_TEMPLATES, data);
    return res.data;
  },

  async updateChecklistTemplate(
    templateId: number,
    data: Partial<CreateTemplateRequest>,
  ): Promise<ChecklistTemplate> {
    const res = await apiClient.patch<ChecklistTemplate>(
      EP.CHECKLIST_TEMPLATE_DETAIL(templateId),
      data,
    );
    return res.data;
  },

  async deleteChecklistTemplate(templateId: number): Promise<void> {
    await apiClient.delete(EP.CHECKLIST_TEMPLATE_DETAIL(templateId));
  },

  // =========================================================================
  // SAP Orders
  // =========================================================================

  async getSAPOrders(): Promise<SAPProductionOrder[]> {
    const res = await apiClient.get<SAPProductionOrder[]>(EP.SAP_ORDERS);
    return res.data;
  },

  async getSAPOrderDetail(docEntry: number): Promise<SAPOrderDetail> {
    const res = await apiClient.get<SAPOrderDetail>(EP.SAP_ORDER_DETAIL(docEntry));
    return res.data;
  },

  async searchSAPItems(search: string): Promise<SAPItem[]> {
    const res = await apiClient.get<SAPItem[]>(EP.SAP_ITEMS, { params: { search } });
    return res.data;
  },

  async getBOM(itemCode: string): Promise<SAPBOMResponse> {
    const res = await apiClient.get<SAPBOMResponse>(EP.SAP_BOM, {
      params: { item_code: itemCode },
    });
    return res.data;
  },

  // =========================================================================
  // Production Runs
  // =========================================================================

  async getRuns(filters?: {
    status?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    line_id?: number;
    search?: string;
  }): Promise<ProductionRun[]> {
    const params: Record<string, string | number> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.date) params.date = filters.date;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;
    if (filters?.line_id) params.line_id = filters.line_id;
    if (filters?.search) params.search = filters.search;
    const res = await apiClient.get<ProductionRun[]>(EP.RUNS, { params });
    return res.data;
  },

  async getRunDetail(runId: number): Promise<ProductionRunDetail> {
    const res = await apiClient.get<ProductionRunDetail>(EP.RUN_DETAIL(runId));
    return res.data;
  },

  async createRun(data: CreateRunRequest): Promise<ProductionRun> {
    const res = await apiClient.post<ProductionRun>(EP.RUNS, data);
    return res.data;
  },

  async updateRun(runId: number, data: UpdateRunRequest): Promise<ProductionRun> {
    const res = await apiClient.patch<ProductionRun>(EP.RUN_DETAIL(runId), data);
    return res.data;
  },

  async deleteRun(runId: number): Promise<void> {
    await apiClient.delete(EP.RUN_DELETE(runId));
  },

  async completeRun(runId: number, data: CompleteRunRequest): Promise<ProductionRunDetail> {
    const res = await apiClient.post<ProductionRunDetail>(EP.RUN_COMPLETE(runId), data);
    return res.data;
  },

  // =========================================================================
  // Breakdown Categories
  // =========================================================================

  async getBreakdownCategories(): Promise<BreakdownCategory[]> {
    const res = await apiClient.get<BreakdownCategory[]>(EP.BREAKDOWN_CATEGORIES);
    return res.data;
  },

  async createBreakdownCategory(data: CreateBreakdownCategoryRequest): Promise<BreakdownCategory> {
    const res = await apiClient.post<BreakdownCategory>(EP.BREAKDOWN_CATEGORIES, data);
    return res.data;
  },

  async updateBreakdownCategory(
    categoryId: number,
    data: Partial<CreateBreakdownCategoryRequest & { is_active: boolean }>,
  ): Promise<BreakdownCategory> {
    const res = await apiClient.patch<BreakdownCategory>(
      EP.BREAKDOWN_CATEGORY_DETAIL(categoryId),
      data,
    );
    return res.data;
  },

  async deleteBreakdownCategory(categoryId: number): Promise<void> {
    await apiClient.delete(EP.BREAKDOWN_CATEGORY_DETAIL(categoryId));
  },

  // =========================================================================
  // Timeline Actions
  // =========================================================================

  async startProduction(runId: number): Promise<ProductionSegment> {
    const res = await apiClient.post<ProductionSegment>(EP.START_PRODUCTION(runId));
    return res.data;
  },

  async stopProduction(runId: number, data: StopProductionRequest): Promise<ProductionSegment> {
    const res = await apiClient.post<ProductionSegment>(EP.STOP_PRODUCTION(runId), data);
    return res.data;
  },

  async addBreakdown(runId: number, data: AddBreakdownRequest): Promise<MachineBreakdown> {
    const res = await apiClient.post<MachineBreakdown>(EP.ADD_BREAKDOWN(runId), data);
    return res.data;
  },

  async resolveBreakdown(
    runId: number,
    breakdownId: number,
    data: ResolveBreakdownRequest,
  ): Promise<MachineBreakdown> {
    const res = await apiClient.post<MachineBreakdown>(
      EP.RESOLVE_BREAKDOWN(runId, breakdownId),
      data,
    );
    return res.data;
  },

  // =========================================================================
  // Breakdowns (read/delete)
  // =========================================================================

  async updateSegment(
    runId: number,
    segmentId: number,
    data: UpdateSegmentRequest,
  ): Promise<ProductionSegment> {
    const res = await apiClient.patch<ProductionSegment>(EP.SEGMENT_UPDATE(runId, segmentId), data);
    return res.data;
  },

  async updateBreakdownRemarks(
    runId: number,
    breakdownId: number,
    data: UpdateBreakdownRemarksRequest,
  ): Promise<MachineBreakdown> {
    const res = await apiClient.patch<MachineBreakdown>(EP.BREAKDOWN_UPDATE(runId, breakdownId), data);
    return res.data;
  },

  async getBreakdowns(runId: number): Promise<MachineBreakdown[]> {
    const res = await apiClient.get<MachineBreakdown[]>(EP.RUN_BREAKDOWNS(runId));
    return res.data;
  },

  async deleteBreakdown(runId: number, breakdownId: number): Promise<void> {
    await apiClient.delete(EP.RUN_BREAKDOWN_DETAIL(runId, breakdownId));
  },

  // =========================================================================
  // Materials
  // =========================================================================

  async getMaterials(runId: number): Promise<MaterialUsage[]> {
    const res = await apiClient.get<MaterialUsage[]>(EP.RUN_MATERIALS(runId));
    return res.data;
  },

  async createMaterial(runId: number, data: CreateMaterialUsageRequest): Promise<MaterialUsage> {
    const res = await apiClient.post<MaterialUsage>(EP.RUN_MATERIALS(runId), data);
    return res.data;
  },

  async updateMaterial(
    runId: number,
    materialId: number,
    data: Partial<CreateMaterialUsageRequest>,
  ): Promise<MaterialUsage> {
    const res = await apiClient.patch<MaterialUsage>(
      EP.RUN_MATERIAL_DETAIL(runId, materialId),
      data,
    );
    return res.data;
  },

  async deleteMaterial(runId: number, materialId: number): Promise<void> {
    await apiClient.delete(EP.RUN_MATERIAL_DETAIL(runId, materialId));
  },

  // =========================================================================
  // Machine Runtime
  // =========================================================================

  async getMachineRuntime(runId: number): Promise<MachineRuntime[]> {
    const res = await apiClient.get<MachineRuntime[]>(EP.RUN_MACHINE_RUNTIME(runId));
    return res.data;
  },

  async createMachineRuntime(runId: number, data: CreateRuntimeRequest): Promise<MachineRuntime> {
    const res = await apiClient.post<MachineRuntime>(EP.RUN_MACHINE_RUNTIME(runId), data);
    return res.data;
  },

  async updateMachineRuntime(
    runId: number,
    runtimeId: number,
    data: Partial<CreateRuntimeRequest>,
  ): Promise<MachineRuntime> {
    const res = await apiClient.patch<MachineRuntime>(
      EP.RUN_MACHINE_RUNTIME_DETAIL(runId, runtimeId),
      data,
    );
    return res.data;
  },

  async deleteMachineRuntime(runId: number, runtimeId: number): Promise<void> {
    await apiClient.delete(EP.RUN_MACHINE_RUNTIME_DETAIL(runId, runtimeId));
  },

  // =========================================================================
  // Manpower
  // =========================================================================

  async getManpower(runId: number): Promise<Manpower[]> {
    const res = await apiClient.get<Manpower[]>(EP.RUN_MANPOWER(runId));
    return res.data;
  },

  async createManpower(runId: number, data: CreateManpowerRequest): Promise<Manpower> {
    const res = await apiClient.post<Manpower>(EP.RUN_MANPOWER(runId), data);
    return res.data;
  },

  async updateManpower(
    runId: number,
    manpowerId: number,
    data: Partial<CreateManpowerRequest>,
  ): Promise<Manpower> {
    const res = await apiClient.patch<Manpower>(
      EP.RUN_MANPOWER_DETAIL(runId, manpowerId),
      data,
    );
    return res.data;
  },

  async deleteManpower(runId: number, manpowerId: number): Promise<void> {
    await apiClient.delete(EP.RUN_MANPOWER_DETAIL(runId, manpowerId));
  },

  // =========================================================================
  // Line Clearance
  // =========================================================================

  async getLineClearances(lineId?: number, status?: string): Promise<LineClearance[]> {
    const params: Record<string, string | number> = {};
    if (lineId) params.line_id = lineId;
    if (status) params.status = status;
    const res = await apiClient.get<LineClearance[]>(EP.LINE_CLEARANCE, { params });
    return res.data;
  },

  async getLineClearanceDetail(clearanceId: number): Promise<LineClearanceDetail> {
    const res = await apiClient.get<LineClearanceDetail>(EP.LINE_CLEARANCE_DETAIL(clearanceId));
    return res.data;
  },

  async createLineClearance(data: CreateLineClearanceRequest): Promise<LineClearanceDetail> {
    const res = await apiClient.post<LineClearanceDetail>(EP.LINE_CLEARANCE, data);
    return res.data;
  },

  async updateLineClearance(
    clearanceId: number,
    data: UpdateLineClearanceRequest,
  ): Promise<LineClearanceDetail> {
    const res = await apiClient.patch<LineClearanceDetail>(
      EP.LINE_CLEARANCE_DETAIL(clearanceId),
      data,
    );
    return res.data;
  },

  async submitLineClearance(clearanceId: number): Promise<LineClearanceDetail> {
    const res = await apiClient.post<LineClearanceDetail>(EP.LINE_CLEARANCE_SUBMIT(clearanceId));
    return res.data;
  },

  async approveLineClearance(
    clearanceId: number,
    data: ApproveClearanceRequest,
  ): Promise<LineClearanceDetail> {
    const res = await apiClient.post<LineClearanceDetail>(
      EP.LINE_CLEARANCE_APPROVE(clearanceId),
      data,
    );
    return res.data;
  },

  // =========================================================================
  // Machine Checklists
  // =========================================================================

  async getMachineChecklists(
    machineId?: number,
    date?: string,
    month?: number,
    year?: number,
  ): Promise<MachineChecklistEntry[]> {
    const params: Record<string, string | number> = {};
    if (machineId) params.machine_id = machineId;
    if (date) params.date = date;
    if (month) params.month = month;
    if (year) params.year = year;
    const res = await apiClient.get<MachineChecklistEntry[]>(EP.MACHINE_CHECKLISTS, { params });
    return res.data;
  },

  async createChecklistEntry(data: CreateChecklistEntryRequest): Promise<MachineChecklistEntry> {
    const res = await apiClient.post<MachineChecklistEntry>(EP.MACHINE_CHECKLISTS, data);
    return res.data;
  },

  async bulkCreateChecklists(data: BulkChecklistRequest): Promise<MachineChecklistEntry[]> {
    const res = await apiClient.post<MachineChecklistEntry[]>(EP.MACHINE_CHECKLISTS_BULK, data.entries);
    return res.data;
  },

  async updateChecklistEntry(
    entryId: number,
    data: Partial<CreateChecklistEntryRequest>,
  ): Promise<MachineChecklistEntry> {
    const res = await apiClient.patch<MachineChecklistEntry>(
      EP.MACHINE_CHECKLIST_DETAIL(entryId),
      data,
    );
    return res.data;
  },

  // =========================================================================
  // Waste Management
  // =========================================================================

  async getWasteLogs(runId?: number): Promise<WasteLog[]> {
    const params: Record<string, number> = {};
    if (runId) params.run_id = runId;
    const res = await apiClient.get<WasteLog[]>(EP.WASTE, { params });
    return res.data;
  },

  async getWasteLogDetail(wasteId: number): Promise<WasteLog> {
    const res = await apiClient.get<WasteLog>(EP.WASTE_DETAIL(wasteId));
    return res.data;
  },

  async createWasteLog(data: CreateWasteLogRequest): Promise<WasteLog> {
    const res = await apiClient.post<WasteLog>(EP.WASTE, data);
    return res.data;
  },

  async updateWasteLog(wasteId: number, data: Partial<CreateWasteLogRequest>): Promise<WasteLog> {
    const res = await apiClient.patch<WasteLog>(EP.WASTE_DETAIL(wasteId), data);
    return res.data;
  },

  async deleteWasteLog(wasteId: number): Promise<void> {
    await apiClient.delete(EP.WASTE_DETAIL(wasteId));
  },

  async approveWasteEngineer(wasteId: number, data: WasteApprovalRequest): Promise<WasteLog> {
    const res = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_ENGINEER(wasteId), data);
    return res.data;
  },

  async approveWasteAM(wasteId: number, data: WasteApprovalRequest): Promise<WasteLog> {
    const res = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_AM(wasteId), data);
    return res.data;
  },

  async approveWasteStore(wasteId: number, data: WasteApprovalRequest): Promise<WasteLog> {
    const res = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_STORE(wasteId), data);
    return res.data;
  },

  async approveWasteHOD(wasteId: number, data: WasteApprovalRequest): Promise<WasteLog> {
    const res = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_HOD(wasteId), data);
    return res.data;
  },

  // =========================================================================
  // Resources
  // =========================================================================

  // Electricity
  async getElectricity(runId: number): Promise<ResourceElectricity[]> {
    const res = await apiClient.get<ResourceElectricity[]>(EP.RUN_ELECTRICITY(runId));
    return res.data;
  },
  async createElectricity(
    runId: number,
    data: CreateElectricityRequest,
  ): Promise<ResourceElectricity> {
    const res = await apiClient.post<ResourceElectricity>(EP.RUN_ELECTRICITY(runId), data);
    return res.data;
  },
  async updateElectricity(
    runId: number,
    entryId: number,
    data: Partial<CreateElectricityRequest>,
  ): Promise<ResourceElectricity> {
    const res = await apiClient.patch<ResourceElectricity>(
      EP.RUN_ELECTRICITY_DETAIL(runId, entryId),
      data,
    );
    return res.data;
  },
  async deleteElectricity(runId: number, entryId: number): Promise<void> {
    await apiClient.delete(EP.RUN_ELECTRICITY_DETAIL(runId, entryId));
  },

  // Water
  async getWater(runId: number): Promise<ResourceWater[]> {
    const res = await apiClient.get<ResourceWater[]>(EP.RUN_WATER(runId));
    return res.data;
  },
  async createWater(runId: number, data: CreateWaterRequest): Promise<ResourceWater> {
    const res = await apiClient.post<ResourceWater>(EP.RUN_WATER(runId), data);
    return res.data;
  },
  async updateWater(
    runId: number,
    entryId: number,
    data: Partial<CreateWaterRequest>,
  ): Promise<ResourceWater> {
    const res = await apiClient.patch<ResourceWater>(EP.RUN_WATER_DETAIL(runId, entryId), data);
    return res.data;
  },
  async deleteWater(runId: number, entryId: number): Promise<void> {
    await apiClient.delete(EP.RUN_WATER_DETAIL(runId, entryId));
  },

  // Gas
  async getGas(runId: number): Promise<ResourceGas[]> {
    const res = await apiClient.get<ResourceGas[]>(EP.RUN_GAS(runId));
    return res.data;
  },
  async createGas(runId: number, data: CreateGasRequest): Promise<ResourceGas> {
    const res = await apiClient.post<ResourceGas>(EP.RUN_GAS(runId), data);
    return res.data;
  },
  async updateGas(
    runId: number,
    entryId: number,
    data: Partial<CreateGasRequest>,
  ): Promise<ResourceGas> {
    const res = await apiClient.patch<ResourceGas>(EP.RUN_GAS_DETAIL(runId, entryId), data);
    return res.data;
  },
  async deleteGas(runId: number, entryId: number): Promise<void> {
    await apiClient.delete(EP.RUN_GAS_DETAIL(runId, entryId));
  },

  // Compressed Air
  async getCompressedAir(runId: number): Promise<ResourceCompressedAir[]> {
    const res = await apiClient.get<ResourceCompressedAir[]>(EP.RUN_COMPRESSED_AIR(runId));
    return res.data;
  },
  async createCompressedAir(
    runId: number,
    data: CreateCompressedAirRequest,
  ): Promise<ResourceCompressedAir> {
    const res = await apiClient.post<ResourceCompressedAir>(EP.RUN_COMPRESSED_AIR(runId), data);
    return res.data;
  },
  async updateCompressedAir(
    runId: number,
    entryId: number,
    data: Partial<CreateCompressedAirRequest>,
  ): Promise<ResourceCompressedAir> {
    const res = await apiClient.patch<ResourceCompressedAir>(
      EP.RUN_COMPRESSED_AIR_DETAIL(runId, entryId),
      data,
    );
    return res.data;
  },
  async deleteCompressedAir(runId: number, entryId: number): Promise<void> {
    await apiClient.delete(EP.RUN_COMPRESSED_AIR_DETAIL(runId, entryId));
  },

  // Labour
  async getLabour(runId: number): Promise<ResourceLabour[]> {
    const res = await apiClient.get<ResourceLabour[]>(EP.RUN_LABOUR(runId));
    return res.data;
  },
  async createLabour(runId: number, data: CreateLabourRequest): Promise<ResourceLabour> {
    const res = await apiClient.post<ResourceLabour>(EP.RUN_LABOUR(runId), data);
    return res.data;
  },
  async updateLabour(
    runId: number,
    entryId: number,
    data: Partial<CreateLabourRequest>,
  ): Promise<ResourceLabour> {
    const res = await apiClient.patch<ResourceLabour>(
      EP.RUN_LABOUR_DETAIL(runId, entryId),
      data,
    );
    return res.data;
  },
  async deleteLabour(runId: number, entryId: number): Promise<void> {
    await apiClient.delete(EP.RUN_LABOUR_DETAIL(runId, entryId));
  },

  // Machine Costs
  async getMachineCosts(runId: number): Promise<ResourceMachineCost[]> {
    const res = await apiClient.get<ResourceMachineCost[]>(EP.RUN_MACHINE_COSTS(runId));
    return res.data;
  },
  async createMachineCost(
    runId: number,
    data: CreateMachineCostRequest,
  ): Promise<ResourceMachineCost> {
    const res = await apiClient.post<ResourceMachineCost>(EP.RUN_MACHINE_COSTS(runId), data);
    return res.data;
  },
  async updateMachineCost(
    runId: number,
    entryId: number,
    data: Partial<CreateMachineCostRequest>,
  ): Promise<ResourceMachineCost> {
    const res = await apiClient.patch<ResourceMachineCost>(
      EP.RUN_MACHINE_COSTS_DETAIL(runId, entryId),
      data,
    );
    return res.data;
  },
  async deleteMachineCost(runId: number, entryId: number): Promise<void> {
    await apiClient.delete(EP.RUN_MACHINE_COSTS_DETAIL(runId, entryId));
  },

  // Overhead
  async getOverhead(runId: number): Promise<ResourceOverhead[]> {
    const res = await apiClient.get<ResourceOverhead[]>(EP.RUN_OVERHEAD(runId));
    return res.data;
  },
  async createOverhead(runId: number, data: CreateOverheadRequest): Promise<ResourceOverhead> {
    const res = await apiClient.post<ResourceOverhead>(EP.RUN_OVERHEAD(runId), data);
    return res.data;
  },
  async updateOverhead(
    runId: number,
    entryId: number,
    data: Partial<CreateOverheadRequest>,
  ): Promise<ResourceOverhead> {
    const res = await apiClient.patch<ResourceOverhead>(
      EP.RUN_OVERHEAD_DETAIL(runId, entryId),
      data,
    );
    return res.data;
  },
  async deleteOverhead(runId: number, entryId: number): Promise<void> {
    await apiClient.delete(EP.RUN_OVERHEAD_DETAIL(runId, entryId));
  },

  // =========================================================================
  // Cost
  // =========================================================================

  async getRunCost(runId: number): Promise<ProductionRunCost> {
    const res = await apiClient.get<ProductionRunCost>(EP.RUN_COST(runId));
    return res.data;
  },

  async getCostAnalytics(params?: AnalyticsParams): Promise<ProductionRunCost[]> {
    const res = await apiClient.get<ProductionRunCost[]>(EP.COST_ANALYTICS, { params });
    return res.data;
  },

  // =========================================================================
  // QC
  // =========================================================================

  async getInProcessQC(runId: number): Promise<InProcessQCCheck[]> {
    const res = await apiClient.get<InProcessQCCheck[]>(EP.RUN_QC_INPROCESS(runId));
    return res.data;
  },

  async createInProcessQC(
    runId: number,
    data: CreateInProcessQCRequest,
  ): Promise<InProcessQCCheck> {
    const res = await apiClient.post<InProcessQCCheck>(EP.RUN_QC_INPROCESS(runId), data);
    return res.data;
  },

  async updateInProcessQC(
    runId: number,
    checkId: number,
    data: Partial<CreateInProcessQCRequest>,
  ): Promise<InProcessQCCheck> {
    const res = await apiClient.patch<InProcessQCCheck>(
      EP.RUN_QC_INPROCESS_DETAIL(runId, checkId),
      data,
    );
    return res.data;
  },

  async deleteInProcessQC(runId: number, checkId: number): Promise<void> {
    await apiClient.delete(EP.RUN_QC_INPROCESS_DETAIL(runId, checkId));
  },

  async getFinalQC(runId: number): Promise<FinalQCCheck> {
    const res = await apiClient.get<FinalQCCheck>(EP.RUN_QC_FINAL(runId));
    return res.data;
  },

  async createFinalQC(runId: number, data: CreateFinalQCRequest): Promise<FinalQCCheck> {
    const res = await apiClient.post<FinalQCCheck>(EP.RUN_QC_FINAL(runId), data);
    return res.data;
  },

  async updateFinalQC(
    runId: number,
    data: Partial<CreateFinalQCRequest>,
  ): Promise<FinalQCCheck> {
    const res = await apiClient.patch<FinalQCCheck>(EP.RUN_QC_FINAL(runId), data);
    return res.data;
  },

  // =========================================================================
  // Reports
  // =========================================================================

  async getDailyProductionReport(date?: string): Promise<ProductionRunDetail[]> {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    const res = await apiClient.get<ProductionRunDetail[]>(EP.REPORTS_DAILY, { params });
    return res.data;
  },

  async getYieldReport(runId: number): Promise<YieldReport> {
    const res = await apiClient.get<YieldReport>(EP.REPORTS_YIELD(runId));
    return res.data;
  },

  async getLineClearanceReport(params?: AnalyticsParams): Promise<LineClearance[]> {
    const res = await apiClient.get<LineClearance[]>(EP.REPORTS_LINE_CLEARANCE, { params });
    return res.data;
  },

  async getAnalytics(params?: AnalyticsParams): Promise<unknown> {
    const res = await apiClient.get(EP.REPORTS_ANALYTICS, { params });
    return res.data;
  },

  async getOEEAnalytics(params?: AnalyticsParams): Promise<OEEAnalytics> {
    const res = await apiClient.get<OEEAnalytics>(EP.REPORTS_OEE, { params });
    return res.data;
  },

  async getDowntimeAnalytics(params?: AnalyticsParams): Promise<DowntimeAnalytics> {
    const res = await apiClient.get<DowntimeAnalytics>(EP.REPORTS_DOWNTIME, { params });
    return res.data;
  },

  async getWasteAnalytics(params?: AnalyticsParams): Promise<WasteAnalytics> {
    const res = await apiClient.get<WasteAnalytics>(EP.REPORTS_WASTE_ANALYTICS, { params });
    return res.data;
  },

  // =========================================================================
  // Phase 1 Reports
  // =========================================================================

  async getResourceConsumptionReport(params?: AnalyticsParams): Promise<ResourceConsumptionReport> {
    const res = await apiClient.get<ResourceConsumptionReport>(EP.REPORTS_RESOURCE_CONSUMPTION, { params });
    return res.data;
  },

  async getMonthlySummaryReport(params: { year: number; line?: number }): Promise<MonthlySummaryReport> {
    const res = await apiClient.get<MonthlySummaryReport>(EP.REPORTS_MONTHLY_SUMMARY, { params });
    return res.data;
  },

  async getPlanVsProductionReport(params?: AnalyticsParams): Promise<PlanVsProductionReport> {
    const res = await apiClient.get<PlanVsProductionReport>(EP.REPORTS_PLAN_VS_PRODUCTION, { params });
    return res.data;
  },

  async getProcurementVsPlannedReport(params: { sap_doc_entry: number }): Promise<ProcurementVsPlannedReport> {
    const res = await apiClient.get<ProcurementVsPlannedReport>(EP.REPORTS_PROCUREMENT_VS_PLANNED, { params });
    return res.data;
  },

  // =========================================================================
  // Phase 2 Reports
  // =========================================================================

  async getOEETrendReport(params?: AnalyticsParams & { group_by?: string }): Promise<OEETrendReport> {
    const res = await apiClient.get<OEETrendReport>(EP.REPORTS_OEE_TREND, { params });
    return res.data;
  },

  async getDowntimeParetoReport(params?: AnalyticsParams): Promise<DowntimeParetoReport> {
    const res = await apiClient.get<DowntimeParetoReport>(EP.REPORTS_DOWNTIME_PARETO, { params });
    return res.data;
  },

  async getCostAnalysisReport(params?: AnalyticsParams): Promise<CostAnalysisReport> {
    const res = await apiClient.get<CostAnalysisReport>(EP.REPORTS_COST_ANALYSIS, { params });
    return res.data;
  },

  async getWasteTrendReport(params?: AnalyticsParams): Promise<WasteTrendReport> {
    const res = await apiClient.get<WasteTrendReport>(EP.REPORTS_WASTE_TREND, { params });
    return res.data;
  },
};
