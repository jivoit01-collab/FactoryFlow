import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  AssignBayRequest,
  BOLData,
  DashboardData,
  DispatchRequest,
  GoodsIssuePosting,
  InspectTrailerRequest,
  LinkVehicleRequest,
  LoadRequest,
  PickTask,
  PickTaskUpdateRequest,
  RetryGoodsIssueRequest,
  ScanRequest,
  ShipmentFilters,
  ShipmentOrder,
  ShipmentOrderListItem,
  SyncFilters,
  SyncResult,
} from '../types/dispatch.types';

export const dispatchApi = {
  // List shipments with optional filters
  async getShipments(filters?: ShipmentFilters): Promise<ShipmentOrderListItem[]> {
    const response = await apiClient.get<ShipmentOrderListItem[]>(
      API_ENDPOINTS.OUTBOUND.SHIPMENTS,
      { params: filters },
    );
    return response.data;
  },

  // Get shipment detail
  async getShipmentDetail(id: number): Promise<ShipmentOrder> {
    const response = await apiClient.get<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.SHIPMENT_DETAIL(id),
    );
    return response.data;
  },

  // Sync shipments from SAP
  async syncShipments(filters?: SyncFilters): Promise<SyncResult> {
    const response = await apiClient.post<SyncResult>(
      API_ENDPOINTS.OUTBOUND.SYNC,
      filters ?? {},
    );
    return response.data;
  },

  // Assign dock bay
  async assignBay(shipmentId: number, data: AssignBayRequest): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.ASSIGN_BAY(shipmentId),
      data,
    );
    return response.data;
  },

  // Get pick tasks for a shipment
  async getPickTasks(shipmentId: number): Promise<PickTask[]> {
    const response = await apiClient.get<PickTask[]>(
      API_ENDPOINTS.OUTBOUND.PICK_TASKS(shipmentId),
    );
    return response.data;
  },

  // Generate pick tasks
  async generatePicks(shipmentId: number): Promise<PickTask[]> {
    const response = await apiClient.post<PickTask[]>(
      API_ENDPOINTS.OUTBOUND.GENERATE_PICKS(shipmentId),
    );
    return response.data;
  },

  // Update a pick task
  async updatePickTask(taskId: number, data: PickTaskUpdateRequest): Promise<PickTask> {
    const response = await apiClient.patch<PickTask>(
      API_ENDPOINTS.OUTBOUND.PICK_TASK_UPDATE(taskId),
      data,
    );
    return response.data;
  },

  // Record barcode scan
  async scanBarcode(taskId: number, data: ScanRequest): Promise<PickTask> {
    const response = await apiClient.post<PickTask>(
      API_ENDPOINTS.OUTBOUND.PICK_TASK_SCAN(taskId),
      data,
    );
    return response.data;
  },

  // Confirm pack
  async confirmPack(shipmentId: number): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.CONFIRM_PACK(shipmentId),
    );
    return response.data;
  },

  // Stage shipment
  async stageShipment(shipmentId: number): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.STAGE(shipmentId),
    );
    return response.data;
  },

  // Link vehicle
  async linkVehicle(shipmentId: number, data: LinkVehicleRequest): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.LINK_VEHICLE(shipmentId),
      data,
    );
    return response.data;
  },

  // Inspect trailer
  async inspectTrailer(shipmentId: number, data: InspectTrailerRequest): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.INSPECT_TRAILER(shipmentId),
      data,
    );
    return response.data;
  },

  // Load truck
  async loadShipment(shipmentId: number, data: LoadRequest): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.LOAD(shipmentId),
      data,
    );
    return response.data;
  },

  // Supervisor confirm
  async supervisorConfirm(shipmentId: number): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.SUPERVISOR_CONFIRM(shipmentId),
    );
    return response.data;
  },

  // Generate BOL
  async generateBOL(shipmentId: number): Promise<BOLData> {
    const response = await apiClient.post<BOLData>(
      API_ENDPOINTS.OUTBOUND.GENERATE_BOL(shipmentId),
    );
    return response.data;
  },

  // Dispatch shipment
  async dispatchShipment(shipmentId: number, data: DispatchRequest): Promise<ShipmentOrder> {
    const response = await apiClient.post<ShipmentOrder>(
      API_ENDPOINTS.OUTBOUND.DISPATCH(shipmentId),
      data,
    );
    return response.data;
  },

  // Get goods issue status
  async getGoodsIssue(shipmentId: number): Promise<GoodsIssuePosting> {
    const response = await apiClient.get<GoodsIssuePosting>(
      API_ENDPOINTS.OUTBOUND.GOODS_ISSUE(shipmentId),
    );
    return response.data;
  },

  // Retry goods issue
  async retryGoodsIssue(shipmentId: number, data: RetryGoodsIssueRequest): Promise<GoodsIssuePosting> {
    const response = await apiClient.post<GoodsIssuePosting>(
      API_ENDPOINTS.OUTBOUND.GOODS_ISSUE_RETRY(shipmentId),
      data,
    );
    return response.data;
  },

  // Get dashboard data
  async getDashboard(): Promise<DashboardData> {
    const response = await apiClient.get<DashboardData>(
      API_ENDPOINTS.OUTBOUND.DASHBOARD,
    );
    return response.data;
  },
};
