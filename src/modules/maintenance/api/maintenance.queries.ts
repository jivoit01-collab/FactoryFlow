import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AssetCategoryPayload,
  AssetDepartmentPayload,
  AssetDocumentUploadPayload,
  AssetLocationPayload,
  AssetPhotoUploadPayload,
  MaintenanceAlertSendPayload,
  MaintenanceAssetFilters,
  MaintenanceAssetPayload,
  MaintenanceAssetQrPayload,
  MaintenanceChecklistTemplateItemFilters,
  MaintenanceChecklistTemplateItemPayload,
  MaintenanceDashboardFilters,
  MaintenanceReportFilters,
  MaintenanceScanWorkOrderPayload,
  MaintenanceSpareFilters,
  MaintenanceSparePayload,
  MaintenanceSpareStockFilters,
  MaintenanceVendorVisitFilters,
  MaintenanceVendorVisitPayload,
  MaintenanceWorkOrderApprovalPayload,
  MaintenanceWorkOrderAssignPayload,
  MaintenanceWorkOrderCompletePayload,
  MaintenanceWorkOrderFilters,
  MaintenanceWorkOrderPayload,
  MaintenanceWorkOrderPhotoUploadPayload,
  MaintenanceWorkOrderSendBackPayload,
  MaintenanceWorkOrderStatusPayload,
  OrgDepartmentPayload,
  PMExecutionCompletePayload,
  PMExecutionSkipPayload,
  PMGenerateDuePayload,
  PreventiveMaintenanceExecutionFilters,
  PreventiveMaintenancePlanFilters,
  PreventiveMaintenancePlanPayload,
  SpareCategoryPayload,
  SpareIssuePayload,
  SpareMovementFilters,
  SpareRequestActionPayload,
  SpareRequestFilters,
  SpareRequestPayload,
  SpareStockAdjustPayload,
  StagedAssetDocument,
  WorkOrderSpareRequestPayload,
} from '../types';
import { maintenanceApi } from './maintenance.api';

export const MAINTENANCE_QUERY_KEYS = {
  all: ['maintenance'] as const,
  dashboard: (filters?: MaintenanceDashboardFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'dashboard', filters ?? {}] as const,
  reports: (filters?: MaintenanceReportFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'reports', filters ?? {}] as const,
  scanLookup: (code?: string) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'scan-lookup', code ?? ''] as const,
  spareStock: (filters?: MaintenanceSpareStockFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'spare-stock', filters ?? {}] as const,
  alerts: () => [...MAINTENANCE_QUERY_KEYS.all, 'alerts'] as const,
  options: () => [...MAINTENANCE_QUERY_KEYS.all, 'options'] as const,
  assets: (filters?: MaintenanceAssetFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'assets', filters ?? {}] as const,
  asset: (assetId: number) => [...MAINTENANCE_QUERY_KEYS.all, 'asset', assetId] as const,
  assetPhotos: (assetId: number) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'asset-photos', assetId] as const,
  assetDocuments: (assetId: number) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'asset-documents', assetId] as const,
  workOrders: (filters?: MaintenanceWorkOrderFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'work-orders', filters ?? {}] as const,
  workOrder: (workOrderId: number) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'work-order', workOrderId] as const,
  workOrderPhotos: (workOrderId: number) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'work-order-photos', workOrderId] as const,
  workOrderLogs: (workOrderId: number) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'work-order-logs', workOrderId] as const,
  pmPlans: (filters?: PreventiveMaintenancePlanFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'pm-plans', filters ?? {}] as const,
  pmChecklistItems: (filters?: MaintenanceChecklistTemplateItemFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'pm-checklist-items', filters ?? {}] as const,
  pmExecutions: (filters?: PreventiveMaintenanceExecutionFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'pm-executions', filters ?? {}] as const,
  spares: (filters?: MaintenanceSpareFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'spares', filters ?? {}] as const,
  spare: (spareId: number) => [...MAINTENANCE_QUERY_KEYS.all, 'spare', spareId] as const,
  lowStockSpares: (filters?: MaintenanceSpareFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'low-stock-spares', filters ?? {}] as const,
  spareRequests: (filters?: SpareRequestFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'spare-requests', filters ?? {}] as const,
  spareMovements: (filters?: SpareMovementFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'spare-movements', filters ?? {}] as const,
  vendorVisits: (filters?: MaintenanceVendorVisitFilters) =>
    [...MAINTENANCE_QUERY_KEYS.all, 'vendor-visits', filters ?? {}] as const,
};

export function useMaintenanceDashboard(filters?: MaintenanceDashboardFilters) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.dashboard(filters),
    queryFn: () => maintenanceApi.getDashboard(filters),
  });
}

export function useMaintenanceReport(filters?: MaintenanceReportFilters) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.reports(filters),
    queryFn: () => maintenanceApi.getReport(filters),
  });
}

export function useMaintenanceScanLookup(code: string, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.scanLookup(code),
    queryFn: () => maintenanceApi.lookupScan(code),
    enabled: enabled && code.trim().length > 0,
    retry: false,
  });
}

export function useMaintenanceSpareStock(filters?: MaintenanceSpareStockFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.spareStock(filters),
    queryFn: () => maintenanceApi.getSpareStock(filters ?? {}),
    enabled: enabled && Boolean(filters?.spare || filters?.code),
  });
}

export function useMaintenanceAlerts() {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.alerts(),
    queryFn: maintenanceApi.getAlerts,
  });
}

export function useMaintenanceOptions() {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.options(),
    queryFn: maintenanceApi.getOptions,
  });
}

export function useMaintenanceAssets(filters?: MaintenanceAssetFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.assets(filters),
    queryFn: () => maintenanceApi.getAssets(filters),
    enabled,
  });
}

export function useMaintenanceAsset(assetId: number | null) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.asset(assetId!),
    queryFn: () => maintenanceApi.getAsset(assetId!),
    enabled: assetId !== null,
  });
}

export function useAssetPhotos(assetId: number | null) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.assetPhotos(assetId!),
    queryFn: () => maintenanceApi.getAssetPhotos(assetId!),
    enabled: assetId !== null,
  });
}

export function useAssetDocuments(assetId: number | null) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.assetDocuments(assetId!),
    queryFn: () => maintenanceApi.getAssetDocuments(assetId!),
    enabled: assetId !== null,
  });
}

export function useMaintenanceWorkOrders(filters?: MaintenanceWorkOrderFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.workOrders(filters),
    queryFn: () => maintenanceApi.getWorkOrders(filters),
    enabled,
  });
}

export function useMaintenanceWorkOrder(workOrderId: number | null) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.workOrder(workOrderId!),
    queryFn: () => maintenanceApi.getWorkOrder(workOrderId!),
    enabled: workOrderId !== null,
  });
}

export function useWorkOrderPhotos(workOrderId: number | null) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.workOrderPhotos(workOrderId!),
    queryFn: () => maintenanceApi.getWorkOrderPhotos(workOrderId!),
    enabled: workOrderId !== null,
  });
}

/** The hand-off trail: assigned, started, completed, sent back, verified. */
export function useWorkOrderLogs(workOrderId: number | null) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.workOrderLogs(workOrderId!),
    queryFn: () => maintenanceApi.getWorkOrderLogs(workOrderId!),
    enabled: workOrderId !== null,
  });
}

export function usePMPlans(filters?: PreventiveMaintenancePlanFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.pmPlans(filters),
    queryFn: () => maintenanceApi.getPMPlans(filters),
    enabled,
  });
}

export function usePMChecklistItems(
  filters?: MaintenanceChecklistTemplateItemFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.pmChecklistItems(filters),
    queryFn: () => maintenanceApi.getPMChecklistItems(filters),
    enabled,
  });
}

export function usePMExecutions(filters?: PreventiveMaintenanceExecutionFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.pmExecutions(filters),
    queryFn: () => maintenanceApi.getPMExecutions(filters),
    enabled,
  });
}

export function useMaintenanceSpares(filters?: MaintenanceSpareFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.spares(filters),
    queryFn: () => maintenanceApi.getSpares(filters),
    enabled,
  });
}

export function useMaintenanceSpare(spareId: number | null) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.spare(spareId!),
    queryFn: () => maintenanceApi.getSpare(spareId!),
    enabled: spareId !== null,
  });
}

export function useLowStockSpares(filters?: MaintenanceSpareFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.lowStockSpares(filters),
    queryFn: () => maintenanceApi.getLowStockSpares(filters),
    enabled,
  });
}

export function useSpareRequests(filters?: SpareRequestFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.spareRequests(filters),
    queryFn: () => maintenanceApi.getSpareRequests(filters),
    enabled,
  });
}

export function useSpareMovements(filters?: SpareMovementFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.spareMovements(filters),
    queryFn: () => maintenanceApi.getSpareMovements(filters),
    enabled,
  });
}

export function useVendorVisits(filters?: MaintenanceVendorVisitFilters, enabled = true) {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEYS.vendorVisits(filters),
    queryFn: () => maintenanceApi.getVendorVisits(filters),
    enabled,
  });
}

function invalidateMaintenance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.all });
}

export function useCreateMaintenanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceAssetPayload) => maintenanceApi.createAsset(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateMaintenanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, payload }: { assetId: number; payload: MaintenanceAssetPayload }) =>
      maintenanceApi.updateAsset(assetId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useDeactivateMaintenanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) => maintenanceApi.deactivateAsset(assetId),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useAssignMaintenanceAssetQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, payload }: { assetId: number; payload: MaintenanceAssetQrPayload }) =>
      maintenanceApi.assignAssetQr(assetId, payload),
    onSuccess: (_qr, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.asset(variables.assetId) });
    },
  });
}

export function useCreateWorkOrderFromScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceScanWorkOrderPayload) =>
      maintenanceApi.createWorkOrderFromScan(payload),
    onSuccess: (workOrder) => {
      invalidateMaintenance(queryClient);
      if (workOrder.asset) {
        queryClient.invalidateQueries({
          queryKey: MAINTENANCE_QUERY_KEYS.asset(workOrder.asset),
        });
      }
    },
  });
}

export function useSendMaintenanceAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceAlertSendPayload) => maintenanceApi.sendAlerts(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.alerts() });
    },
  });
}

export function useUploadAssetPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssetPhotoUploadPayload) => maintenanceApi.uploadAssetPhoto(payload),
    onSuccess: (_photo, payload) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.assetPhotos(payload.asset),
      });
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.asset(payload.asset) });
    },
  });
}

export function useUploadAssetDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssetDocumentUploadPayload) =>
      maintenanceApi.uploadAssetDocument(payload),
    onSuccess: (_document, payload) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.assetDocuments(payload.asset),
      });
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.asset(payload.asset) });
    },
  });
}

/** Pushes the files staged in the asset form once the asset has been saved. */
export function useUploadAssetDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, staged }: { assetId: number; staged: StagedAssetDocument[] }) =>
      maintenanceApi.uploadAssetDocuments(assetId, staged),
    onSuccess: (_documents, { assetId }) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.assetDocuments(assetId),
      });
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.asset(assetId) });
    },
  });
}

export function useCreateMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceWorkOrderPayload) => maintenanceApi.createWorkOrder(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: number;
      payload: MaintenanceWorkOrderPayload;
    }) => maintenanceApi.updateWorkOrder(workOrderId, payload),
    onSuccess: (_workOrder, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrder(variables.workOrderId),
      });
    },
  });
}

export function useAssignMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: number;
      payload: MaintenanceWorkOrderAssignPayload;
    }) => maintenanceApi.assignWorkOrder(workOrderId, payload),
    onSuccess: (_workOrder, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrder(variables.workOrderId),
      });
    },
  });
}

export function useStartMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: number) => maintenanceApi.startWorkOrder(workOrderId),
    onSuccess: (_workOrder, workOrderId) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.workOrder(workOrderId) });
    },
  });
}

export function useCompleteMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: number;
      payload: MaintenanceWorkOrderCompletePayload;
    }) => maintenanceApi.completeWorkOrder(workOrderId, payload),
    onSuccess: (_workOrder, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrder(variables.workOrderId),
      });
    },
  });
}

export function useApproveMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: number;
      payload: MaintenanceWorkOrderApprovalPayload;
    }) => maintenanceApi.approveWorkOrder(workOrderId, payload),
    onSuccess: (_workOrder, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrder(variables.workOrderId),
      });
    },
  });
}

export function useCloseMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: number) => maintenanceApi.closeWorkOrder(workOrderId),
    onSuccess: (_workOrder, workOrderId) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.workOrder(workOrderId) });
    },
  });
}

/** The raiser rejects the work; it goes back to the technician with a reason. */
export function useSendBackMaintenanceWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: number;
      payload: MaintenanceWorkOrderSendBackPayload;
    }) => maintenanceApi.sendBackWorkOrder(workOrderId, payload),
    onSuccess: (_workOrder, { workOrderId }) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.workOrder(workOrderId) });
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrderLogs(workOrderId),
      });
    },
  });
}

export function useSetMaintenanceWorkOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: number;
      payload: MaintenanceWorkOrderStatusPayload;
    }) => maintenanceApi.setWorkOrderStatus(workOrderId, payload),
    onSuccess: (_workOrder, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrder(variables.workOrderId),
      });
    },
  });
}

export function useUploadWorkOrderPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceWorkOrderPhotoUploadPayload) =>
      maintenanceApi.uploadWorkOrderPhoto(payload),
    onSuccess: (_photo, payload) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrderPhotos(payload.work_order),
      });
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrder(payload.work_order),
      });
    },
  });
}

export function useCreatePMPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PreventiveMaintenancePlanPayload) => maintenanceApi.createPMPlan(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdatePMPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      payload,
    }: {
      planId: number;
      payload: PreventiveMaintenancePlanPayload;
    }) => maintenanceApi.updatePMPlan(planId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useGeneratePMPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, payload }: { planId: number; payload?: PMGenerateDuePayload }) =>
      maintenanceApi.generatePMPlan(planId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useGenerateDuePM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: PMGenerateDuePayload) => maintenanceApi.generateDuePM(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCreatePMChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceChecklistTemplateItemPayload) =>
      maintenanceApi.createPMChecklistItem(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdatePMChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: number;
      payload: MaintenanceChecklistTemplateItemPayload;
    }) => maintenanceApi.updatePMChecklistItem(itemId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useStartPMExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (executionId: number) => maintenanceApi.startPMExecution(executionId),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCompletePMExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      executionId,
      payload,
    }: {
      executionId: number;
      payload: PMExecutionCompletePayload;
    }) => maintenanceApi.completePMExecution(executionId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useSkipPMExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      executionId,
      payload,
    }: {
      executionId: number;
      payload: PMExecutionSkipPayload;
    }) => maintenanceApi.skipPMExecution(executionId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCreateMaintenanceSpare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceSparePayload) => maintenanceApi.createSpare(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateMaintenanceSpare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spareId, payload }: { spareId: number; payload: MaintenanceSparePayload }) =>
      maintenanceApi.updateSpare(spareId, payload),
    onSuccess: (_spare, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.spare(variables.spareId) });
    },
  });
}

export function useAdjustSpareStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spareId, payload }: { spareId: number; payload: SpareStockAdjustPayload }) =>
      maintenanceApi.adjustSpareStock(spareId, payload),
    onSuccess: (_spare, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEYS.spare(variables.spareId) });
    },
  });
}

export function useCreateSpareCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SpareCategoryPayload) => maintenanceApi.createSpareCategory(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateSpareCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SpareCategoryPayload }) =>
      maintenanceApi.updateSpareCategory(id, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCreateSpareRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SpareRequestPayload) => maintenanceApi.createSpareRequest(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useRequestWorkOrderSpare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: number;
      payload: WorkOrderSpareRequestPayload;
    }) => maintenanceApi.requestWorkOrderSpare(workOrderId, payload),
    onSuccess: (_spareRequest, variables) => {
      invalidateMaintenance(queryClient);
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_QUERY_KEYS.workOrder(variables.workOrderId),
      });
    },
  });
}

export function useIssueSpareRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: number; payload: SpareIssuePayload }) =>
      maintenanceApi.issueSpareRequest(requestId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useConsumeSpareRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload: SpareRequestActionPayload;
    }) => maintenanceApi.consumeSpareRequest(requestId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useReturnUnusedSpareRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload: SpareRequestActionPayload;
    }) => maintenanceApi.returnUnusedSpareRequest(requestId, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCancelSpareRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => maintenanceApi.cancelSpareRequest(requestId),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCreateVendorVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceVendorVisitPayload) =>
      maintenanceApi.createVendorVisit(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useStartVendorVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitId: number) => maintenanceApi.startVendorVisit(visitId),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCompleteVendorVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitId: number) => maintenanceApi.completeVendorVisit(visitId),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCancelVendorVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitId: number) => maintenanceApi.cancelVendorVisit(visitId),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssetCategoryPayload) => maintenanceApi.createCategory(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssetCategoryPayload }) =>
      maintenanceApi.updateCategory(id, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCreateAssetLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssetLocationPayload) => maintenanceApi.createLocation(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateAssetLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssetLocationPayload }) =>
      maintenanceApi.updateLocation(id, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useCreateAssetDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssetDepartmentPayload) => maintenanceApi.createDepartment(payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

export function useUpdateAssetDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssetDepartmentPayload }) =>
      maintenanceApi.updateDepartment(id, payload),
    onSuccess: () => invalidateMaintenance(queryClient),
  });
}

// Global org department (accounts.Department) used by assets/work orders.
export function useCreateOrgDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrgDepartmentPayload) => maintenanceApi.createOrgDepartment(payload),
    onSuccess: () => {
      invalidateMaintenance(queryClient);
      // Refresh the shared accounts-department list used elsewhere (e.g. gate).
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}
