import { apiClient } from '@/core/api';

/** Mirrors `sap_postings.SapPostingStatus`. */
export type SapPostingStatus = 'SENDING' | 'QUEUED' | 'POSTED' | 'REJECTED' | 'CANCELLED';

/** Mirrors `sap_postings.SapPostingOutcome`; blank while a try is in flight. */
export type SapPostingOutcome = 'POSTED' | 'WAITING' | 'REJECTED' | '';

/** One SAP document inside a try, as the handler logged it. */
export interface SapPostingDocument {
  reference?: string;
  invoices?: string;
  card_code?: string;
  outcome?: string;
  doc_num?: string;
  error?: string;
  payload?: unknown;
}

export interface SapPostingAttempt {
  number: number;
  by_worker: boolean;
  started_at: string;
  finished_at: string | null;
  outcome: SapPostingOutcome;
  outcome_label: string;
  message: string;
  detail: { documents?: SapPostingDocument[] } & Record<string, unknown>;
}

export interface SapPosting {
  id: number;
  company_code: string;
  kind: string;
  /** What a person calls this kind of posting, e.g. "Goods return (A/R Return)". */
  kind_label: string;
  source_id: number;
  title: string;
  /** Where the record lives in this app, e.g. `/returns/customer/40`. */
  link: string;
  status: SapPostingStatus;
  status_label: string;
  attempts: number;
  next_attempt_at: string | null;
  last_error: string;
  result: { doc_nums?: string[] } & Record<string, unknown>;
  posted_at: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  cancel_reason: string;
}

export interface SapPostingDetail extends SapPosting {
  params: Record<string, unknown>;
  attempts_log: SapPostingAttempt[];
  cancelled_by_name: string;
}

/** One page of the log. It gains a row for every posting, so it is never sent whole. */
export interface SapPostingPage {
  results: SapPosting[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
}

export interface SapPostingListParams {
  status?: SapPostingStatus;
  kind?: string;
  /** A document or invoice number in the title, or an SAP document number. */
  q?: string;
  /** `YYYY-MM-DD`, inclusive. */
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

/** What the tabs and the sidebar badge need; cheap enough to poll. */
export interface SapPostingCounts {
  counts: { QUEUED: number; REJECTED: number };
  kinds: { value: string; label: string }[];
}

// Beside their only callers rather than in API_ENDPOINTS, like the SAP health
// check: the admin page is the one place they are used.
const BASE = '/sap-postings/';

export const sapPostingsApi = {
  async list(params?: SapPostingListParams): Promise<SapPostingPage> {
    const response = await apiClient.get<SapPostingPage>(BASE, { params });
    return response.data;
  },

  async counts(): Promise<SapPostingCounts> {
    const response = await apiClient.get<SapPostingCounts>(`${BASE}counts/`, {
      suppressErrorToast: true,
    });
    return response.data;
  },

  async detail(id: number): Promise<SapPostingDetail> {
    const response = await apiClient.get<SapPostingDetail>(`${BASE}${id}/`);
    return response.data;
  },

  async retry(id: number): Promise<SapPostingDetail> {
    // One try at SAP, which may take its full posting timeout.
    const response = await apiClient.post<SapPostingDetail>(`${BASE}${id}/retry/`, {}, {
      timeout: 120_000,
    });
    return response.data;
  },

  async cancel(id: number, reason: string): Promise<SapPostingDetail> {
    const response = await apiClient.post<SapPostingDetail>(`${BASE}${id}/cancel/`, { reason });
    return response.data;
  },
};
