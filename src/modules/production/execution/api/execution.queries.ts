import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddBreakdownRequest,
  AnalyticsParams,
  ApproveClearanceRequest,
  BulkChecklistRequest,
  CompleteRunRequest,
  CreateChecklistEntryRequest,
  CreateCompressedAirRequest,
  CreateElectricityRequest,
  CreateFinalQCRequest,
  CreateGasRequest,
  CreateInProcessQCRequest,
  CreateLabourRequest,
  CreateLineClearanceRequest,
  CreateLineRequest,
  CreateLineSkuConfigPayload,
  CreateMachineCostRequest,
  CreateMachineRequest,
  CreateManpowerRequest,
  CreateMaterialUsageRequest,
  CreateOverheadRequest,
  CreateRunRequest,
  CreateRuntimeRequest,
  CreateTemplateRequest,
  CreateWasteLogRequest,
  CreateWaterRequest,
  ResolveBreakdownRequest,
  StopProductionRequest,
  UpdateBreakdownRemarksRequest,
  UpdateLineClearanceRequest,
  UpdateLineSkuConfigPayload,
  UpdateRunRequest,
  UpdateSegmentRequest,
  WasteApprovalRequest,
} from '../types';
import { executionApi } from './execution.api';

// ============================================================================
// Query Keys
// ============================================================================

export const EXECUTION_QUERY_KEYS = {
  all: ['production-execution'] as const,
  // Master Data
  lines: (isActive?: boolean) => [...EXECUTION_QUERY_KEYS.all, 'lines', { isActive }] as const,
  machines: (lineId?: number, machineType?: string) =>
    [...EXECUTION_QUERY_KEYS.all, 'machines', { lineId, machineType }] as const,
  checklistTemplates: (machineType?: string) =>
    [...EXECUTION_QUERY_KEYS.all, 'checklist-templates', { machineType }] as const,
  // SAP
  sapOrders: () => [...EXECUTION_QUERY_KEYS.all, 'sap-orders'] as const,
  sapOrderDetail: (docEntry: number | null | undefined) =>
    [...EXECUTION_QUERY_KEYS.all, 'sap-order', docEntry] as const,
  // Runs
  runs: (status?: string, date?: string) =>
    [...EXECUTION_QUERY_KEYS.all, 'runs', { status, date }] as const,
  runDetail: (runId: number | null | undefined) =>
    [...EXECUTION_QUERY_KEYS.all, 'run', runId] as const,
  // Run sub-resources
  breakdowns: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'breakdowns', runId] as const,
  breakdownCategories: () => [...EXECUTION_QUERY_KEYS.all, 'breakdown-categories'] as const,
  materials: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'materials', runId] as const,
  machineRuntime: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'runtime', runId] as const,
  manpower: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'manpower', runId] as const,
  // Line Clearance
  clearances: (lineId?: number, status?: string) =>
    [...EXECUTION_QUERY_KEYS.all, 'clearances', { lineId, status }] as const,
  clearanceDetail: (id: number | null | undefined) =>
    [...EXECUTION_QUERY_KEYS.all, 'clearance', id] as const,
  // Checklists
  checklists: (machineId?: number, date?: string, month?: number, year?: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'checklists', { machineId, date, month, year }] as const,
  // Waste
  wasteLogs: (runId?: number) => [...EXECUTION_QUERY_KEYS.all, 'waste', { runId }] as const,
  wasteDetail: (id: number | null | undefined) =>
    [...EXECUTION_QUERY_KEYS.all, 'waste-detail', id] as const,
  // Resources
  electricity: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'electricity', runId] as const,
  water: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'water', runId] as const,
  gas: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'gas', runId] as const,
  compressedAir: (runId: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'compressed-air', runId] as const,
  labour: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'labour', runId] as const,
  machineCosts: (runId: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'machine-costs', runId] as const,
  overhead: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'overhead', runId] as const,
  // Cost
  runCost: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'cost', runId] as const,
  costAnalytics: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'cost-analytics', params] as const,
  // QC
  inProcessQC: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'qc-inprocess', runId] as const,
  finalQC: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'qc-final', runId] as const,
  // Reports
  dailyReport: (date?: string) =>
    [...EXECUTION_QUERY_KEYS.all, 'daily-report', date] as const,
  yieldReport: (runId: number | null | undefined) =>
    [...EXECUTION_QUERY_KEYS.all, 'yield-report', runId] as const,
  oeeAnalytics: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'oee', params] as const,
  downtimeAnalytics: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'downtime', params] as const,
  wasteAnalytics: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'waste-analytics', params] as const,
  // Phase 1 Reports
  resourceConsumption: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'resource-consumption', params] as const,
  monthlySummary: (year: number, line?: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'monthly-summary', { year, line }] as const,
  planVsProduction: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'plan-vs-production', params] as const,
  procurementVsPlanned: (sapDocEntry: number | null | undefined) =>
    [...EXECUTION_QUERY_KEYS.all, 'procurement-vs-planned', sapDocEntry] as const,
  // Phase 2 Reports
  oeeTrend: (params?: AnalyticsParams & { group_by?: string }) =>
    [...EXECUTION_QUERY_KEYS.all, 'oee-trend', params] as const,
  downtimePareto: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'downtime-pareto', params] as const,
  costAnalysis: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'cost-analysis', params] as const,
  wasteTrend: (params?: AnalyticsParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'waste-trend', params] as const,
};

// ============================================================================
// Master Data — Lines
// ============================================================================

export function useLines(isActive?: boolean) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.lines(isActive),
    queryFn: () => executionApi.getLines(isActive),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLineRequest) => executionApi.createLine(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'lines'] }),
  });
}

export function useUpdateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, data }: { lineId: number; data: Partial<CreateLineRequest> }) =>
      executionApi.updateLine(lineId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'lines'] }),
  });
}

export function useDeleteLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineId: number) => executionApi.deleteLine(lineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'lines'] }),
  });
}

// ============================================================================
// Master Data — Machines
// ============================================================================

export function useMachines(lineId?: number, machineType?: string) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.machines(lineId, machineType),
    queryFn: () => executionApi.getMachines(lineId, machineType),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMachineRequest) => executionApi.createMachine(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'machines'] }),
  });
}

export function useUpdateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      machineId,
      data,
    }: {
      machineId: number;
      data: Partial<CreateMachineRequest>;
    }) => executionApi.updateMachine(machineId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'machines'] }),
  });
}

export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (machineId: number) => executionApi.deleteMachine(machineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'machines'] }),
  });
}

// ============================================================================
// Master Data — Checklist Templates
// ============================================================================

export function useChecklistTemplates(machineType?: string) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.checklistTemplates(machineType),
    queryFn: () => executionApi.getChecklistTemplates(machineType),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateChecklistTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => executionApi.createChecklistTemplate(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'checklist-templates'] }),
  });
}

export function useUpdateChecklistTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: number;
      data: Partial<CreateTemplateRequest>;
    }) => executionApi.updateChecklistTemplate(templateId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'checklist-templates'] }),
  });
}

export function useDeleteChecklistTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: number) => executionApi.deleteChecklistTemplate(templateId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'checklist-templates'] }),
  });
}

// ============================================================================
// SAP Orders
// ============================================================================

export function useSAPOrders() {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.sapOrders(),
    queryFn: () => executionApi.getSAPOrders(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSAPOrderDetail(docEntry: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.sapOrderDetail(docEntry),
    queryFn: docEntry != null ? () => executionApi.getSAPOrderDetail(docEntry) : skipToken,
  });
}

export function useSearchSAPItems(search: string) {
  return useQuery({
    queryKey: [...EXECUTION_QUERY_KEYS.all, 'sap-items', search] as const,
    queryFn: () => executionApi.searchSAPItems(search),
    enabled: search.length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useBOMPreview(itemCode: string | null) {
  return useQuery({
    queryKey: [...EXECUTION_QUERY_KEYS.all, 'sap-bom', itemCode] as const,
    queryFn: itemCode ? () => executionApi.getBOM(itemCode) : skipToken,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Production Runs
// ============================================================================

export function useRuns(filters?: {
  status?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  line_id?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: [...EXECUTION_QUERY_KEYS.runs(), filters] as const,
    queryFn: () => executionApi.getRuns(filters),
    staleTime: 30 * 1000,
  });
}

export function useRunDetail(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.runDetail(runId),
    queryFn: runId != null ? () => executionApi.getRunDetail(runId) : skipToken,
  });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRunRequest) => executionApi.createRun(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

export function useUpdateRun(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRunRequest) => executionApi.updateRun(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'runs'] });
    },
  });
}

export function useDeleteRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: number) => executionApi.deleteRun(runId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

export function useCompleteRun(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CompleteRunRequest) => executionApi.completeRun(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'runs'] });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

// ============================================================================
// Timeline Actions
// ============================================================================

export function useStartProduction(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => executionApi.startProduction(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
      queryClient.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'runs'] });
    },
  });
}

export function useStopProduction(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StopProductionRequest) => executionApi.stopProduction(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
      queryClient.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'runs'] });
    },
  });
}

export function useAddBreakdown(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddBreakdownRequest) => executionApi.addBreakdown(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
      queryClient.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'runs'] });
    },
  });
}

export function useResolveBreakdown(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ breakdownId, data }: { breakdownId: number; data: ResolveBreakdownRequest }) =>
      executionApi.resolveBreakdown(runId, breakdownId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
      queryClient.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'runs'] });
    },
  });
}

// ============================================================================
// Breakdowns
// ============================================================================

export function useBreakdownCategories() {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.breakdownCategories(),
    queryFn: () => executionApi.getBreakdownCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBreakdowns(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.breakdowns(runId),
    queryFn: () => executionApi.getBreakdowns(runId),
    enabled: !!runId,
  });
}

export function useUpdateSegment(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ segmentId, data }: { segmentId: number; data: UpdateSegmentRequest }) =>
      executionApi.updateSegment(runId, segmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useUpdateBreakdownRemarks(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ breakdownId, data }: { breakdownId: number; data: UpdateBreakdownRemarksRequest }) =>
      executionApi.updateBreakdownRemarks(runId, breakdownId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useDeleteBreakdown(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (breakdownId: number) => executionApi.deleteBreakdown(runId, breakdownId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.breakdowns(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

// ============================================================================
// Materials
// ============================================================================

export function useMaterials(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.materials(runId),
    queryFn: () => executionApi.getMaterials(runId),
    enabled: !!runId,
  });
}

export function useCreateMaterial(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaterialUsageRequest) => executionApi.createMaterial(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.materials(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useUpdateMaterial(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      materialId,
      data,
    }: {
      materialId: number;
      data: Partial<CreateMaterialUsageRequest>;
    }) => executionApi.updateMaterial(runId, materialId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.materials(runId) });
    },
  });
}

export function useDeleteMaterial(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: number) => executionApi.deleteMaterial(runId, materialId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.materials(runId) });
    },
  });
}

// ============================================================================
// Machine Runtime
// ============================================================================

export function useMachineRuntime(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.machineRuntime(runId),
    queryFn: () => executionApi.getMachineRuntime(runId),
    enabled: !!runId,
  });
}

export function useCreateMachineRuntime(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRuntimeRequest) => executionApi.createMachineRuntime(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineRuntime(runId) });
    },
  });
}

export function useUpdateMachineRuntime(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      runtimeId,
      data,
    }: {
      runtimeId: number;
      data: Partial<CreateRuntimeRequest>;
    }) => executionApi.updateMachineRuntime(runId, runtimeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineRuntime(runId) });
    },
  });
}

export function useDeleteMachineRuntime(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runtimeId: number) => executionApi.deleteMachineRuntime(runId, runtimeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineRuntime(runId) });
    },
  });
}

// ============================================================================
// Manpower
// ============================================================================

export function useManpower(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.manpower(runId),
    queryFn: () => executionApi.getManpower(runId),
    enabled: !!runId,
  });
}

export function useCreateManpower(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateManpowerRequest) => executionApi.createManpower(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.manpower(runId) });
    },
  });
}

export function useUpdateManpower(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      manpowerId,
      data,
    }: {
      manpowerId: number;
      data: Partial<CreateManpowerRequest>;
    }) => executionApi.updateManpower(runId, manpowerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.manpower(runId) });
    },
  });
}

export function useDeleteManpower(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (manpowerId: number) => executionApi.deleteManpower(runId, manpowerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.manpower(runId) });
    },
  });
}

// ============================================================================
// Line Clearance
// ============================================================================

export function useLineClearances(lineId?: number, status?: string) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.clearances(lineId, status),
    queryFn: () => executionApi.getLineClearances(lineId, status),
    staleTime: 30 * 1000,
  });
}

export function useLineClearanceDetail(clearanceId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId),
    queryFn:
      clearanceId != null ? () => executionApi.getLineClearanceDetail(clearanceId) : skipToken,
  });
}

export function useCreateLineClearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLineClearanceRequest) => executionApi.createLineClearance(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'clearances'] });
    },
  });
}

export function useUpdateLineClearance(clearanceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateLineClearanceRequest) =>
      executionApi.updateLineClearance(clearanceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId) });
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'clearances'] });
    },
  });
}

export function useSubmitLineClearance(clearanceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => executionApi.submitLineClearance(clearanceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId) });
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'clearances'] });
    },
  });
}

export function useApproveLineClearance(clearanceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApproveClearanceRequest) =>
      executionApi.approveLineClearance(clearanceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId) });
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'clearances'] });
    },
  });
}

// ============================================================================
// Machine Checklists
// ============================================================================

export function useMachineChecklists(
  machineId?: number,
  date?: string,
  month?: number,
  year?: number,
) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.checklists(machineId, date, month, year),
    queryFn: () => executionApi.getMachineChecklists(machineId, date, month, year),
    staleTime: 30 * 1000,
  });
}

export function useCreateChecklistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChecklistEntryRequest) => executionApi.createChecklistEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'checklists'] });
    },
  });
}

export function useBulkCreateChecklists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkChecklistRequest) => executionApi.bulkCreateChecklists(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'checklists'] });
    },
  });
}

export function useUpdateChecklistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      data,
    }: {
      entryId: number;
      data: Partial<CreateChecklistEntryRequest>;
    }) => executionApi.updateChecklistEntry(entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'checklists'] });
    },
  });
}

// ============================================================================
// Waste Management
// ============================================================================

export function useWasteLogs(runId?: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.wasteLogs(runId),
    queryFn: () => executionApi.getWasteLogs(runId),
    staleTime: 30 * 1000,
  });
}

export function useWasteLogDetail(wasteId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.wasteDetail(wasteId),
    queryFn: wasteId != null ? () => executionApi.getWasteLogDetail(wasteId) : skipToken,
  });
}

export function useCreateWasteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWasteLogRequest) => executionApi.createWasteLog(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'waste'] });
    },
  });
}

export function useUpdateWasteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      wasteId,
      data,
    }: {
      wasteId: number;
      data: Partial<CreateWasteLogRequest>;
    }) => executionApi.updateWasteLog(wasteId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'waste'] });
    },
  });
}

export function useDeleteWasteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (wasteId: number) => executionApi.deleteWasteLog(wasteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'waste'] });
    },
  });
}

export function useApproveWasteEngineer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wasteId, data }: { wasteId: number; data: WasteApprovalRequest }) =>
      executionApi.approveWasteEngineer(wasteId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'waste'] });
    },
  });
}

export function useApproveWasteAM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wasteId, data }: { wasteId: number; data: WasteApprovalRequest }) =>
      executionApi.approveWasteAM(wasteId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'waste'] });
    },
  });
}

export function useApproveWasteStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wasteId, data }: { wasteId: number; data: WasteApprovalRequest }) =>
      executionApi.approveWasteStore(wasteId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'waste'] });
    },
  });
}

export function useApproveWasteHOD() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wasteId, data }: { wasteId: number; data: WasteApprovalRequest }) =>
      executionApi.approveWasteHOD(wasteId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'waste'] });
    },
  });
}

// ============================================================================
// Resources
// ============================================================================

export function useElectricity(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.electricity(runId),
    queryFn: () => executionApi.getElectricity(runId),
    enabled: !!runId,
  });
}

export function useCreateElectricity(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateElectricityRequest) => executionApi.createElectricity(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.electricity(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useUpdateElectricity(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: Partial<CreateElectricityRequest> }) =>
      executionApi.updateElectricity(runId, entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.electricity(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useDeleteElectricity(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => executionApi.deleteElectricity(runId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.electricity(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useWater(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.water(runId),
    queryFn: () => executionApi.getWater(runId),
    enabled: !!runId,
  });
}

export function useCreateWater(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWaterRequest) => executionApi.createWater(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.water(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useUpdateWater(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: Partial<CreateWaterRequest> }) =>
      executionApi.updateWater(runId, entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.water(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useDeleteWater(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => executionApi.deleteWater(runId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.water(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useGas(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.gas(runId),
    queryFn: () => executionApi.getGas(runId),
    enabled: !!runId,
  });
}

export function useCreateGas(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGasRequest) => executionApi.createGas(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.gas(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useUpdateGas(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: Partial<CreateGasRequest> }) =>
      executionApi.updateGas(runId, entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.gas(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useDeleteGas(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => executionApi.deleteGas(runId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.gas(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useCompressedAir(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.compressedAir(runId),
    queryFn: () => executionApi.getCompressedAir(runId),
    enabled: !!runId,
  });
}

export function useCreateCompressedAir(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompressedAirRequest) =>
      executionApi.createCompressedAir(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.compressedAir(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useUpdateCompressedAir(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: Partial<CreateCompressedAirRequest> }) =>
      executionApi.updateCompressedAir(runId, entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.compressedAir(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useDeleteCompressedAir(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => executionApi.deleteCompressedAir(runId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.compressedAir(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useLabour(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.labour(runId),
    queryFn: () => executionApi.getLabour(runId),
    enabled: !!runId,
  });
}

export function useCreateLabour(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLabourRequest) => executionApi.createLabour(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.labour(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useUpdateLabour(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: Partial<CreateLabourRequest> }) =>
      executionApi.updateLabour(runId, entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.labour(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useDeleteLabour(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => executionApi.deleteLabour(runId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.labour(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useMachineCosts(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.machineCosts(runId),
    queryFn: () => executionApi.getMachineCosts(runId),
    enabled: !!runId,
  });
}

export function useCreateMachineCost(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMachineCostRequest) => executionApi.createMachineCost(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineCosts(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useUpdateMachineCost(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: Partial<CreateMachineCostRequest> }) =>
      executionApi.updateMachineCost(runId, entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineCosts(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useDeleteMachineCost(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => executionApi.deleteMachineCost(runId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineCosts(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useOverhead(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.overhead(runId),
    queryFn: () => executionApi.getOverhead(runId),
    enabled: !!runId,
  });
}

export function useCreateOverhead(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOverheadRequest) => executionApi.createOverhead(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.overhead(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useUpdateOverhead(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: Partial<CreateOverheadRequest> }) =>
      executionApi.updateOverhead(runId, entryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.overhead(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

export function useDeleteOverhead(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => executionApi.deleteOverhead(runId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.overhead(runId) });
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runCost(runId) });
    },
  });
}

// ============================================================================
// Cost
// ============================================================================

export function useRunCost(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.runCost(runId),
    queryFn: () => executionApi.getRunCost(runId),
    enabled: !!runId,
  });
}

export function useCostAnalytics(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.costAnalytics(params),
    queryFn: () => executionApi.getCostAnalytics(params),
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// QC
// ============================================================================

export function useInProcessQC(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.inProcessQC(runId),
    queryFn: () => executionApi.getInProcessQC(runId),
    enabled: !!runId,
  });
}

export function useCreateInProcessQC(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInProcessQCRequest) => executionApi.createInProcessQC(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.inProcessQC(runId) });
    },
  });
}

export function useUpdateInProcessQC(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      checkId,
      data,
    }: {
      checkId: number;
      data: Partial<CreateInProcessQCRequest>;
    }) => executionApi.updateInProcessQC(runId, checkId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.inProcessQC(runId) });
    },
  });
}

export function useDeleteInProcessQC(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkId: number) => executionApi.deleteInProcessQC(runId, checkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.inProcessQC(runId) });
    },
  });
}

export function useFinalQC(runId: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.finalQC(runId),
    queryFn: () => executionApi.getFinalQC(runId),
    enabled: !!runId,
    retry: false,
  });
}

export function useCreateFinalQC(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFinalQCRequest) => executionApi.createFinalQC(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.finalQC(runId) });
    },
  });
}

export function useUpdateFinalQC(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateFinalQCRequest>) => executionApi.updateFinalQC(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.finalQC(runId) });
    },
  });
}

// ============================================================================
// Reports
// ============================================================================

export function useDailyProductionReport(date?: string) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.dailyReport(date),
    queryFn: () => executionApi.getDailyProductionReport(date),
    staleTime: 60 * 1000,
  });
}

export function useYieldReport(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.yieldReport(runId),
    queryFn: runId != null ? () => executionApi.getYieldReport(runId) : skipToken,
  });
}

export function useOEEAnalytics(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.oeeAnalytics(params),
    queryFn: () => executionApi.getOEEAnalytics(params),
    staleTime: 60 * 1000,
  });
}

export function useDowntimeAnalytics(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.downtimeAnalytics(params),
    queryFn: () => executionApi.getDowntimeAnalytics(params),
    staleTime: 60 * 1000,
  });
}

export function useWasteAnalytics(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.wasteAnalytics(params),
    queryFn: () => executionApi.getWasteAnalytics(params),
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// Phase 1 Reports
// ============================================================================

export function useResourceConsumptionReport(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.resourceConsumption(params),
    queryFn: () => executionApi.getResourceConsumptionReport(params),
    staleTime: 60 * 1000,
  });
}

export function useMonthlySummaryReport(year: number, line?: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.monthlySummary(year, line),
    queryFn: () => executionApi.getMonthlySummaryReport({ year, line }),
    staleTime: 60 * 1000,
  });
}

export function usePlanVsProductionReport(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.planVsProduction(params),
    queryFn: () => executionApi.getPlanVsProductionReport(params),
    staleTime: 60 * 1000,
  });
}

export function useProcurementVsPlannedReport(sapDocEntry: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.procurementVsPlanned(sapDocEntry),
    queryFn:
      sapDocEntry != null
        ? () => executionApi.getProcurementVsPlannedReport({ sap_doc_entry: sapDocEntry })
        : skipToken,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// Phase 2 Reports
// ============================================================================

export function useOEETrendReport(params?: AnalyticsParams & { group_by?: string }) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.oeeTrend(params),
    queryFn: () => executionApi.getOEETrendReport(params),
    staleTime: 60 * 1000,
  });
}

export function useDowntimeParetoReport(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.downtimePareto(params),
    queryFn: () => executionApi.getDowntimeParetoReport(params),
    staleTime: 60 * 1000,
  });
}

export function useCostAnalysisReport(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.costAnalysis(params),
    queryFn: () => executionApi.getCostAnalysisReport(params),
    staleTime: 60 * 1000,
  });
}

export function useWasteTrendReport(params?: AnalyticsParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.wasteTrend(params),
    queryFn: () => executionApi.getWasteTrendReport(params),
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// Line SKU Config
// ============================================================================

export function useLineConfigs(lineId?: number) {
  return useQuery({
    queryKey: [...EXECUTION_QUERY_KEYS.all, 'line-configs', lineId],
    queryFn: () => executionApi.getLineConfigs(lineId),
  });
}

export function useCreateLineConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLineSkuConfigPayload) => executionApi.createLineConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'line-configs'] });
    },
  });
}

export function useUpdateLineConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ configId, data }: { configId: number; data: UpdateLineSkuConfigPayload }) =>
      executionApi.updateLineConfig(configId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'line-configs'] });
    },
  });
}

export function useDeleteLineConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configId: number) => executionApi.deleteLineConfig(configId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EXECUTION_QUERY_KEYS.all, 'line-configs'] });
    },
  });
}

export function useAutoFillConfig(lineId: number | null, skuCode?: string) {
  return useQuery({
    queryKey: [...EXECUTION_QUERY_KEYS.all, 'auto-fill', lineId, skuCode],
    queryFn:
      lineId != null ? () => executionApi.getAutoFillConfig(lineId, skuCode) : skipToken,
  });
}
