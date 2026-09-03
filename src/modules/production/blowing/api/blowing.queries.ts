import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddBreakdownRequest,
  AddManualBreakdownRequest,
  AddManualSegmentRequest,
  CompleteRunRequest,
  CreateBreakdownCategoryRequest,
  CreateBuyPriceRequest,
  CreateMachineRequest,
  CreatePreformSpecRequest,
  CreateRateConfigRequest,
  CreateRunRequest,
  ResolveBreakdownRequest,
  RunListParams,
  StopProductionRequest,
  UpdateRunRequest,
} from '../types';
import { blowingApi } from './blowing.api';

export const BLOWING_QUERY_KEYS = {
  all: ['blowing'] as const,
  machines: (isActive?: boolean) => [...BLOWING_QUERY_KEYS.all, 'machines', { isActive }] as const,
  preformSpecs: (isActive?: boolean) =>
    [...BLOWING_QUERY_KEYS.all, 'preform-specs', { isActive }] as const,
  rateConfigs: (isActive?: boolean) =>
    [...BLOWING_QUERY_KEYS.all, 'rate-configs', { isActive }] as const,
  runs: (params?: RunListParams) => [...BLOWING_QUERY_KEYS.all, 'runs', params] as const,
  runDetail: (id: number) => [...BLOWING_QUERY_KEYS.all, 'run', id] as const,
  runCost: (id: number) => [...BLOWING_QUERY_KEYS.all, 'run-cost', id] as const,
  buyPrices: (isActive?: boolean, preformSpecId?: number) =>
    [...BLOWING_QUERY_KEYS.all, 'buy-prices', { isActive, preformSpecId }] as const,
  dailyReport: (date: string) => [...BLOWING_QUERY_KEYS.all, 'daily-report', date] as const,
  monthlyReport: (year: number, month: number) =>
    [...BLOWING_QUERY_KEYS.all, 'monthly-report', { year, month }] as const,
  makeVsBuy: (dateFrom: string, dateTo: string, preformSpecId?: number) =>
    [...BLOWING_QUERY_KEYS.all, 'make-vs-buy', { dateFrom, dateTo, preformSpecId }] as const,
  variances: (dateFrom: string, dateTo: string) =>
    [...BLOWING_QUERY_KEYS.all, 'variances', { dateFrom, dateTo }] as const,
  sapItems: (kind: string, search: string) =>
    [...BLOWING_QUERY_KEYS.all, 'sap-items', { kind, search }] as const,
};

// ---- Machines ----
export const useMachines = (isActive?: boolean) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.machines(isActive),
    queryFn: () => blowingApi.getMachines(isActive),
  });

const invalidateMachines = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'machines'] });
  qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'audit'] });
};

export const useCreateMachine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMachineRequest) => blowingApi.createMachine(data),
    onSuccess: () => invalidateMachines(qc),
  });
};

export const useUpdateMachine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateMachineRequest> & { is_active?: boolean } }) =>
      blowingApi.updateMachine(id, data),
    onSuccess: () => invalidateMachines(qc),
  });
};

// ---- Preform specs ----
export const usePreformSpecs = (isActive?: boolean) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.preformSpecs(isActive),
    queryFn: () => blowingApi.getPreformSpecs(isActive),
  });

const invalidatePreformSpecs = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'preform-specs'] });
  qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'audit'] });
};

export const useCreatePreformSpec = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePreformSpecRequest) => blowingApi.createPreformSpec(data),
    onSuccess: () => invalidatePreformSpecs(qc),
  });
};

export const useUpdatePreformSpec = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePreformSpecRequest> & { is_active?: boolean } }) =>
      blowingApi.updatePreformSpec(id, data),
    onSuccess: () => invalidatePreformSpecs(qc),
  });
};

// ---- Rate configs ----
export const useRateConfigs = (isActive?: boolean) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.rateConfigs(isActive),
    queryFn: () => blowingApi.getRateConfigs(isActive),
  });

export const useCreateRateConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRateConfigRequest) => blowingApi.createRateConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'rate-configs'] }),
  });
};

export const useUpdateRateConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateRateConfigRequest> & { is_active?: boolean } }) =>
      blowingApi.updateRateConfig(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'rate-configs'] }),
  });
};

// Cost rates are managed on the admin Cost Master page (/admin/cost-master).

// ---- Runs ----
export const useRuns = (params?: RunListParams) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.runs(params),
    queryFn: () => blowingApi.getRuns(params),
  });

export const useRun = (id: number | undefined) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.runDetail(id ?? 0),
    queryFn: () => blowingApi.getRun(id as number),
    enabled: !!id,
  });

export const useCreateRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRunRequest) => blowingApi.createRun(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'runs'] }),
  });
};

export const useUpdateRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRunRequest }) =>
      blowingApi.updateRun(id, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'runs'] });
      qc.invalidateQueries({ queryKey: BLOWING_QUERY_KEYS.runDetail(vars.id) });
    },
  });
};

export const useCompleteRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompleteRunRequest }) =>
      blowingApi.completeRun(id, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'runs'] });
      qc.invalidateQueries({ queryKey: BLOWING_QUERY_KEYS.runDetail(vars.id) });
    },
  });
};

// ---- Lifecycle ----
const useRunActionInvalidate = (runId: number) => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: BLOWING_QUERY_KEYS.runDetail(runId) });
    qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'runs'] });
  };
};

export const useStartProduction = (runId: number) => {
  const invalidate = useRunActionInvalidate(runId);
  return useMutation({ mutationFn: () => blowingApi.startProduction(runId), onSuccess: invalidate });
};

export const useStopProduction = (runId: number) => {
  const invalidate = useRunActionInvalidate(runId);
  return useMutation({
    mutationFn: (data: StopProductionRequest) => blowingApi.stopProduction(runId, data),
    onSuccess: invalidate,
  });
};

export const useAddBreakdown = (runId: number) => {
  const invalidate = useRunActionInvalidate(runId);
  return useMutation({
    mutationFn: (data: AddBreakdownRequest) => blowingApi.addBreakdown(runId, data),
    onSuccess: invalidate,
  });
};

export const useAddManualSegment = (runId: number) => {
  const invalidate = useRunActionInvalidate(runId);
  return useMutation({
    mutationFn: (data: AddManualSegmentRequest) => blowingApi.addManualSegment(runId, data),
    onSuccess: invalidate,
  });
};

export const useAddManualBreakdown = (runId: number) => {
  const invalidate = useRunActionInvalidate(runId);
  return useMutation({
    mutationFn: (data: AddManualBreakdownRequest) => blowingApi.addManualBreakdown(runId, data),
    onSuccess: invalidate,
  });
};

export const useResolveBreakdown = (runId: number) => {
  const invalidate = useRunActionInvalidate(runId);
  return useMutation({
    mutationFn: ({ breakdownId, data }: { breakdownId: number; data: ResolveBreakdownRequest }) =>
      blowingApi.resolveBreakdown(runId, breakdownId, data),
    onSuccess: invalidate,
  });
};

export const useBreakdownCategories = (isActive?: boolean) =>
  useQuery({
    queryKey: [...BLOWING_QUERY_KEYS.all, 'breakdown-categories', { isActive }],
    queryFn: () => blowingApi.getBreakdownCategories(isActive),
  });

export const useCreateBreakdownCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBreakdownCategoryRequest) => blowingApi.createBreakdownCategory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'breakdown-categories'] }),
  });
};

// ---- Preform request — raised into the Warehouse BOM-request queue ----
export const useSubmitPreformRequest = (runId: number) => {
  const invalidate = useRunActionInvalidate(runId);
  return useMutation({
    mutationFn: (remarks?: string) => blowingApi.submitPreformRequest(runId, remarks),
    onSuccess: invalidate,
  });
};

// ---- Buy prices (Phase 2) ----
export const useBuyPrices = (isActive?: boolean, preformSpecId?: number) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.buyPrices(isActive, preformSpecId),
    queryFn: () => blowingApi.getBuyPrices(isActive, preformSpecId),
  });

export const useCreateBuyPrice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBuyPriceRequest) => blowingApi.createBuyPrice(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'buy-prices'] }),
  });
};

export const useUpdateBuyPrice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateBuyPriceRequest> & { is_active?: boolean } }) =>
      blowingApi.updateBuyPrice(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...BLOWING_QUERY_KEYS.all, 'buy-prices'] }),
  });
};

// ---- Reports ----
export const useDailyReport = (date: string) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.dailyReport(date),
    queryFn: () => blowingApi.getDailyReport(date),
    enabled: !!date,
  });

export const useMonthlyReport = (year: number, month: number) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.monthlyReport(year, month),
    queryFn: () => blowingApi.getMonthlyReport(year, month),
    enabled: !!year && !!month,
  });

export const useMakeVsBuy = (dateFrom: string, dateTo: string, preformSpecId?: number) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.makeVsBuy(dateFrom, dateTo, preformSpecId),
    queryFn: () => blowingApi.getMakeVsBuy(dateFrom, dateTo, preformSpecId),
    enabled: !!dateFrom && !!dateTo,
  });

export const useVariances = (dateFrom: string, dateTo: string) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.variances(dateFrom, dateTo),
    queryFn: () => blowingApi.getVariances(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  });

// ---- Audit log ----
export const useAuditLogs = (entityType: string, entityId: number | undefined) =>
  useQuery({
    queryKey: [...BLOWING_QUERY_KEYS.all, 'audit', entityType, entityId ?? 0],
    queryFn: () => blowingApi.getAuditLogs(entityType, entityId as number),
    enabled: !!entityId,
  });

// ---- SAP item pickers ----
export const useSearchSAPItems = (kind: 'preform' | 'bottle', search: string) =>
  useQuery({
    queryKey: BLOWING_QUERY_KEYS.sapItems(kind, search),
    queryFn: () => blowingApi.searchSAPItems(kind, search),
    enabled: search.length >= 2,
  });
