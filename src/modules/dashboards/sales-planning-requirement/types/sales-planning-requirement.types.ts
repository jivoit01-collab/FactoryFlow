export type SalesPlanningRequirementStatus = 'shortage' | 'po_covered';
export type SalesPlanningRefreshStatus = 'pending' | 'running' | 'success' | 'failed';

export interface SalesPlanningRequirementFilters {
  search?: string;
  status?: 'all' | SalesPlanningRequirementStatus;
  page?: number;
  page_size?: number;
}

export interface SalesPlanningRequirementItem {
  id: number;
  company_code: string;
  forecast_id: number | null;
  forecast_name: string;
  forecast_start_date: string | null;
  forecast_end_date: string | null;
  planning_month: string;
  item_code: string;
  item_name: string;
  planned_qty: number;
  base_required_qty: number;
  min_stock: number;
  stock_in_hand: number;
  required_qty: number;
  /** On posted GRPOs within the forecast's dates; null until the next refresh. */
  received_qty: number | null;
  open_po_qty: number;
  net_shortage_qty: number;
  status: SalesPlanningRequirementStatus;
  report_execution_at: string | null;
  loaded_at: string | null;
}

export interface SalesPlanningRequirementSummary {
  total_items: number;
  total_planned_qty: number;
  total_base_required_qty: number;
  total_required_qty: number;
  total_min_stock: number;
  total_stock_in_hand: number;
  total_open_po_qty: number;
  total_net_shortage_qty: number;
  shortage_items: number;
  po_covered_items: number;
  open_po_coverage_percent: number;
}

export interface SalesPlanningRefreshRun {
  id: number;
  company_code: string;
  source_schema: string;
  procedure_name: string;
  forecast_id: number | null;
  forecast_name: string;
  forecast_start_date: string | null;
  forecast_end_date: string | null;
  status: SalesPlanningRefreshStatus;
  triggered_by: 'manual' | 'scheduled' | 'command';
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  rows_loaded: number;
  error_message: string;
  procedure_parameters: Record<string, unknown>;
}

export interface SalesPlanningRefreshEnvelope {
  latest: SalesPlanningRefreshRun | null;
  last_success: SalesPlanningRefreshRun | null;
}

export interface SalesPlanningRequirementMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  fetched_at: string;
}

export interface SalesPlanningRequirementReportResponse {
  data: SalesPlanningRequirementItem[];
  summary: SalesPlanningRequirementSummary;
  refresh: SalesPlanningRefreshEnvelope;
  meta: SalesPlanningRequirementMeta;
}

export interface SalesPlanningRefreshResponse {
  refresh: SalesPlanningRefreshRun;
  summary: SalesPlanningRequirementSummary;
}

export interface ProcedureOutputColumnAnalysis {
  hana_column?: string;
  hana_type?: string;
  mapped_column?: string;
  column?: string;
  postgres_type?: string;
  business_meaning: string;
}

export interface SalesPlanningRequirementAnalysisResponse {
  procedure_name: string;
  company_code: string;
  supported_companies: string[];
  procedure_output: ProcedureOutputColumnAnalysis[];
  postgres_table: {
    name: string;
    refresh_strategy: string;
    columns: ProcedureOutputColumnAnalysis[];
  };
  latest_procedure_metadata: Array<Record<string, unknown>>;
  scheduler: {
    frequency: string;
    command: string;
    default_cron: {
      day: number;
      hour: number;
      minute: number;
    };
  };
}
