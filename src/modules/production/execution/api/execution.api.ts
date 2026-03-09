import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AnalyticsData,
  AnalyticsQueryParams,
  ApproveClearanceRequest,
  ApproveWasteRequest,
  ChecklistQueryParams,
  ChecklistTemplate,
  ClearanceQueryParams,
  CreateBreakdownRequest,
  CreateChecklistEntryRequest,
  CreateClearanceRequest,
  CreateLogRequest,
  CreateMachineRuntimeRequest,
  CreateManpowerRequest,
  CreateMaterialUsageRequest,
  CreateRunRequest,
  CreateWasteLogRequest,
  LineClearance,
  LineClearanceDetail,
  Machine,
  MachineBreakdown,
  MachineChecklistEntry,
  MachineRuntime,
  ProductionLine,
  ProductionLog,
  ProductionManpower,
  ProductionMaterialUsage,
  ProductionRun,
  ProductionRunDetail,
  ReportQueryParams,
  RunsQueryParams,
  UpdateBreakdownRequest,
  UpdateClearanceRequest,
  UpdateMaterialUsageRequest,
  UpdateRunRequest,
  WasteLog,
  WasteQueryParams,
  YieldReportData,
} from '../types';

const EP = API_ENDPOINTS.PRODUCTION_EXECUTION;

export const executionApi = {
  // ---- Production Lines ----

  async getLines(isActive?: boolean): Promise<ProductionLine[]> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const response = await apiClient.get<ProductionLine[]>(EP.LINES, { params });
    return response.data;
  },

  async createLine(data: { name: string; description?: string }): Promise<ProductionLine> {
    const response = await apiClient.post<ProductionLine>(EP.LINES, data);
    return response.data;
  },

  async updateLine(
    lineId: number,
    data: Partial<{ name: string; description: string; is_active: boolean }>,
  ): Promise<ProductionLine> {
    const response = await apiClient.patch<ProductionLine>(EP.LINE_DETAIL(lineId), data);
    return response.data;
  },

  async deleteLine(lineId: number): Promise<void> {
    await apiClient.delete(EP.LINE_DETAIL(lineId));
  },

  // ---- Machines ----

  async getMachines(lineId?: number, machineType?: string): Promise<Machine[]> {
    const params: Record<string, string | number> = {};
    if (lineId) params.line_id = lineId;
    if (machineType) params.machine_type = machineType;
    const response = await apiClient.get<Machine[]>(EP.MACHINES, { params });
    return response.data;
  },

  async createMachine(data: {
    name: string;
    machine_type: string;
    line_id: number;
  }): Promise<Machine> {
    const response = await apiClient.post<Machine>(EP.MACHINES, data);
    return response.data;
  },

  async updateMachine(
    machineId: number,
    data: Partial<{ name: string; machine_type: string; line_id: number; is_active: boolean }>,
  ): Promise<Machine> {
    const response = await apiClient.patch<Machine>(EP.MACHINE_DETAIL(machineId), data);
    return response.data;
  },

  async deleteMachine(machineId: number): Promise<void> {
    await apiClient.delete(EP.MACHINE_DETAIL(machineId));
  },

  // ---- Checklist Templates ----

  async getChecklistTemplates(
    machineType?: string,
    frequency?: string,
  ): Promise<ChecklistTemplate[]> {
    const params: Record<string, string> = {};
    if (machineType) params.machine_type = machineType;
    if (frequency) params.frequency = frequency;
    const response = await apiClient.get<ChecklistTemplate[]>(EP.CHECKLIST_TEMPLATES, { params });
    return response.data;
  },

  // ---- Production Runs ----

  async getRuns(queryParams?: RunsQueryParams): Promise<ProductionRun[]> {
    const params: Record<string, string | number> = {};
    if (queryParams?.date) params.date = queryParams.date;
    if (queryParams?.line_id) params.line_id = queryParams.line_id;
    if (queryParams?.status) params.status = queryParams.status;
    if (queryParams?.production_plan_id) params.production_plan_id = queryParams.production_plan_id;
    const response = await apiClient.get<ProductionRun[]>(EP.RUNS, { params });
    return response.data;
  },

  async getRunDetail(runId: number): Promise<ProductionRunDetail> {
    const response = await apiClient.get<ProductionRunDetail>(EP.RUN_DETAIL(runId));
    return response.data;
  },

  async createRun(data: CreateRunRequest): Promise<ProductionRunDetail> {
    const response = await apiClient.post<ProductionRunDetail>(EP.RUNS, data);
    return response.data;
  },

  async updateRun(runId: number, data: UpdateRunRequest): Promise<ProductionRunDetail> {
    const response = await apiClient.patch<ProductionRunDetail>(EP.RUN_DETAIL(runId), data);
    return response.data;
  },

  async completeRun(runId: number): Promise<ProductionRunDetail> {
    const response = await apiClient.post<ProductionRunDetail>(EP.RUN_COMPLETE(runId));
    return response.data;
  },

  // ---- Hourly Logs ----

  async getLogs(runId: number): Promise<ProductionLog[]> {
    const response = await apiClient.get<ProductionLog[]>(EP.RUN_LOGS(runId));
    return response.data;
  },

  async createLogs(runId: number, data: CreateLogRequest[]): Promise<ProductionLog[]> {
    const response = await apiClient.post<ProductionLog[]>(EP.RUN_LOGS(runId), data);
    return response.data;
  },

  async updateLog(
    runId: number,
    logId: number,
    data: Partial<CreateLogRequest>,
  ): Promise<ProductionLog> {
    const response = await apiClient.patch<ProductionLog>(EP.RUN_LOG_DETAIL(runId, logId), data);
    return response.data;
  },

  // ---- Breakdowns ----

  async getBreakdowns(runId: number): Promise<MachineBreakdown[]> {
    const response = await apiClient.get<MachineBreakdown[]>(EP.RUN_BREAKDOWNS(runId));
    return response.data;
  },

  async createBreakdown(runId: number, data: CreateBreakdownRequest): Promise<MachineBreakdown> {
    const response = await apiClient.post<MachineBreakdown>(EP.RUN_BREAKDOWNS(runId), data);
    return response.data;
  },

  async updateBreakdown(
    runId: number,
    breakdownId: number,
    data: UpdateBreakdownRequest,
  ): Promise<MachineBreakdown> {
    const response = await apiClient.patch<MachineBreakdown>(
      EP.RUN_BREAKDOWN_DETAIL(runId, breakdownId),
      data,
    );
    return response.data;
  },

  async deleteBreakdown(runId: number, breakdownId: number): Promise<void> {
    await apiClient.delete(EP.RUN_BREAKDOWN_DETAIL(runId, breakdownId));
  },

  // ---- Materials ----

  async getMaterials(runId: number, batchNumber?: number): Promise<ProductionMaterialUsage[]> {
    const params: Record<string, number> = {};
    if (batchNumber) params.batch_number = batchNumber;
    const response = await apiClient.get<ProductionMaterialUsage[]>(EP.RUN_MATERIALS(runId), {
      params,
    });
    return response.data;
  },

  async createMaterials(
    runId: number,
    data: CreateMaterialUsageRequest[],
  ): Promise<ProductionMaterialUsage[]> {
    const response = await apiClient.post<ProductionMaterialUsage[]>(
      EP.RUN_MATERIALS(runId),
      data,
    );
    return response.data;
  },

  async updateMaterial(
    runId: number,
    materialId: number,
    data: UpdateMaterialUsageRequest,
  ): Promise<ProductionMaterialUsage> {
    const response = await apiClient.patch<ProductionMaterialUsage>(
      EP.RUN_MATERIAL_DETAIL(runId, materialId),
      data,
    );
    return response.data;
  },

  // ---- Machine Runtime ----

  async getMachineRuntime(runId: number): Promise<MachineRuntime[]> {
    const response = await apiClient.get<MachineRuntime[]>(EP.RUN_MACHINE_RUNTIME(runId));
    return response.data;
  },

  async createMachineRuntime(
    runId: number,
    data: CreateMachineRuntimeRequest[],
  ): Promise<MachineRuntime[]> {
    const response = await apiClient.post<MachineRuntime[]>(
      EP.RUN_MACHINE_RUNTIME(runId),
      data,
    );
    return response.data;
  },

  async updateMachineRuntime(
    runId: number,
    runtimeId: number,
    data: Partial<CreateMachineRuntimeRequest>,
  ): Promise<MachineRuntime> {
    const response = await apiClient.patch<MachineRuntime>(
      EP.RUN_MACHINE_RUNTIME_DETAIL(runId, runtimeId),
      data,
    );
    return response.data;
  },

  // ---- Manpower ----

  async getManpower(runId: number): Promise<ProductionManpower[]> {
    const response = await apiClient.get<ProductionManpower[]>(EP.RUN_MANPOWER(runId));
    return response.data;
  },

  async createManpower(runId: number, data: CreateManpowerRequest): Promise<ProductionManpower> {
    const response = await apiClient.post<ProductionManpower>(EP.RUN_MANPOWER(runId), data);
    return response.data;
  },

  async updateManpower(
    runId: number,
    manpowerId: number,
    data: Partial<CreateManpowerRequest>,
  ): Promise<ProductionManpower> {
    const response = await apiClient.patch<ProductionManpower>(
      EP.RUN_MANPOWER_DETAIL(runId, manpowerId),
      data,
    );
    return response.data;
  },

  // ---- Line Clearance ----

  async getClearances(queryParams?: ClearanceQueryParams): Promise<LineClearance[]> {
    const params: Record<string, string | number> = {};
    if (queryParams?.date) params.date = queryParams.date;
    if (queryParams?.line_id) params.line_id = queryParams.line_id;
    if (queryParams?.status) params.status = queryParams.status;
    const response = await apiClient.get<LineClearance[]>(EP.LINE_CLEARANCE, { params });
    return response.data;
  },

  async getClearanceDetail(clearanceId: number): Promise<LineClearanceDetail> {
    const response = await apiClient.get<LineClearanceDetail>(
      EP.LINE_CLEARANCE_DETAIL(clearanceId),
    );
    return response.data;
  },

  async createClearance(data: CreateClearanceRequest): Promise<LineClearanceDetail> {
    const response = await apiClient.post<LineClearanceDetail>(EP.LINE_CLEARANCE, data);
    return response.data;
  },

  async updateClearance(
    clearanceId: number,
    data: UpdateClearanceRequest,
  ): Promise<LineClearanceDetail> {
    const response = await apiClient.patch<LineClearanceDetail>(
      EP.LINE_CLEARANCE_DETAIL(clearanceId),
      data,
    );
    return response.data;
  },

  async submitClearance(clearanceId: number): Promise<LineClearanceDetail> {
    const response = await apiClient.post<LineClearanceDetail>(
      EP.LINE_CLEARANCE_SUBMIT(clearanceId),
    );
    return response.data;
  },

  async approveClearance(
    clearanceId: number,
    data: ApproveClearanceRequest,
  ): Promise<LineClearanceDetail> {
    const response = await apiClient.post<LineClearanceDetail>(
      EP.LINE_CLEARANCE_APPROVE(clearanceId),
      data,
    );
    return response.data;
  },

  // ---- Machine Checklists ----

  async getChecklistEntries(queryParams?: ChecklistQueryParams): Promise<MachineChecklistEntry[]> {
    const params: Record<string, string | number> = {};
    if (queryParams?.machine_id) params.machine_id = queryParams.machine_id;
    if (queryParams?.month) params.month = queryParams.month;
    if (queryParams?.year) params.year = queryParams.year;
    if (queryParams?.frequency) params.frequency = queryParams.frequency;
    const response = await apiClient.get<MachineChecklistEntry[]>(EP.MACHINE_CHECKLISTS, {
      params,
    });
    return response.data;
  },

  async createChecklistEntry(data: CreateChecklistEntryRequest): Promise<MachineChecklistEntry> {
    const response = await apiClient.post<MachineChecklistEntry>(EP.MACHINE_CHECKLISTS, data);
    return response.data;
  },

  async bulkCreateChecklistEntries(
    data: CreateChecklistEntryRequest[],
  ): Promise<MachineChecklistEntry[]> {
    const response = await apiClient.post<MachineChecklistEntry[]>(
      EP.MACHINE_CHECKLISTS_BULK,
      data,
    );
    return response.data;
  },

  async updateChecklistEntry(
    entryId: number,
    data: Partial<CreateChecklistEntryRequest>,
  ): Promise<MachineChecklistEntry> {
    const response = await apiClient.patch<MachineChecklistEntry>(
      EP.MACHINE_CHECKLIST_DETAIL(entryId),
      data,
    );
    return response.data;
  },

  // ---- Waste Management ----

  async getWasteLogs(queryParams?: WasteQueryParams): Promise<WasteLog[]> {
    const params: Record<string, string | number> = {};
    if (queryParams?.run_id) params.run_id = queryParams.run_id;
    if (queryParams?.approval_status) params.approval_status = queryParams.approval_status;
    const response = await apiClient.get<WasteLog[]>(EP.WASTE, { params });
    return response.data;
  },

  async getWasteDetail(wasteId: number): Promise<WasteLog> {
    const response = await apiClient.get<WasteLog>(EP.WASTE_DETAIL(wasteId));
    return response.data;
  },

  async createWasteLog(data: CreateWasteLogRequest): Promise<WasteLog> {
    const response = await apiClient.post<WasteLog>(EP.WASTE, data);
    return response.data;
  },

  async approveWasteEngineer(wasteId: number, data: ApproveWasteRequest): Promise<WasteLog> {
    const response = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_ENGINEER(wasteId), data);
    return response.data;
  },

  async approveWasteAM(wasteId: number, data: ApproveWasteRequest): Promise<WasteLog> {
    const response = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_AM(wasteId), data);
    return response.data;
  },

  async approveWasteStore(wasteId: number, data: ApproveWasteRequest): Promise<WasteLog> {
    const response = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_STORE(wasteId), data);
    return response.data;
  },

  async approveWasteHOD(wasteId: number, data: ApproveWasteRequest): Promise<WasteLog> {
    const response = await apiClient.post<WasteLog>(EP.WASTE_APPROVE_HOD(wasteId), data);
    return response.data;
  },

  // ---- Reports ----

  async getDailyProductionReport(queryParams: ReportQueryParams): Promise<ProductionRunDetail[]> {
    const params: Record<string, string | number> = { date: queryParams.date };
    if (queryParams.line_id) params.line_id = queryParams.line_id;
    const response = await apiClient.get<ProductionRunDetail[]>(EP.REPORTS_DAILY, { params });
    return response.data;
  },

  async getYieldReport(runId: number): Promise<YieldReportData> {
    const response = await apiClient.get<YieldReportData>(EP.REPORTS_YIELD(runId));
    return response.data;
  },

  async getAnalytics(queryParams: AnalyticsQueryParams): Promise<AnalyticsData> {
    const params: Record<string, string | number> = {
      date_from: queryParams.date_from,
      date_to: queryParams.date_to,
    };
    if (queryParams.line_id) params.line_id = queryParams.line_id;
    const response = await apiClient.get<AnalyticsData>(EP.REPORTS_ANALYTICS, { params });
    return response.data;
  },
};
