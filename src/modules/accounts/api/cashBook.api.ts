import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

export type CashDirection = 'IN' | 'OUT';
export type BunchStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
/**
 * Where an entry has got to with its approver.
 *
 * There is deliberately no "not sent": a payment is waiting from the moment
 * it is recorded, and a receipt never enters a queue at all.
 */
export type EntryApprovalStatus = 'NOT_REQUIRED' | BunchStatus;

/** The bunch an entry is in, as the register row needs to describe it. */
export interface CashBunchSummary {
  id: number;
  number: number;
  status: BunchStatus;
  status_label: string;
  sent_at: string;
  decided_at: string | null;
}


/** Somebody who can hold an advance: anyone with a login to this company. */
export interface CashPerson {
  id: number;
  name: string;
  email: string;
  /** What they are holding. Only filled in when the list was asked for holders. */
  balance: string | null;
}

/** The imprest debit card the factory draws its cash off. */
export interface AtmAccount {
  id: number;
  name: string;
  opening_balance: string;
  is_active: boolean;
  /** Opening, plus what was paid on, less what was drawn off. */
  balance: string;
}

/**
 * One line of a card statement or a person's advance ledger.
 *
 * `kind` is RECEIPT/WITHDRAWAL on a card, and GIVEN/RETURNED/EXPLAINED on a
 * person. `cash_entry_id` is set when the movement is a cash book row — a
 * withdrawal, or an expense that cleared part of an advance.
 */
export interface LedgerMovement {
  kind: string;
  id: number;
  date: string;
  amount: string;
  signed: string;
  balance_after: string;
  detail: string;
  cash_entry_id: number | null;
}

export interface AtmStatement {
  account: AtmAccount;
  movements: LedgerMovement[];
}

export type AdvanceDirection = 'GIVEN' | 'RETURNED';

export interface AdvanceEntry {
  id: number;
  person: number;
  person_name: string | null;
  entry_date: string;
  direction: AdvanceDirection;
  direction_label: string;
  amount: string;
  detail: string;
  is_active: boolean;
}

export interface AdvanceHolder {
  person: CashPerson;
  /** What they are still holding and have not explained. Can go negative. */
  balance: string;
}

export interface AdvanceHolderList {
  holders: AdvanceHolder[];
  total_outstanding: string;
}

export interface AdvanceStatement {
  person: CashPerson;
  balance: string;
  movements: LedgerMovement[];
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
  /** On a receipt: the card it was drawn off. */
  atm_account: number | null;
  atm_account_name: string | null;
  /** On a payment: whose advance it cleared. */
  advance_holder: number | null;
  advance_holder_name: string | null;
  gl_account_code: string;
  gl_account_name: string;
  item: string;
  detail: string;
  balance_after: string;
  bunch: CashBunchSummary | null;
  approval_status: EntryApprovalStatus;
  approval_label: string;
  approval_sent_at: string | null;
  approval_decided_at: string | null;
  approval_decided_by_name: string | null;
  approval_note: string;
  /** True while the entry sits with an approver, or has been approved. */
  is_locked: boolean;
  /** False for a cancelled entry, which is out of the balance but still read. */
  is_active: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The six figures the register heads itself with.
 *
 * Read down them and every rupee that came in is accounted for:
 * `cash_in − cash_out − awaiting_approval − cash_in_hand − advance_given`
 * comes to nothing left over. It is a proof the book adds up, not a count of
 * the drawer — nothing here has seen the actual notes.
 */
export interface CashReconciliation {
  cash_in: string;
  /** Payments somebody has agreed. An unapproved one is not spent yet. */
  cash_out: string;
  awaiting_approval: string;
  /** The notes that should be in the box: the book's balance less advances. */
  cash_in_hand: string;
  advance_given: string;
  difference: string;
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
  reconciliation: CashReconciliation;
}

export interface CashBookOptions {
  /** Active branches only — a retired one is not offered to a new entry. */
  branches: CashBranch[];
  directions: { value: CashDirection; label: string }[];
  bunch_statuses: { value: BunchStatus; label: string }[];
  approval_statuses: { value: EntryApprovalStatus; label: string }[];
  balance: string;
  gl_account_search_limit: number;
  /** What the register may be ordered by. */
  entry_sorts: string[];
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
  reconciliation: CashReconciliation;
  awaiting_approval: number;
  unsent_entries: number;
}

export interface ApprovalQueue {
  state: EntryApprovalStatus;
  results: CashEntry[];
  total: string;
  counts: Record<EntryApprovalStatus, number>;
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
  minAmount?: string;
  maxAmount?: string;
  /** `amount` / `-amount`. The register is paged, so the server sorts it. */
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface RecordEntryPayload {
  entry_date: string;
  direction: CashDirection;
  amount: string;
  branch?: number | null;
  atm_account?: number | null;
  advance_holder?: number | null;
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
    ...(params?.minAmount ? { min_amount: params.minAmount } : {}),
    ...(params?.maxAmount ? { max_amount: params.maxAmount } : {}),
    ...(params?.sort ? { sort: params.sort } : {}),
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
  // --- approval, which belongs to the entry ---------------------------
  async decideEntries(
    entryIds: number[],
    approve: boolean,
    note = '',
  ): Promise<CashEntry[]> {
    const { data } = await apiClient.post<CashEntry[]>(
      API_ENDPOINTS.CASH_BOOK.ENTRIES_DECIDE,
      { entry_ids: entryIds, note },
      { params: approve ? {} : { reject: 'true' } },
    );
    return data;
  },

  async approvalQueue(state: EntryApprovalStatus = 'PENDING'): Promise<ApprovalQueue> {
    const { data } = await apiClient.get<ApprovalQueue>(
      API_ENDPOINTS.CASH_BOOK.APPROVALS,
      { params: { state } },
    );
    return data;
  },

  // --- the card -------------------------------------------------------
  async atmAccounts(includeClosed = false): Promise<AtmAccount[]> {
    const { data } = await apiClient.get<AtmAccount[]>(API_ENDPOINTS.CASH_BOOK.ATM, {
      params: includeClosed ? { include_closed: 'true' } : {},
    });
    return data;
  },

  async atmStatement(accountId: number): Promise<AtmStatement> {
    const { data } = await apiClient.get<AtmStatement>(
      API_ENDPOINTS.CASH_BOOK.ATM_DETAIL(accountId),
    );
    return data;
  },

  async createAtmAccount(payload: {
    name: string;
    opening_balance?: string;
  }): Promise<AtmAccount> {
    const { data } = await apiClient.post<AtmAccount>(API_ENDPOINTS.CASH_BOOK.ATM, payload);
    return data;
  },

  /** Money paid onto the card. The ATM screen's one write. */
  async addAtmCash(
    accountId: number,
    payload: { received_on: string; amount: string; detail?: string },
  ): Promise<void> {
    await apiClient.post(API_ENDPOINTS.CASH_BOOK.ATM_RECEIPTS(accountId), payload);
  },

  async cancelAtmReceipt(receiptId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CASH_BOOK.ATM_RECEIPT_DETAIL(receiptId));
  },

  // --- advances -------------------------------------------------------
  async advanceHolders(): Promise<AdvanceHolderList> {
    const { data } = await apiClient.get<AdvanceHolderList>(
      API_ENDPOINTS.CASH_BOOK.ADVANCE_HOLDERS,
    );
    return data;
  },

  async advanceStatement(personId: number): Promise<AdvanceStatement> {
    const { data } = await apiClient.get<AdvanceStatement>(
      API_ENDPOINTS.CASH_BOOK.ADVANCE_STATEMENT(personId),
    );
    return data;
  },

  /** Hand cash over, or take it back. Neither touches the cash book. */
  async recordAdvance(payload: {
    person: number;
    entry_date: string;
    direction: AdvanceDirection;
    amount: string;
    detail?: string;
  }): Promise<AdvanceEntry> {
    const { data } = await apiClient.post<AdvanceEntry>(
      API_ENDPOINTS.CASH_BOOK.ADVANCES,
      payload,
    );
    return data;
  },

  async cancelAdvance(entryId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CASH_BOOK.ADVANCE_DETAIL(entryId));
  },

  /**
   * Who may be picked as a person.
   *
   * `holdingOnly` narrows to people who have been given an advance, which is
   * who a return can come from and whose advance a payment can clear. Without
   * it, everybody — the list a new advance may be given to.
   */
  async people(search = '', holdingOnly = false): Promise<CashPerson[]> {
    const { data } = await apiClient.get<CashPerson[]>(API_ENDPOINTS.CASH_BOOK.PEOPLE, {
      params: {
        ...(search ? { search } : {}),
        ...(holdingOnly ? { holding: 'true' } : {}),
      },
    });
    return data;
  },

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
