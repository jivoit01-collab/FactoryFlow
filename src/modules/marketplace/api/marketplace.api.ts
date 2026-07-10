import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  CancelRequest,
  ComboDefinition,
  ComboDefinitionUpsert,
  ConfirmRequest,
  DispatchCreateRequest,
  DispatchListParams,
  MarketplaceChannel,
  MarketplaceDispatch,
  MarketplaceOrder,
  MarketplaceReturn,
  MarketplaceWarehouse,
  MarketplaceWarehouseUpsert,
  MpReturnScan,
  MpScan,
  OrderListParams,
  ReconciliationParams,
  ReconciliationReport,
  ResolvedOrder,
  ReturnCreateRequest,
  ReturnSubmitRequest,
  ScanRequest,
  SkuMapping,
  SkuMappingUpsert,
} from '../types/marketplace.types';

const EP = API_ENDPOINTS.MARKETPLACE;

function buildQuery<T extends object>(params?: T) {
  const qp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qp.append(k, String(v));
  });
  const s = qp.toString();
  return s ? `?${s}` : '';
}

export const marketplaceApi = {
  // ── Warehouses ─────────────────────────────────────────────────────────────
  async warehouses(channel?: MarketplaceChannel): Promise<MarketplaceWarehouse[]> {
    const { data } = await apiClient.get<MarketplaceWarehouse[]>(
      `${EP.WAREHOUSES}${buildQuery({ channel })}`,
    );
    return data;
  },
  async upsertWarehouse(payload: MarketplaceWarehouseUpsert): Promise<MarketplaceWarehouse> {
    if (payload.id) {
      const { data } = await apiClient.patch<MarketplaceWarehouse>(
        EP.WAREHOUSE_BY_ID(payload.id),
        payload,
      );
      return data;
    }
    const { data } = await apiClient.post<MarketplaceWarehouse>(EP.WAREHOUSES, payload);
    return data;
  },
  async deleteWarehouse(id: number): Promise<void> {
    await apiClient.delete(EP.WAREHOUSE_BY_ID(id));
  },

  // ── SKU mappings ───────────────────────────────────────────────────────────
  async skuMappings(params?: OrderListParams): Promise<SkuMapping[]> {
    const { data } = await apiClient.get<SkuMapping[]>(`${EP.SKU_MAPPINGS}${buildQuery(params)}`);
    return data;
  },
  async upsertSkuMapping(payload: SkuMappingUpsert): Promise<SkuMapping> {
    if (payload.id) {
      const { data } = await apiClient.patch<SkuMapping>(EP.SKU_MAPPING_BY_ID(payload.id), payload);
      return data;
    }
    const { data } = await apiClient.post<SkuMapping>(EP.SKU_MAPPINGS, payload);
    return data;
  },
  async deleteSkuMapping(id: number): Promise<void> {
    await apiClient.delete(EP.SKU_MAPPING_BY_ID(id));
  },
  async importSkuMappings(rows: SkuMappingUpsert[]): Promise<{
    imported: number;
    skipped: number;
    errors: unknown[];
  }> {
    const { data } = await apiClient.post(EP.SKU_MAPPINGS_IMPORT, { rows });
    return data;
  },

  // ── Combos ─────────────────────────────────────────────────────────────────
  async combos(channel?: MarketplaceChannel): Promise<ComboDefinition[]> {
    const { data } = await apiClient.get<ComboDefinition[]>(`${EP.COMBOS}${buildQuery({ channel })}`);
    return data;
  },
  async upsertCombo(payload: ComboDefinitionUpsert): Promise<ComboDefinition> {
    if (payload.id) {
      const { data } = await apiClient.patch<ComboDefinition>(EP.COMBO_BY_ID(payload.id), payload);
      return data;
    }
    const { data } = await apiClient.post<ComboDefinition>(EP.COMBOS, payload);
    return data;
  },
  async deleteCombo(id: number): Promise<void> {
    await apiClient.delete(EP.COMBO_BY_ID(id));
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  async orders(params?: OrderListParams): Promise<MarketplaceOrder[]> {
    const { data } = await apiClient.get<MarketplaceOrder[]>(`${EP.ORDERS}${buildQuery(params)}`);
    return data;
  },
  async resolveOrder(channel: MarketplaceChannel, orderId: string): Promise<ResolvedOrder> {
    const { data } = await apiClient.get<ResolvedOrder>(
      `${EP.ORDER_RESOLVE}${buildQuery({ channel, order_id: orderId })}`,
    );
    return data;
  },

  // ── Dispatches ─────────────────────────────────────────────────────────────
  async dispatches(params?: DispatchListParams): Promise<MarketplaceDispatch[]> {
    const { data } = await apiClient.get<MarketplaceDispatch[]>(
      `${EP.DISPATCHES}${buildQuery(params)}`,
    );
    return data;
  },
  async dispatch(id: number): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.get<MarketplaceDispatch>(EP.DISPATCH_BY_ID(id));
    return data;
  },
  async createDispatch(payload: DispatchCreateRequest): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCHES, payload);
    return data;
  },
  async scanDispatch(id: number, payload: ScanRequest): Promise<MpScan> {
    const { data } = await apiClient.post<MpScan>(EP.DISPATCH_SCANS(id), payload);
    return data;
  },
  async removeScan(id: number, scanId: number): Promise<void> {
    await apiClient.delete(EP.DISPATCH_SCAN_BY_ID(id, scanId));
  },
  async confirmDispatch(id: number, payload: ConfirmRequest): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCH_CONFIRM(id), payload);
    return data;
  },
  async cancelDispatch(id: number, payload: CancelRequest): Promise<MarketplaceDispatch> {
    const { data } = await apiClient.post<MarketplaceDispatch>(EP.DISPATCH_CANCEL(id), payload);
    return data;
  },

  // ── Returns ────────────────────────────────────────────────────────────────
  async returns(params?: DispatchListParams): Promise<MarketplaceReturn[]> {
    const { data } = await apiClient.get<MarketplaceReturn[]>(`${EP.RETURNS}${buildQuery(params)}`);
    return data;
  },
  async return(id: number): Promise<MarketplaceReturn> {
    const { data } = await apiClient.get<MarketplaceReturn>(EP.RETURN_BY_ID(id));
    return data;
  },
  async createReturn(payload: ReturnCreateRequest): Promise<MarketplaceReturn> {
    const { data } = await apiClient.post<MarketplaceReturn>(EP.RETURNS, payload);
    return data;
  },
  async scanReturn(id: number, payload: ScanRequest): Promise<MpReturnScan> {
    const { data } = await apiClient.post<MpReturnScan>(EP.RETURN_SCANS(id), payload);
    return data;
  },
  async submitReturn(id: number, payload: ReturnSubmitRequest): Promise<MarketplaceReturn> {
    const { data } = await apiClient.post<MarketplaceReturn>(EP.RETURN_SUBMIT(id), payload);
    return data;
  },

  // ── Reconciliation ─────────────────────────────────────────────────────────
  async reconciliation(params?: ReconciliationParams): Promise<ReconciliationReport> {
    const { data } = await apiClient.get<ReconciliationReport>(
      `${EP.RECONCILIATION}${buildQuery(params)}`,
    );
    return data;
  },
};
