import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import { useAuth } from '@/core/auth';

import type {
  LineFilters,
  SapItem,
  SapWarehouse,
  StockAudit,
  StockAuditCount,
  StockAuditDetail,
  StockAuditLine,
  StockAuditLinePage,
} from './types';

const EP = API_ENDPOINTS.STOCK_AUDIT;

export const stockAuditApi = {
  async warehouses(): Promise<SapWarehouse[]> {
    return (await apiClient.get<SapWarehouse[]>(EP.WAREHOUSES)).data;
  },
  async list(): Promise<StockAudit[]> {
    return (await apiClient.get<StockAudit[]>(EP.AUDITS)).data;
  },
  async start(data: { warehouse_code: string; warehouse_name: string }) {
    return (await apiClient.post<StockAuditDetail>(EP.AUDITS, data)).data;
  },
  async detail(id: number): Promise<StockAuditDetail> {
    return (await apiClient.get<StockAuditDetail>(EP.AUDIT(id))).data;
  },
  async lines(id: number, filters: LineFilters): Promise<StockAuditLinePage> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '' && value != null),
    );
    return (await apiClient.get<StockAuditLinePage>(EP.LINES(id), { params })).data;
  },
  async counts(id: number, lineId: number): Promise<StockAuditCount[]> {
    return (await apiClient.get<StockAuditCount[]>(EP.LINE_COUNTS(id, lineId))).data;
  },
  async addCount(id: number, lineId: number, data: { qty: string; note?: string }) {
    return (await apiClient.post<StockAuditLine>(EP.LINE_COUNTS(id, lineId), data)).data;
  },
  async voidCount(id: number, countId: number) {
    return (await apiClient.post<StockAuditLine>(EP.VOID_COUNT(id, countId))).data;
  },
  async searchItems(id: number, search: string): Promise<SapItem[]> {
    return (await apiClient.get<SapItem[]>(EP.ITEMS(id), { params: { search } })).data;
  },
  async addItem(id: number, itemCode: string) {
    return (await apiClient.post<StockAuditLine>(EP.ITEMS(id), { item_code: itemCode })).data;
  },
  async refresh(id: number) {
    return (await apiClient.post<StockAuditDetail>(EP.REFRESH(id))).data;
  },
  async close(id: number) {
    return (await apiClient.post<StockAuditDetail>(EP.CLOSE(id))).data;
  },
  /** Fetched through the API so the request carries the auth header. */
  async exportCsv(id: number): Promise<Blob> {
    return (await apiClient.get<Blob>(EP.EXPORT(id), { responseType: 'blob' })).data;
  },
};

/** Keyed on the company: an audit is one company's SAP warehouse. */
function useCompanyKey() {
  const { currentCompany } = useAuth();
  return currentCompany?.company_id ?? 'none';
}

export const STOCK_AUDIT_KEYS = {
  all: ['stock-audit'] as const,
  warehouses: (company: unknown) => [...STOCK_AUDIT_KEYS.all, company, 'warehouses'] as const,
  list: (company: unknown) => [...STOCK_AUDIT_KEYS.all, company, 'list'] as const,
  audit: (id: number) => [...STOCK_AUDIT_KEYS.all, 'audit', id] as const,
  lines: (id: number, filters: LineFilters) =>
    [...STOCK_AUDIT_KEYS.all, 'audit', id, 'lines', filters] as const,
  counts: (id: number, lineId: number) =>
    [...STOCK_AUDIT_KEYS.all, 'audit', id, 'counts', lineId] as const,
  items: (id: number, search: string) =>
    [...STOCK_AUDIT_KEYS.all, 'audit', id, 'items', search] as const,
};

export function useSapWarehouses(enabled = true) {
  const company = useCompanyKey();
  return useQuery({
    queryKey: STOCK_AUDIT_KEYS.warehouses(company),
    queryFn: stockAuditApi.warehouses,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockAudits() {
  const company = useCompanyKey();
  return useQuery({ queryKey: STOCK_AUDIT_KEYS.list(company), queryFn: stockAuditApi.list });
}

export function useStockAudit(id: number) {
  return useQuery({
    queryKey: STOCK_AUDIT_KEYS.audit(id),
    queryFn: () => stockAuditApi.detail(id),
  });
}

/** A page of lines; the table stays on screen while the next one loads. */
export function useStockAuditLines(id: number, filters: LineFilters) {
  return useQuery({
    queryKey: STOCK_AUDIT_KEYS.lines(id, filters),
    queryFn: () => stockAuditApi.lines(id, filters),
    placeholderData: keepPreviousData,
  });
}

export function useLineCounts(id: number, lineId: number | null) {
  return useQuery({
    queryKey: STOCK_AUDIT_KEYS.counts(id, lineId ?? 0),
    queryFn: () => stockAuditApi.counts(id, lineId as number),
    enabled: lineId != null,
  });
}

export function useSapItemSearch(id: number, search: string) {
  return useQuery({
    queryKey: STOCK_AUDIT_KEYS.items(id, search),
    queryFn: () => stockAuditApi.searchItems(id, search),
    enabled: search.trim().length >= 2,
  });
}

/** After anything that changes an audit: its lines, progress and the list. */
function useRefreshAudit() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: STOCK_AUDIT_KEYS.all });
}

export function useStartAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stockAuditApi.start,
    onSuccess: () => qc.invalidateQueries({ queryKey: STOCK_AUDIT_KEYS.all }),
  });
}

export function useAddCount(id: number) {
  const refresh = useRefreshAudit();
  return useMutation({
    mutationFn: ({ lineId, qty, note }: { lineId: number; qty: string; note?: string }) =>
      stockAuditApi.addCount(id, lineId, { qty, note }),
    onSuccess: refresh,
  });
}

export function useVoidCount(id: number) {
  const refresh = useRefreshAudit();
  return useMutation({
    mutationFn: (countId: number) => stockAuditApi.voidCount(id, countId),
    onSuccess: refresh,
  });
}

export function useAddItem(id: number) {
  const refresh = useRefreshAudit();
  return useMutation({
    mutationFn: (itemCode: string) => stockAuditApi.addItem(id, itemCode),
    onSuccess: refresh,
  });
}

export function useRefreshFromSap(id: number) {
  const refresh = useRefreshAudit();
  return useMutation({ mutationFn: () => stockAuditApi.refresh(id), onSuccess: refresh });
}

export function useCloseAudit(id: number) {
  const refresh = useRefreshAudit();
  return useMutation({ mutationFn: () => stockAuditApi.close(id), onSuccess: refresh });
}
