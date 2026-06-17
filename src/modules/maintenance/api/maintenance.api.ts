import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AssetCategory,
  AssetCategoryPayload,
  AssetDepartment,
  AssetDepartmentPayload,
  AssetDocument,
  AssetDocumentUploadPayload,
  AssetLocation,
  AssetLocationPayload,
  AssetPhoto,
  AssetPhotoUploadPayload,
  MaintenanceAlertSendPayload,
  MaintenanceAlertSendResponse,
  MaintenanceAlertsResponse,
  MaintenanceAsset,
  MaintenanceAssetFilters,
  MaintenanceAssetPayload,
  MaintenanceAssetQrPayload,
  MaintenanceAssetQrResponse,
  MaintenanceChecklistTemplateItem,
  MaintenanceChecklistTemplateItemFilters,
  MaintenanceChecklistTemplateItemPayload,
  MaintenanceDashboardFilters,
  MaintenanceDashboardSummary,
  MaintenanceOptions,
  MaintenanceReportExportFormat,
  MaintenanceReportFilters,
  MaintenanceReportResponse,
  MaintenanceScanLookupResponse,
  MaintenanceScanWorkOrderPayload,
  MaintenanceSpare,
  MaintenanceSpareFilters,
  MaintenanceSparePayload,
  MaintenanceSpareStockFilters,
  MaintenanceSpareStockResponse,
  MaintenanceVendorVisit,
  MaintenanceVendorVisitFilters,
  MaintenanceVendorVisitPayload,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderApprovalPayload,
  MaintenanceWorkOrderAssignPayload,
  MaintenanceWorkOrderCompletePayload,
  MaintenanceWorkOrderFilters,
  MaintenanceWorkOrderPayload,
  MaintenanceWorkOrderPhoto,
  MaintenanceWorkOrderPhotoUploadPayload,
  MaintenanceWorkOrderStatusPayload,
  PMExecutionCompletePayload,
  PMExecutionSkipPayload,
  PMGenerateDuePayload,
  PMGenerateDueResponse,
  PreventiveMaintenanceExecution,
  PreventiveMaintenanceExecutionFilters,
  PreventiveMaintenancePlan,
  PreventiveMaintenancePlanFilters,
  PreventiveMaintenancePlanPayload,
  SpareCategory,
  SpareCategoryPayload,
  SpareIssuePayload,
  SpareMovement,
  SpareMovementFilters,
  SpareRequest,
  SpareRequestActionPayload,
  SpareRequestFilters,
  SpareRequestPayload,
  SpareStockAdjustPayload,
  WorkOrderSpareRequestPayload,
} from '../types';

const EP = API_ENDPOINTS.MAINTENANCE;

function cleanFilters(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL',
    ),
  );
}

function appendOptionalField(
  formData: FormData,
  key: string,
  value: string | boolean | null | undefined,
) {
  if (value === undefined || value === null || value === '') return;
  formData.append(key, String(value));
}

function appendOptionalNumber(formData: FormData, key: string, value: number | null | undefined) {
  if (value === undefined || value === null) return;
  formData.append(key, String(value));
}

export const maintenanceApi = {
  async getDashboard(filters?: MaintenanceDashboardFilters): Promise<MaintenanceDashboardSummary> {
    const params = cleanFilters(filters);
    const response = params
      ? await apiClient.get<MaintenanceDashboardSummary>(EP.DASHBOARD, { params })
      : await apiClient.get<MaintenanceDashboardSummary>(EP.DASHBOARD);
    return response.data;
  },

  async getReport(filters?: MaintenanceReportFilters): Promise<MaintenanceReportResponse> {
    const response = await apiClient.get<MaintenanceReportResponse>(EP.REPORTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async exportReport(
    filters: MaintenanceReportFilters,
    exportFormat: MaintenanceReportExportFormat,
  ): Promise<Blob> {
    const response = await apiClient.get<Blob>(EP.REPORTS, {
      params: cleanFilters({ ...filters, export: exportFormat }),
      responseType: 'blob',
    });
    return response.data;
  },

  async lookupScan(code: string): Promise<MaintenanceScanLookupResponse> {
    const response = await apiClient.get<MaintenanceScanLookupResponse>(EP.SCAN_LOOKUP, {
      params: { code },
    });
    return response.data;
  },

  async createWorkOrderFromScan(
    payload: MaintenanceScanWorkOrderPayload,
  ): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(EP.SCAN_WORK_ORDER, payload);
    return response.data;
  },

  async getSpareStock(
    filters: MaintenanceSpareStockFilters,
  ): Promise<MaintenanceSpareStockResponse> {
    const response = await apiClient.get<MaintenanceSpareStockResponse>(EP.SPARE_STOCK, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getAlerts(): Promise<MaintenanceAlertsResponse> {
    const response = await apiClient.get<MaintenanceAlertsResponse>(EP.ALERTS);
    return response.data;
  },

  async sendAlerts(payload: MaintenanceAlertSendPayload): Promise<MaintenanceAlertSendResponse> {
    const response = await apiClient.post<MaintenanceAlertSendResponse>(EP.ALERTS, payload);
    return response.data;
  },

  async getOptions(): Promise<MaintenanceOptions> {
    const response = await apiClient.get<MaintenanceOptions>(EP.OPTIONS);
    return response.data;
  },

  async getAssets(filters?: MaintenanceAssetFilters): Promise<MaintenanceAsset[]> {
    const response = await apiClient.get<MaintenanceAsset[]>(EP.ASSETS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getAsset(assetId: number): Promise<MaintenanceAsset> {
    const response = await apiClient.get<MaintenanceAsset>(EP.ASSET_DETAIL(assetId));
    return response.data;
  },

  async createAsset(payload: MaintenanceAssetPayload): Promise<MaintenanceAsset> {
    const response = await apiClient.post<MaintenanceAsset>(EP.ASSETS, payload);
    return response.data;
  },

  async updateAsset(assetId: number, payload: MaintenanceAssetPayload): Promise<MaintenanceAsset> {
    const response = await apiClient.put<MaintenanceAsset>(EP.ASSET_DETAIL(assetId), payload);
    return response.data;
  },

  async deactivateAsset(assetId: number): Promise<MaintenanceAsset> {
    const response = await apiClient.post<MaintenanceAsset>(EP.ASSET_DEACTIVATE(assetId));
    return response.data;
  },

  async getAssetQr(assetId: number): Promise<MaintenanceAssetQrResponse> {
    const response = await apiClient.get<MaintenanceAssetQrResponse>(EP.ASSET_QR(assetId));
    return response.data;
  },

  async assignAssetQr(
    assetId: number,
    payload: MaintenanceAssetQrPayload,
  ): Promise<MaintenanceAssetQrResponse> {
    const response = await apiClient.post<MaintenanceAssetQrResponse>(
      EP.ASSET_QR(assetId),
      payload,
    );
    return response.data;
  },

  async getAssetPhotos(assetId: number): Promise<AssetPhoto[]> {
    const response = await apiClient.get<AssetPhoto[]>(EP.ASSET_PHOTOS, {
      params: { asset: assetId },
    });
    return response.data;
  },

  async uploadAssetPhoto(payload: AssetPhotoUploadPayload): Promise<AssetPhoto> {
    const formData = new FormData();
    formData.append('asset', String(payload.asset));
    formData.append('photo', payload.file);
    appendOptionalField(formData, 'caption', payload.caption?.trim());
    appendOptionalField(formData, 'taken_on', payload.taken_on);
    appendOptionalField(formData, 'is_monthly_photo', payload.is_monthly_photo ?? true);

    const response = await apiClient.post<AssetPhoto>(EP.ASSET_PHOTOS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getAssetDocuments(assetId: number): Promise<AssetDocument[]> {
    const response = await apiClient.get<AssetDocument[]>(EP.ASSET_DOCUMENTS, {
      params: { asset: assetId },
    });
    return response.data;
  },

  async uploadAssetDocument(payload: AssetDocumentUploadPayload): Promise<AssetDocument> {
    const formData = new FormData();
    formData.append('asset', String(payload.asset));
    formData.append('document_type', payload.document_type);
    formData.append('title', payload.title.trim());
    formData.append('document', payload.file);
    appendOptionalField(formData, 'document_date', payload.document_date);
    appendOptionalField(formData, 'notes', payload.notes?.trim());

    const response = await apiClient.post<AssetDocument>(EP.ASSET_DOCUMENTS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getWorkOrders(filters?: MaintenanceWorkOrderFilters): Promise<MaintenanceWorkOrder[]> {
    const response = await apiClient.get<MaintenanceWorkOrder[]>(EP.WORK_ORDERS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getWorkOrder(workOrderId: number): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.get<MaintenanceWorkOrder>(EP.WORK_ORDER_DETAIL(workOrderId));
    return response.data;
  },

  async createWorkOrder(payload: MaintenanceWorkOrderPayload): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(EP.WORK_ORDERS, payload);
    return response.data;
  },

  async updateWorkOrder(
    workOrderId: number,
    payload: MaintenanceWorkOrderPayload,
  ): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.put<MaintenanceWorkOrder>(
      EP.WORK_ORDER_DETAIL(workOrderId),
      payload,
    );
    return response.data;
  },

  async assignWorkOrder(
    workOrderId: number,
    payload: MaintenanceWorkOrderAssignPayload,
  ): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(
      EP.WORK_ORDER_ASSIGN(workOrderId),
      payload,
    );
    return response.data;
  },

  async startWorkOrder(workOrderId: number): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(EP.WORK_ORDER_START(workOrderId));
    return response.data;
  },

  async completeWorkOrder(
    workOrderId: number,
    payload: MaintenanceWorkOrderCompletePayload,
  ): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(
      EP.WORK_ORDER_COMPLETE(workOrderId),
      payload,
    );
    return response.data;
  },

  async approveWorkOrder(
    workOrderId: number,
    payload: MaintenanceWorkOrderApprovalPayload,
  ): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(
      EP.WORK_ORDER_APPROVE(workOrderId),
      payload,
    );
    return response.data;
  },

  async closeWorkOrder(workOrderId: number): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(EP.WORK_ORDER_CLOSE(workOrderId));
    return response.data;
  },

  async setWorkOrderStatus(
    workOrderId: number,
    payload: MaintenanceWorkOrderStatusPayload,
  ): Promise<MaintenanceWorkOrder> {
    const response = await apiClient.post<MaintenanceWorkOrder>(
      EP.WORK_ORDER_SET_STATUS(workOrderId),
      payload,
    );
    return response.data;
  },

  async getWorkOrderPhotos(workOrderId: number): Promise<MaintenanceWorkOrderPhoto[]> {
    const response = await apiClient.get<MaintenanceWorkOrderPhoto[]>(EP.WORK_ORDER_PHOTOS, {
      params: { work_order: workOrderId },
    });
    return response.data;
  },

  async uploadWorkOrderPhoto(
    payload: MaintenanceWorkOrderPhotoUploadPayload,
  ): Promise<MaintenanceWorkOrderPhoto> {
    const formData = new FormData();
    formData.append('work_order', String(payload.work_order));
    formData.append('photo_type', payload.photo_type);
    formData.append('photo', payload.file);
    appendOptionalField(formData, 'caption', payload.caption?.trim());
    appendOptionalField(formData, 'taken_on', payload.taken_on);

    const response = await apiClient.post<MaintenanceWorkOrderPhoto>(
      EP.WORK_ORDER_PHOTOS,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  async getPMPlans(
    filters?: PreventiveMaintenancePlanFilters,
  ): Promise<PreventiveMaintenancePlan[]> {
    const response = await apiClient.get<PreventiveMaintenancePlan[]>(EP.PM_PLANS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createPMPlan(
    payload: PreventiveMaintenancePlanPayload,
  ): Promise<PreventiveMaintenancePlan> {
    const response = await apiClient.post<PreventiveMaintenancePlan>(EP.PM_PLANS, payload);
    return response.data;
  },

  async updatePMPlan(
    planId: number,
    payload: PreventiveMaintenancePlanPayload,
  ): Promise<PreventiveMaintenancePlan> {
    const response = await apiClient.put<PreventiveMaintenancePlan>(
      EP.PM_PLAN_DETAIL(planId),
      payload,
    );
    return response.data;
  },

  async generatePMPlan(
    planId: number,
    payload?: PMGenerateDuePayload,
  ): Promise<PMGenerateDueResponse> {
    const response = await apiClient.post<PMGenerateDueResponse>(
      EP.PM_PLAN_GENERATE(planId),
      payload ?? {},
    );
    return response.data;
  },

  async generateDuePM(payload?: PMGenerateDuePayload): Promise<PMGenerateDueResponse> {
    const response = await apiClient.post<PMGenerateDueResponse>(
      EP.PM_PLANS_GENERATE_DUE,
      payload ?? {},
    );
    return response.data;
  },

  async getPMChecklistItems(
    filters?: MaintenanceChecklistTemplateItemFilters,
  ): Promise<MaintenanceChecklistTemplateItem[]> {
    const response = await apiClient.get<MaintenanceChecklistTemplateItem[]>(
      EP.PM_CHECKLIST_ITEMS,
      {
        params: cleanFilters(filters),
      },
    );
    return response.data;
  },

  async createPMChecklistItem(
    payload: MaintenanceChecklistTemplateItemPayload,
  ): Promise<MaintenanceChecklistTemplateItem> {
    const response = await apiClient.post<MaintenanceChecklistTemplateItem>(
      EP.PM_CHECKLIST_ITEMS,
      payload,
    );
    return response.data;
  },

  async updatePMChecklistItem(
    itemId: number,
    payload: MaintenanceChecklistTemplateItemPayload,
  ): Promise<MaintenanceChecklistTemplateItem> {
    const response = await apiClient.put<MaintenanceChecklistTemplateItem>(
      EP.PM_CHECKLIST_ITEM_DETAIL(itemId),
      payload,
    );
    return response.data;
  },

  async getPMExecutions(
    filters?: PreventiveMaintenanceExecutionFilters,
  ): Promise<PreventiveMaintenanceExecution[]> {
    const response = await apiClient.get<PreventiveMaintenanceExecution[]>(EP.PM_EXECUTIONS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async startPMExecution(executionId: number): Promise<PreventiveMaintenanceExecution> {
    const response = await apiClient.post<PreventiveMaintenanceExecution>(
      EP.PM_EXECUTION_START(executionId),
    );
    return response.data;
  },

  async completePMExecution(
    executionId: number,
    payload: PMExecutionCompletePayload,
  ): Promise<PreventiveMaintenanceExecution> {
    const response = await apiClient.post<PreventiveMaintenanceExecution>(
      EP.PM_EXECUTION_COMPLETE(executionId),
      payload,
    );
    return response.data;
  },

  async skipPMExecution(
    executionId: number,
    payload: PMExecutionSkipPayload,
  ): Promise<PreventiveMaintenanceExecution> {
    const response = await apiClient.post<PreventiveMaintenanceExecution>(
      EP.PM_EXECUTION_SKIP(executionId),
      payload,
    );
    return response.data;
  },

  async getSpares(filters?: MaintenanceSpareFilters): Promise<MaintenanceSpare[]> {
    const response = await apiClient.get<MaintenanceSpare[]>(EP.SPARES, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getSpare(spareId: number): Promise<MaintenanceSpare> {
    const response = await apiClient.get<MaintenanceSpare>(EP.SPARE_DETAIL(spareId));
    return response.data;
  },

  async createSpare(payload: MaintenanceSparePayload): Promise<MaintenanceSpare> {
    const response = await apiClient.post<MaintenanceSpare>(EP.SPARES, payload);
    return response.data;
  },

  async updateSpare(spareId: number, payload: MaintenanceSparePayload): Promise<MaintenanceSpare> {
    const response = await apiClient.put<MaintenanceSpare>(EP.SPARE_DETAIL(spareId), payload);
    return response.data;
  },

  async adjustSpareStock(
    spareId: number,
    payload: SpareStockAdjustPayload,
  ): Promise<MaintenanceSpare> {
    const response = await apiClient.post<MaintenanceSpare>(
      EP.SPARE_ADJUST_STOCK(spareId),
      payload,
    );
    return response.data;
  },

  async getLowStockSpares(filters?: MaintenanceSpareFilters): Promise<MaintenanceSpare[]> {
    const response = await apiClient.get<MaintenanceSpare[]>(EP.SPARES_LOW_STOCK, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createSpareCategory(payload: SpareCategoryPayload): Promise<SpareCategory> {
    const response = await apiClient.post<SpareCategory>(EP.SPARE_CATEGORIES, payload);
    return response.data;
  },

  async updateSpareCategory(
    categoryId: number,
    payload: SpareCategoryPayload,
  ): Promise<SpareCategory> {
    const response = await apiClient.put<SpareCategory>(
      EP.SPARE_CATEGORY_DETAIL(categoryId),
      payload,
    );
    return response.data;
  },

  async getSpareRequests(filters?: SpareRequestFilters): Promise<SpareRequest[]> {
    const response = await apiClient.get<SpareRequest[]>(EP.SPARE_REQUESTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createSpareRequest(payload: SpareRequestPayload): Promise<SpareRequest> {
    const response = await apiClient.post<SpareRequest>(EP.SPARE_REQUESTS, payload);
    return response.data;
  },

  async requestWorkOrderSpare(
    workOrderId: number,
    payload: WorkOrderSpareRequestPayload,
  ): Promise<SpareRequest> {
    const response = await apiClient.post<SpareRequest>(
      EP.WORK_ORDER_REQUEST_SPARE(workOrderId),
      payload,
    );
    return response.data;
  },

  async issueSpareRequest(requestId: number, payload: SpareIssuePayload): Promise<SpareRequest> {
    const response = await apiClient.post<SpareRequest>(EP.SPARE_REQUEST_ISSUE(requestId), payload);
    return response.data;
  },

  async consumeSpareRequest(
    requestId: number,
    payload: SpareRequestActionPayload,
  ): Promise<SpareRequest> {
    const response = await apiClient.post<SpareRequest>(
      EP.SPARE_REQUEST_CONSUME(requestId),
      payload,
    );
    return response.data;
  },

  async returnUnusedSpareRequest(
    requestId: number,
    payload: SpareRequestActionPayload,
  ): Promise<SpareRequest> {
    const response = await apiClient.post<SpareRequest>(
      EP.SPARE_REQUEST_RETURN_UNUSED(requestId),
      payload,
    );
    return response.data;
  },

  async cancelSpareRequest(requestId: number): Promise<SpareRequest> {
    const response = await apiClient.post<SpareRequest>(EP.SPARE_REQUEST_CANCEL(requestId));
    return response.data;
  },

  async getSpareMovements(filters?: SpareMovementFilters): Promise<SpareMovement[]> {
    const response = await apiClient.get<SpareMovement[]>(EP.SPARE_MOVEMENTS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async getVendorVisits(
    filters?: MaintenanceVendorVisitFilters,
  ): Promise<MaintenanceVendorVisit[]> {
    const response = await apiClient.get<MaintenanceVendorVisit[]>(EP.VENDOR_VISITS, {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  async createVendorVisit(payload: MaintenanceVendorVisitPayload): Promise<MaintenanceVendorVisit> {
    const formData = new FormData();
    formData.append('work_order', String(payload.work_order));
    appendOptionalNumber(formData, 'asset', payload.asset);
    appendOptionalField(formData, 'vendor_code', payload.vendor_code?.trim());
    formData.append('vendor_name', payload.vendor_name.trim());
    appendOptionalField(formData, 'contact_person', payload.contact_person?.trim());
    appendOptionalField(formData, 'contact_phone', payload.contact_phone?.trim());
    appendOptionalField(formData, 'status', payload.status);
    appendOptionalField(formData, 'planned_start', payload.planned_start);
    appendOptionalField(formData, 'planned_end', payload.planned_end);
    appendOptionalField(formData, 'actual_start', payload.actual_start);
    appendOptionalField(formData, 'actual_end', payload.actual_end);
    appendOptionalNumber(formData, 'person_gate_entry', payload.person_gate_entry);
    appendOptionalNumber(formData, 'material_gate_entry', payload.material_gate_entry);
    appendOptionalField(formData, 'invoice_number', payload.invoice_number?.trim());
    appendOptionalField(formData, 'remarks', payload.remarks?.trim());
    if (payload.service_report_attachment) {
      formData.append('service_report_attachment', payload.service_report_attachment);
    }
    if (payload.invoice_attachment) {
      formData.append('invoice_attachment', payload.invoice_attachment);
    }

    const response = await apiClient.post<MaintenanceVendorVisit>(EP.VENDOR_VISITS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async startVendorVisit(visitId: number): Promise<MaintenanceVendorVisit> {
    const response = await apiClient.post<MaintenanceVendorVisit>(EP.VENDOR_VISIT_START(visitId));
    return response.data;
  },

  async completeVendorVisit(visitId: number): Promise<MaintenanceVendorVisit> {
    const response = await apiClient.post<MaintenanceVendorVisit>(
      EP.VENDOR_VISIT_COMPLETE(visitId),
    );
    return response.data;
  },

  async cancelVendorVisit(visitId: number): Promise<MaintenanceVendorVisit> {
    const response = await apiClient.post<MaintenanceVendorVisit>(EP.VENDOR_VISIT_CANCEL(visitId));
    return response.data;
  },

  async createCategory(payload: AssetCategoryPayload): Promise<AssetCategory> {
    const response = await apiClient.post<AssetCategory>(EP.ASSET_CATEGORIES, payload);
    return response.data;
  },

  async updateCategory(categoryId: number, payload: AssetCategoryPayload): Promise<AssetCategory> {
    const response = await apiClient.put<AssetCategory>(
      EP.ASSET_CATEGORY_DETAIL(categoryId),
      payload,
    );
    return response.data;
  },

  async createLocation(payload: AssetLocationPayload): Promise<AssetLocation> {
    const response = await apiClient.post<AssetLocation>(EP.ASSET_LOCATIONS, payload);
    return response.data;
  },

  async updateLocation(locationId: number, payload: AssetLocationPayload): Promise<AssetLocation> {
    const response = await apiClient.put<AssetLocation>(
      EP.ASSET_LOCATION_DETAIL(locationId),
      payload,
    );
    return response.data;
  },

  async createDepartment(payload: AssetDepartmentPayload): Promise<AssetDepartment> {
    const response = await apiClient.post<AssetDepartment>(EP.ASSET_DEPARTMENTS, payload);
    return response.data;
  },

  async updateDepartment(
    departmentId: number,
    payload: AssetDepartmentPayload,
  ): Promise<AssetDepartment> {
    const response = await apiClient.put<AssetDepartment>(
      EP.ASSET_DEPARTMENT_DETAIL(departmentId),
      payload,
    );
    return response.data;
  },
};
