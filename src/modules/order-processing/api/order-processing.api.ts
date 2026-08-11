import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  Dashboard,
  MaterialRequirement,
  OrderDetail,
  OrderListResponse,
  ProcessingEvent,
  ProcurementRequirement,
  ProductionRequirement,
  StockCheck,
  SyncRun,
} from '../types';

const EP = API_ENDPOINTS.ORDER_PROCESSING;

export interface OrderFilters {
  state?: string;
  oms_status?: string;
  search?: string;
  page?: number;
}

export const orderProcessingApi = {
  async dashboard(): Promise<Dashboard> {
    return (await apiClient.get<Dashboard>(EP.DASHBOARD)).data;
  },

  async orders(filters: OrderFilters = {}): Promise<OrderListResponse> {
    return (await apiClient.get<OrderListResponse>(EP.ORDERS, { params: filters })).data;
  },

  async order(id: number): Promise<OrderDetail> {
    return (await apiClient.get<OrderDetail>(EP.ORDER_DETAIL(id))).data;
  },

  async timeline(id: number): Promise<{ events: ProcessingEvent[]; checks: StockCheck[] }> {
    return (await apiClient.get<{ events: ProcessingEvent[]; checks: StockCheck[] }>(
      EP.ORDER_TIMELINE(id),
    )).data;
  },

  async checkStock(id: number): Promise<{ order: OrderDetail; check: StockCheck | null; verdict: string }> {
    return (await apiClient.post<{ order: OrderDetail; check: StockCheck | null; verdict: string }>(
      EP.ORDER_CHECK_STOCK(id), {},
    )).data;
  },

  async production(status = 'open'): Promise<ProductionRequirement[]> {
    return (await apiClient.get<ProductionRequirement[]>(EP.PRODUCTION, { params: { status } })).data;
  },

  async materials(shortOnly = false): Promise<MaterialRequirement[]> {
    return (await apiClient.get<MaterialRequirement[]>(EP.MATERIALS, {
      params: shortOnly ? { short_only: 'true' } : undefined,
    })).data;
  },

  async planMaterials(bomDepth = 1) {
    return (await apiClient.post(EP.MATERIALS_PLAN, { bom_depth: bomDepth })).data;
  },

  async procurement(status = 'open'): Promise<ProcurementRequirement[]> {
    return (await apiClient.get<ProcurementRequirement[]>(EP.PROCUREMENT, { params: { status } })).data;
  },

  async syncStatus(): Promise<{ oms_reachable: boolean; detail: string; runs: SyncRun[] }> {
    return (await apiClient.get<{ oms_reachable: boolean; detail: string; runs: SyncRun[] }>(
      EP.SYNC,
    )).data;
  },

  async sync(full = false): Promise<SyncRun> {
    return (await apiClient.post<SyncRun>(EP.SYNC, { full })).data;
  },
};
