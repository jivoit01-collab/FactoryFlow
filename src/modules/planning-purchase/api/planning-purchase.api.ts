import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BucketType,
  CreatePurchaseOrdersRequest,
  CreatePurchaseOrdersResponse,
  PlanDetailResponse,
  PlanListResponse,
  PostToSapResponse,
  ProducibleFilters,
  ProducibleResponse,
  PurchaseOrder,
  PurchaseOrderListFilters,
  PurchaseOrderListResponse,
  RequirementFilters,
  RequirementResponse,
  SpreadPolicy,
  UpdatePurchaseOrderRequest,
  Vendor,
  Warehouse,
} from '../types';

const EP = API_ENDPOINTS.PLANNING_PURCHASE;

export const planApi = {
  /** Plans authored in SAP, newest first. */
  async list(limit = 36): Promise<PlanListResponse> {
    const response = await apiClient.get<PlanListResponse>(EP.PLANS, {
      params: { limit },
    });
    return response.data;
  },

  async detail(
    absId: number,
    options: {
      bucketType?: BucketType;
      spreadPolicy?: SpreadPolicy;
      includeActuals?: boolean;
    } = {},
  ): Promise<PlanDetailResponse> {
    const response = await apiClient.get<PlanDetailResponse>(EP.PLAN_DETAIL(absId), {
      params: {
        bucket_type: options.bucketType ?? 'MONTH',
        spread_policy: options.spreadPolicy ?? 'EVEN_WORKING_DAYS',
        include_actuals: options.includeActuals ?? true,
      },
    });
    return response.data;
  },

  async requirement(
    absId: number,
    filters: RequirementFilters = {},
  ): Promise<RequirementResponse> {
    const params: Record<string, string | boolean> = {
      include_covered: filters.include_covered ?? true,
    };
    if (filters.material_type) params.material_type = filters.material_type;
    if (filters.warehouse?.length) params.warehouse = filters.warehouse.join(',');

    const response = await apiClient.get<RequirementResponse>(
      EP.PLAN_REQUIREMENT(absId),
      { params },
    );
    return response.data;
  },

  /**
   * The requirement as an .xlsx.
   *
   * Returns the blob rather than navigating, because the download has to carry
   * the JWT and the company header that `apiClient` attaches — a plain link
   * would arrive unauthenticated.
   */
  async exportRequirement(absId: number, filters: RequirementFilters = {}): Promise<Blob> {
    const params: Record<string, string | boolean> = {
      include_covered: filters.include_covered ?? true,
    };
    if (filters.material_type) params.material_type = filters.material_type;
    if (filters.warehouse?.length) params.warehouse = filters.warehouse.join(',');

    const response = await apiClient.get<Blob>(EP.PLAN_REQUIREMENT_EXPORT(absId), {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * What can be built from the stock on hand on a given day.
   *
   * Reads every BOM on the plan plus stock for every component, so it is a few
   * seconds on a full plan.
   */
  async producible(
    absId: number,
    filters: ProducibleFilters = {},
  ): Promise<ProducibleResponse> {
    const params: Record<string, string> = {};
    if (filters.target_date) params.target_date = filters.target_date;
    if (filters.stock_basis) params.stock_basis = filters.stock_basis;
    if (filters.warehouse?.length) params.warehouse = filters.warehouse.join(',');

    const response = await apiClient.get<ProducibleResponse>(
      EP.PLAN_PRODUCIBLE(absId),
      { params },
    );
    return response.data;
  },

  async vendors(search = ''): Promise<Vendor[]> {
    const response = await apiClient.get<{ data: Vendor[] }>(EP.VENDORS, {
      params: search ? { search } : undefined,
    });
    return response.data.data;
  },

  async warehouses(): Promise<Warehouse[]> {
    const response = await apiClient.get<{ data: Warehouse[] }>(EP.WAREHOUSES);
    return response.data.data;
  },
};

export const purchaseOrderApi = {
  async list(filters: PurchaseOrderListFilters = {}): Promise<PurchaseOrderListResponse> {
    const response = await apiClient.get<PurchaseOrderListResponse>(EP.PURCHASE_ORDERS, {
      params: filters,
    });
    return response.data;
  },

  async detail(id: number): Promise<PurchaseOrder> {
    const response = await apiClient.get<PurchaseOrder>(EP.PURCHASE_ORDER_DETAIL(id));
    return response.data;
  },

  /** Creates one order per supplier; the server does the grouping. */
  async create(payload: CreatePurchaseOrdersRequest): Promise<CreatePurchaseOrdersResponse> {
    const response = await apiClient.post<CreatePurchaseOrdersResponse>(
      EP.PURCHASE_ORDERS,
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiClient.patch<PurchaseOrder>(
      EP.PURCHASE_ORDER_DETAIL(id),
      payload,
    );
    return response.data;
  },

  async approve(id: number): Promise<PurchaseOrder> {
    const response = await apiClient.post<PurchaseOrder>(
      EP.PURCHASE_ORDER_APPROVE(id),
      {},
    );
    return response.data;
  },

  /** Creates the real SAP document — unless the backend is in simulate mode. */
  async postToSap(id: number): Promise<PostToSapResponse> {
    const response = await apiClient.post<PostToSapResponse>(
      EP.PURCHASE_ORDER_POST(id),
      {},
    );
    return response.data;
  },

  async cancel(id: number, reason = ''): Promise<PurchaseOrder> {
    const response = await apiClient.delete<PurchaseOrder>(
      EP.PURCHASE_ORDER_DETAIL(id),
      { data: { reason } },
    );
    return response.data;
  },
};
