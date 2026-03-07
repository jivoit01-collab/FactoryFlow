import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AnalyticsQueryParams,
  ApproveClearanceRequest,
  ApproveWasteRequest,
  ChecklistQueryParams,
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
  ReportQueryParams,
  RunsQueryParams,
  UpdateBreakdownRequest,
  UpdateClearanceRequest,
  UpdateMaterialUsageRequest,
  UpdateRunRequest,
  WasteQueryParams,
} from '../types';
import { executionApi } from './execution.api';

// ============================================================================
// Query Keys
// ============================================================================

export const EXECUTION_QUERY_KEYS = {
  all: ['production-execution'] as const,
  // Dashboard
  dashboard: () => [...EXECUTION_QUERY_KEYS.all, 'dashboard'] as const,
  // Lines & Machines
  lines: (isActive?: boolean) => [...EXECUTION_QUERY_KEYS.all, 'lines', { isActive }] as const,
  machines: (lineId?: number, machineType?: string) =>
    [...EXECUTION_QUERY_KEYS.all, 'machines', { lineId, machineType }] as const,
  checklistTemplates: (machineType?: string, frequency?: string) =>
    [...EXECUTION_QUERY_KEYS.all, 'checklist-templates', { machineType, frequency }] as const,
  // Runs
  runs: (params?: RunsQueryParams) => [...EXECUTION_QUERY_KEYS.all, 'runs', params] as const,
  runDetail: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'run', runId] as const,
  // Logs
  logs: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'logs', runId] as const,
  // Breakdowns
  breakdowns: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'breakdowns', runId] as const,
  // Materials
  materials: (runId: number, batchNumber?: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'materials', runId, { batchNumber }] as const,
  // Machine Runtime
  machineRuntime: (runId: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'machine-runtime', runId] as const,
  // Manpower
  manpower: (runId: number) => [...EXECUTION_QUERY_KEYS.all, 'manpower', runId] as const,
  // Line Clearance
  clearances: (params?: ClearanceQueryParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'clearances', params] as const,
  clearanceDetail: (clearanceId: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'clearance', clearanceId] as const,
  // Machine Checklists
  checklistEntries: (params?: ChecklistQueryParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'checklist-entries', params] as const,
  // Waste
  wasteLogs: (params?: WasteQueryParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'waste', params] as const,
  wasteDetail: (wasteId: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'waste-detail', wasteId] as const,
  // Reports
  dailyReport: (params: ReportQueryParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'report-daily', params] as const,
  yieldReport: (runId: number) =>
    [...EXECUTION_QUERY_KEYS.all, 'report-yield', runId] as const,
  analytics: (params: AnalyticsQueryParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'analytics', params] as const,
  oee: (params: AnalyticsQueryParams) =>
    [...EXECUTION_QUERY_KEYS.all, 'oee', params] as const,
};

// ============================================================================
// Dashboard
// ============================================================================

export function useExecutionDashboard() {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.dashboard(),
    queryFn: () => executionApi.getDashboardSummary(),
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Lines & Machines
// ============================================================================

export function useProductionLines(isActive?: boolean) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.lines(isActive),
    queryFn: () => executionApi.getLines(isActive),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMachines(lineId?: number, machineType?: string) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.machines(lineId, machineType),
    queryFn: () => executionApi.getMachines(lineId, machineType),
    staleTime: 5 * 60 * 1000,
  });
}

export function useChecklistTemplates(machineType?: string, frequency?: string) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.checklistTemplates(machineType, frequency),
    queryFn: () => executionApi.getChecklistTemplates(machineType, frequency),
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Production Runs
// ============================================================================

export function useProductionRuns(params?: RunsQueryParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.runs(params),
    queryFn: () => executionApi.getRuns(params),
    staleTime: 30 * 1000,
  });
}

export function useRunDetail(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.runDetail(runId!),
    queryFn: () => executionApi.getRunDetail(runId!),
    enabled: !!runId,
  });
}

export function useCreateRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRunRequest) => executionApi.createRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

export function useUpdateRun(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRunRequest) => executionApi.updateRun(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.dashboard() });
    },
  });
}

export function useCompleteRun(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => executionApi.completeRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Hourly Logs
// ============================================================================

export function useProductionLogs(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.logs(runId!),
    queryFn: () => executionApi.getLogs(runId!),
    enabled: !!runId,
  });
}

export function useCreateLogs(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLogRequest[]) => executionApi.createLogs(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.logs(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useUpdateLog(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, data }: { logId: number; data: Partial<CreateLogRequest> }) =>
      executionApi.updateLog(runId, logId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.logs(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

// ============================================================================
// Breakdowns
// ============================================================================

export function useBreakdowns(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.breakdowns(runId!),
    queryFn: () => executionApi.getBreakdowns(runId!),
    enabled: !!runId,
  });
}

export function useCreateBreakdown(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBreakdownRequest) => executionApi.createBreakdown(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.breakdowns(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useUpdateBreakdown(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      breakdownId,
      data,
    }: {
      breakdownId: number;
      data: UpdateBreakdownRequest;
    }) => executionApi.updateBreakdown(runId, breakdownId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.breakdowns(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useDeleteBreakdown(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (breakdownId: number) => executionApi.deleteBreakdown(runId, breakdownId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.breakdowns(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

// ============================================================================
// Materials
// ============================================================================

export function useMaterialUsage(runId: number | null, batchNumber?: number) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.materials(runId!, batchNumber),
    queryFn: () => executionApi.getMaterials(runId!, batchNumber),
    enabled: !!runId,
  });
}

export function useCreateMaterialUsage(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaterialUsageRequest[]) => executionApi.createMaterials(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.materials(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useUpdateMaterialUsage(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      materialId,
      data,
    }: {
      materialId: number;
      data: UpdateMaterialUsageRequest;
    }) => executionApi.updateMaterial(runId, materialId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.materials(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

// ============================================================================
// Machine Runtime
// ============================================================================

export function useMachineRuntime(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.machineRuntime(runId!),
    queryFn: () => executionApi.getMachineRuntime(runId!),
    enabled: !!runId,
  });
}

export function useCreateMachineRuntime(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMachineRuntimeRequest[]) =>
      executionApi.createMachineRuntime(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineRuntime(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useUpdateMachineRuntime(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      runtimeId,
      data,
    }: {
      runtimeId: number;
      data: Partial<CreateMachineRuntimeRequest>;
    }) => executionApi.updateMachineRuntime(runId, runtimeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.machineRuntime(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

// ============================================================================
// Manpower
// ============================================================================

export function useManpower(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.manpower(runId!),
    queryFn: () => executionApi.getManpower(runId!),
    enabled: !!runId,
  });
}

export function useCreateManpower(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateManpowerRequest) => executionApi.createManpower(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.manpower(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

export function useUpdateManpower(runId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      manpowerId,
      data,
    }: {
      manpowerId: number;
      data: Partial<CreateManpowerRequest>;
    }) => executionApi.updateManpower(runId, manpowerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.manpower(runId) });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.runDetail(runId) });
    },
  });
}

// ============================================================================
// Line Clearance
// ============================================================================

export function useLineClearances(params?: ClearanceQueryParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.clearances(params),
    queryFn: () => executionApi.getClearances(params),
    staleTime: 30 * 1000,
  });
}

export function useClearanceDetail(clearanceId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId!),
    queryFn: () => executionApi.getClearanceDetail(clearanceId!),
    enabled: !!clearanceId,
  });
}

export function useCreateClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClearanceRequest) => executionApi.createClearance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

export function useUpdateClearance(clearanceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateClearanceRequest) =>
      executionApi.updateClearance(clearanceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId),
      });
    },
  });
}

export function useSubmitClearance(clearanceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => executionApi.submitClearance(clearanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId),
      });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

export function useApproveClearance(clearanceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApproveClearanceRequest) =>
      executionApi.approveClearance(clearanceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: EXECUTION_QUERY_KEYS.clearanceDetail(clearanceId),
      });
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Machine Checklists
// ============================================================================

export function useChecklistEntries(params?: ChecklistQueryParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.checklistEntries(params),
    queryFn: () => executionApi.getChecklistEntries(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateChecklistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChecklistEntryRequest) => executionApi.createChecklistEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

export function useBulkCreateChecklistEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChecklistEntryRequest[]) =>
      executionApi.bulkCreateChecklistEntries(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

// ============================================================================
// Waste Management
// ============================================================================

export function useWasteLogs(params?: WasteQueryParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.wasteLogs(params),
    queryFn: () => executionApi.getWasteLogs(params),
    staleTime: 30 * 1000,
  });
}

export function useWasteDetail(wasteId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.wasteDetail(wasteId!),
    queryFn: () => executionApi.getWasteDetail(wasteId!),
    enabled: !!wasteId,
  });
}

export function useCreateWasteLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWasteLogRequest) => executionApi.createWasteLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
    },
  });
}

export function useApproveWaste(wasteId: number) {
  const queryClient = useQueryClient();
  return {
    engineer: useMutation({
      mutationFn: (data: ApproveWasteRequest) => executionApi.approveWasteEngineer(wasteId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.wasteDetail(wasteId) });
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
      },
    }),
    am: useMutation({
      mutationFn: (data: ApproveWasteRequest) => executionApi.approveWasteAM(wasteId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.wasteDetail(wasteId) });
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
      },
    }),
    store: useMutation({
      mutationFn: (data: ApproveWasteRequest) => executionApi.approveWasteStore(wasteId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.wasteDetail(wasteId) });
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
      },
    }),
    hod: useMutation({
      mutationFn: (data: ApproveWasteRequest) => executionApi.approveWasteHOD(wasteId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.wasteDetail(wasteId) });
        queryClient.invalidateQueries({ queryKey: EXECUTION_QUERY_KEYS.all });
      },
    }),
  };
}

// ============================================================================
// Reports
// ============================================================================

export function useDailyProductionReport(params: ReportQueryParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.dailyReport(params),
    queryFn: () => executionApi.getDailyProductionReport(params),
    enabled: !!params.date,
    staleTime: 60 * 1000,
  });
}

export function useYieldReport(runId: number | null) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.yieldReport(runId!),
    queryFn: () => executionApi.getYieldReport(runId!),
    enabled: !!runId,
  });
}

export function useAnalytics(params: AnalyticsQueryParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.analytics(params),
    queryFn: () => executionApi.getAnalytics(params),
    enabled: !!params.date_from && !!params.date_to,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOEE(params: AnalyticsQueryParams) {
  return useQuery({
    queryKey: EXECUTION_QUERY_KEYS.oee(params),
    queryFn: () => executionApi.getOEE(params),
    enabled: !!params.date_from && !!params.date_to,
    staleTime: 5 * 60 * 1000,
  });
}
