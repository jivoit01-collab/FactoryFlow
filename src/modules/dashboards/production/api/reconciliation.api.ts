import { apiClient } from '@/core/api';

/** One SKU's App-vs-SAP reconciliation row. */
export interface ReconRow {
  sku: string;
  item_code: string;
  app_qty: number;
  /** live output from in-progress runs (production only) */
  in_progress?: number;
  sap_qty: number;
  difference: number;
  difference_pct: number;
  status: 'MATCHED' | 'MISMATCH' | 'PENDING_SYNC' | string;
}

export interface ReconItem {
  item_code: string;
  item_name: string;
  sap_qty: number;
}

export interface ReconSummary {
  app_qty: number;
  sap_qty: number;
  difference: number;
  difference_pct: number;
  status: string;
  sku_count?: number;
}

export interface ReconMeta {
  date_from: string;
  date_to: string;
  warehouse: string;
  app_unit?: string;
  sap_unit?: string;
  note?: string;
}

export interface ReconReport {
  by_sku: ReconRow[];
  sap_by_item: ReconItem[];
  summary: ReconSummary;
  meta: ReconMeta;
}

/** Material variance: BOM should-use vs App issued vs SAP issued. */
export interface MaterialRow {
  sku: string;
  item_code: string;
  should_use: number;
  app_issued: number;
  sap_issued: number;
  difference: number;
  difference_pct: number;
  status: 'MATCHED' | 'MISMATCH' | 'PENDING_SYNC' | string;
}

export interface MaterialSummary {
  should_use: number;
  app_issued: number;
  sap_issued: number;
  difference: number;
  difference_pct: number;
  status: string;
  sku_count?: number;
}

export interface MaterialReport {
  by_sku: MaterialRow[];
  summary: MaterialSummary;
  meta: ReconMeta;
}

export interface ReconParams {
  date_from?: string;
  date_to?: string;
  warehouse?: string;
  line?: number;
}

const PROD_URL = '/production-execution/reports/reconciliation/production/';
const MATERIAL_URL = '/production-execution/reports/reconciliation/material/';
const WASTE_URL = '/production-execution/reports/reconciliation/wastage/';

export const reconciliationApi = {
  async production(params: ReconParams): Promise<ReconReport> {
    const res = await apiClient.get<ReconReport>(PROD_URL, { params });
    return res.data;
  },
  async material(params: ReconParams): Promise<MaterialReport> {
    const res = await apiClient.get<MaterialReport>(MATERIAL_URL, { params });
    return res.data;
  },
  async wastage(params: ReconParams): Promise<ReconReport> {
    const res = await apiClient.get<ReconReport>(WASTE_URL, { params });
    return res.data;
  },
};
