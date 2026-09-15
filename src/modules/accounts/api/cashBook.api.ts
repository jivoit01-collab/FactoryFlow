import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

export type CashDirection = 'IN' | 'OUT';
export type BunchStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EntryApprovalStatus = 'UNSENT' | BunchStatus;

/** The bunch an entry is in, as the register row needs to describe it. */
export interface CashBunchSummary {
  id: number;
  number: number;
  status: BunchStatus;
  status_label: string;
  sent_at: string;
  decided_at: string | null;
}

/**
 * One branch of the business a payment can be filed under.
 *
 * Four of them — Oil, Beverage, Water and Common — seeded per company and
 * edited from the settings page. "Common" is where a spend that belongs to the
 * whole site goes.
 */
export interface CashBranch {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  /** How many entries are filed under it — what retiring it would hide. */
  entry_count: number;
}

/**
 * One line of the cash book.
 *
 * `balance_after` is the book's own running balance at that line — it follows
 * the order entries were *recorded*, not their dates, which is how the paper
 * sheet works too. It is therefore meaningful under any filter, and must never
 * be recomputed in the browser from the rows on screen.
 */
export interface CashEntry {
  id: number;
  entry_date: string;
  direction: CashDirection;
  direction_label: string;
  /** Always positive; `direction` says which way it moved. */
  amount: string;
  branch: number | null;
  branch_name: string | null;
  gl_account_code: string;
  gl_account_name: string;
  item: string;
  detail: string;
  balance_after: string;
  bunch: CashBunchSummary | null;
  approval_status: EntryApprovalStatus;
  /** True while the entry sits with an approver, or has been approved. */
  is_locked: boolean;
  /** False for a cancelled entry, which is out of the balance but still read. */
  is_active: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashTotals {
  cash_in: string;
  cash_out: string;
  net: string;
  count: number;
}

export interface CashEntryPage {
  results: CashEntry[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
  /** The book's balance, not the filtered set's. Sent on every page. */
  balance: string;
  totals: CashTotals;
}

export interface CashBookOptions {
  /** Active branches only — a retired one is not offered to a new entry. */
  branches: CashBranch[];
  directions: { value: CashDirection; label: string }[];
  bunch_statuses: { value: BunchStatus; label: string }[];
  approval_statuses: { value: EntryApprovalStatus; label: string }[];
  balance: string;
  gl_account_search_limit: number;
  /** Whether this user keeps the book. Decided by the server. */
  can_manage: boolean;
  /** Whether this user decides on bunches. Decided by the server. */
  can_approve: boolean;
  /** Whether this user may configure the branch list. */
  can_manage_branches: boolean;
}

export interface CashBookSummary {
  balance: string;
  filtered: CashTotals;
  pending_bunches: number;
  unsent_entries: number;
}

/** One SAP account, straight out of the chart of accounts. */
export interface GLAccount {
  account_code: string;
  account_name: string;
  account_type: string;
}

export interface CashBunch {
  id: number;
  number: number;
  status: BunchStatus;
  status_label: string;
  remarks: string;
  sent_at: string;
  sent_by_name: string | null;
  /** The sheet's 'Sign Date': when it was approved or sent back. */
  decided_at: string | null;
  decided_by_name: string | null;
  decision_note: string;
  entry_count: number;
  total_in: string;
  total_out: string;
}

export interface CashBunchDetail extends CashBunch {
  entries: CashEntry[];
}

export interface CashEntryListParams {
  dateFrom?: string;
  dateTo?: string;
  direction?: CashDirection;
  branch?: number;
  glAccountCode?: string;
  bunch?: number;
  approvalStatus?: EntryApprovalStatus;
  search?: string;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RecordEntryPayload {
  entry_date: string;
  direction: CashDirection;
  amount: string;
  branch?: number | null;
  gl_account_code?: string;
  /** Sent with the code; only used if SAP is down when the entry is saved. */
  gl_account_name?: string;
  item?: string;
  detail: string;
}

export type UpdateEntryPayload = Partial<RecordEntryPayload>;

export interface SendForApprovalPayload {
  entry_ids: number[];
  remarks?: string;
}

function listParams(params?: CashEntryListParams) {
  return {
    ...(params?.dateFrom ? { date_from: params.dateFrom } : {}),
    ...(params?.dateTo ? { date_to: params.dateTo } : {}),
    ...(params?.direction ? { direction: params.direction } : {}),
    ...(params?.branch ? { branch: params.branch } : {}),
    ...(params?.glAccountCode ? { gl_account_code: params.glAccountCode } : {}),
    ...(params?.bunch ? { bunch: params.bunch } : {}),
    ...(params?.approvalStatus ? { approval_status: params.approvalStatus } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.includeCancelled ? { include_cancelled: 'true' } : {}),
    ...(params?.page ? { page: params.page } : {}),
    ...(params?.pageSize ? { page_size: params.pageSize } : {}),
  };
}

export interface BranchPayload {
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export const cashBookApi = {
  /**
   * The branch list. `includeRetired` is for the settings page — the entry
   * form only ever wants the active ones, which `options()` already carries.
   */
  async branches(includeRetired = false): Promise<CashBranch[]> {
    const { data } = await apiClient.get<CashBranch[]>(API_ENDPOINTS.CASH_BOOK.BRANCHES, {
      params: includeRetired ? { include_retired: 'true' } : {},
    });
    return data;
  },

  async createBranch(payload: BranchPayload): Promise<CashBranch> {
    const { data } = await apiClient.post<CashBranch>(
      API_ENDPOINTS.CASH_BOOK.BRANCHES,
      payload,
    );
    return data;
  },

  async updateBranch(branchId: number, payload: Partial<BranchPayload>): Promise<CashBranch> {
    const { data } = await apiClient.patch<CashBranch>(
      API_ENDPOINTS.CASH_BOOK.BRANCH_DETAIL(branchId),
      payload,
    );
    return data;
  },

  /** Retires rather than deletes: entries already filed under it keep it. */
  async retireBranch(branchId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CASH_BOOK.BRANCH_DETAIL(branchId));
  },

  async options(): Promise<CashBookOptions> {
    const { data } = await apiClient.get<CashBookOptions>(API_ENDPOINTS.CASH_BOOK.OPTIONS);
    return data;
  },

  async summary(params?: CashEntryListParams): Promise<CashBookSummary> {
    const { data } = await apiClient.get<CashBookSummary>(API_ENDPOINTS.CASH_BOOK.SUMMARY, {
      params: listParams(params),
    });
    return data;
  },

  /** The register. Always paged — the book only grows. */
  async entries(params?: CashEntryListParams): Promise<CashEntryPage> {
    const { data } = await apiClient.get<CashEntryPage>(API_ENDPOINTS.CASH_BOOK.ENTRIES, {
      params: listParams(params),
    });
    return data;
  },

  /**
   * A type-ahead against SAP's chart of accounts.
   *
   * Answers 503 when SAP is unreachable — the caller should say so rather than
   * showing an empty list, which would read as "no such account".
   */
  async glAccounts(search: string): Promise<GLAccount[]> {
    const { data } = await apiClient.get<GLAccount[]>(API_ENDPOINTS.CASH_BOOK.GL_ACCOUNTS, {
      params: search ? { search } : {},
    });
    return data;
  },

  async record(payload: RecordEntryPayload): Promise<CashEntry> {
    const { data } = await apiClient.post<CashEntry>(API_ENDPOINTS.CASH_BOOK.ENTRIES, payload);
    return data;
  },

  async update(entryId: number, payload: UpdateEntryPayload): Promise<CashEntry> {
    const { data } = await apiClient.patch<CashEntry>(
      API_ENDPOINTS.CASH_BOOK.ENTRY_DETAIL(entryId),
      payload,
    );
    return data;
  },

  /** Cancels rather than deletes: a cash book that can lose a line is not one. */
  async cancel(entryId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CASH_BOOK.ENTRY_DETAIL(entryId));
  },

  async bunches(status?: BunchStatus): Promise<CashBunch[]> {
    const { data } = await apiClient.get<CashBunch[]>(API_ENDPOINTS.CASH_BOOK.BUNCHES, {
      params: status ? { status } : {},
    });
    return data;
  },

  async bunch(bunchId: number): Promise<CashBunchDetail> {
    const { data } = await apiClient.get<CashBunchDetail>(
      API_ENDPOINTS.CASH_BOOK.BUNCH_DETAIL(bunchId),
    );
    return data;
  },

  async sendForApproval(payload: SendForApprovalPayload): Promise<CashBunchDetail> {
    const { data } = await apiClient.post<CashBunchDetail>(
      API_ENDPOINTS.CASH_BOOK.BUNCHES,
      payload,
    );
    return data;
  },

  async approve(bunchId: number, note = ''): Promise<CashBunchDetail> {
    const { data } = await apiClient.post<CashBunchDetail>(
      API_ENDPOINTS.CASH_BOOK.BUNCH_APPROVE(bunchId),
      { note },
    );
    return data;
  },

  /** A rejection must say why — the custodian has to know what to fix. */
  async reject(bunchId: number, note: string): Promise<CashBunchDetail> {
    const { data } = await apiClient.post<CashBunchDetail>(
      API_ENDPOINTS.CASH_BOOK.BUNCH_REJECT(bunchId),
      { note },
    );
    return data;
  },

  async resend(bunchId: number, remarks?: string): Promise<CashBunchDetail> {
    const { data } = await apiClient.post<CashBunchDetail>(
      API_ENDPOINTS.CASH_BOOK.BUNCH_RESEND(bunchId),
      remarks === undefined ? {} : { remarks },
    );
    return data;
  },
};
