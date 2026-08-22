import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

/**
 * SAP Reports API.
 *
 * Every report here is a saved query authored in SAP's Query Manager, so its
 * shape is only known at runtime: `columns` describes what came back and `rows`
 * are plain value arrays in that order. Filters are SAP's numbered prompts,
 * keyed by position.
 */

/** How the frontend should ask for a filter value. */
export type SapReportParameterKind =
  | 'DATE'
  | 'TEXT'
  | 'NUMBER'
  | 'ITEM'
  | 'WAREHOUSE'
  | 'BUSINESS_PARTNER'
  | 'ITEM_GROUP'
  | 'PERIOD';

export type SapReportStatementKind = 'SELECT' | 'CALL';

export interface SapReportParameter {
  /** The N in SAP's [%N] placeholder — also the key to send values under. */
  position: number;
  label: string;
  kind: SapReportParameterKind;
  is_required: boolean;
  default_value: string;
  help_text: string;
  /** Whether the parameter has a server-side picklist. */
  has_lookup: boolean;
  occurrences: number;
  is_customised: boolean;
}

export interface SapReportListItem {
  slug: string;
  title: string;
  sap_name: string;
  display_name: string;
  description: string;
  sap_category_name: string;
  statement_kind: SapReportStatementKind;
  parameter_count: number;
  is_enabled: boolean;
  is_runnable: boolean;
  not_runnable_reason: string;
  is_missing_in_sap: boolean;
  sort_order: number;
  last_run_at: string | null;
  last_synced_at: string | null;
}

export interface SapReportDetail extends SapReportListItem {
  parameters: SapReportParameter[];
  row_limit: number | null;
  effective_row_limit: number;
  sap_changed_at: string | null;
}

export interface SapReportListResponse {
  data: SapReportListItem[];
  meta: {
    company: string;
    total: number;
    categories: string[];
    can_manage: boolean;
  };
}

export interface SapReportColumn {
  /** Unique key for the column — duplicated SAP headings get a suffix. */
  key: string;
  /** The heading exactly as SAP returned it. */
  label: string;
  type: 'text' | 'number' | 'date';
}

export type SapReportCell = string | number | boolean | null;

export interface SapReportResult {
  columns: SapReportColumn[];
  rows: SapReportCell[][];
  meta: {
    report: string;
    title: string;
    company: string;
    row_count: number;
    row_limit: number;
    was_truncated: boolean;
    duration_ms: number;
    executed_at: string;
    parameters: Array<{
      position: number;
      label: string;
      kind: SapReportParameterKind;
      value: SapReportCell;
    }>;
  };
}

export interface SapReportSql {
  slug: string;
  sap_name: string;
  sql_text: string;
  sql_hash: string;
  statement_kind: SapReportStatementKind;
}

export interface SapReportRunRecord {
  id: number;
  report_title: string;
  run_by_name: string;
  parameters: Record<string, SapReportCell>;
  status: 'SUCCESS' | 'ERROR';
  row_count: number;
  was_truncated: boolean;
  duration_ms: number;
  export_format: string;
  error_message: string;
  created_at: string;
}

export interface SapReportCategory {
  category_id: number;
  category_name: string;
  query_count: number;
}

export interface SapReportSyncSummary {
  company: string;
  category: string;
  found_in_sap: number;
  created: string[];
  updated: string[];
  unchanged: string[];
  not_runnable: string[];
  missing_in_sap: string[];
  dry_run: boolean;
}

export interface LookupOption {
  value: string;
  label: string;
}

/** Filter values keyed by prompt position, e.g. `{ '0': '2026-08-01' }`. */
export type SapReportParameterValues = Record<string, string>;

export interface UpdateSapReportPayload {
  display_name?: string;
  description?: string;
  is_enabled?: boolean;
  sort_order?: number;
  row_limit?: number | null;
  parameters?: Array<{
    position: number;
    label?: string;
    kind?: SapReportParameterKind;
    is_required?: boolean;
    default_value?: string;
    help_text?: string;
  }>;
}

const EP = API_ENDPOINTS.SAP_REPORTS;

export const sapReportsApi = {
  async list(params?: { search?: string; include_hidden?: boolean }) {
    const response = await apiClient.get<SapReportListResponse>(EP.LIST, {
      params: {
        search: params?.search || undefined,
        include_hidden: params?.include_hidden ? 'true' : undefined,
      },
    });
    return response.data;
  },

  async get(slug: string) {
    const response = await apiClient.get<{ data: SapReportDetail }>(EP.BY_SLUG(slug));
    return response.data.data;
  },

  async getSql(slug: string) {
    const response = await apiClient.get<{ data: SapReportSql }>(EP.SQL(slug));
    return response.data.data;
  },

  async update(slug: string, payload: UpdateSapReportPayload) {
    const response = await apiClient.patch<{ data: SapReportDetail }>(
      EP.BY_SLUG(slug),
      payload,
    );
    return response.data.data;
  },

  async run(slug: string, parameters: SapReportParameterValues, rowLimit?: number) {
    const response = await apiClient.post<SapReportResult>(EP.RUN(slug), {
      parameters,
      ...(rowLimit ? { row_limit: rowLimit } : {}),
    });
    return response.data;
  },

  /**
   * Runs the report and returns the file.
   *
   * A POST rather than a link because the download needs the auth and
   * company headers the api client attaches.
   */
  async export(
    slug: string,
    parameters: SapReportParameterValues,
    exportFormat: 'csv' | 'xlsx',
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.post<Blob>(
      EP.EXPORT(slug),
      { parameters, export_format: exportFormat },
      { responseType: 'blob' },
    );
    return {
      blob: response.data,
      filename: filenameFromDisposition(
        response.headers?.['content-disposition'],
        `${slug}.${exportFormat}`,
      ),
    };
  },

  async parameterOptions(slug: string, position: number, search: string) {
    const response = await apiClient.get<{ data: LookupOption[] }>(
      EP.PARAMETER_OPTIONS(slug, position),
      { params: { search: search || undefined } },
    );
    return response.data.data;
  },

  async reportRuns(slug: string) {
    const response = await apiClient.get<{ data: SapReportRunRecord[] }>(EP.REPORT_RUNS(slug));
    return response.data.data;
  },

  async categories() {
    const response = await apiClient.get<{ data: SapReportCategory[] }>(EP.CATEGORIES);
    return response.data.data;
  },

  async sync(payload?: { category?: string; all_categories?: boolean; dry_run?: boolean }) {
    const response = await apiClient.post<{ data: SapReportSyncSummary }>(EP.SYNC, payload ?? {});
    return response.data.data;
  },
};

function filenameFromDisposition(disposition: unknown, fallback: string): string {
  if (typeof disposition !== 'string') return fallback;
  const match = disposition.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}
