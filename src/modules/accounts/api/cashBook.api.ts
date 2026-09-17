import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

export type CashDirection = 'IN' | 'OUT';
/**
 * Where an entry has got to with its approver.
 *
 * There is deliberately no "not sent": a payment is waiting from the moment
 * it is recorded, and a receipt never enters a queue at all.
 */
export type EntryApprovalStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

/** The bunch an entry is in, as the register row needs to describe it. */
export interface CashBunchSummary {
  id: number;
  number: number;
  sent_at: string | null;
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
  /** Factory cash in somebody's pocket that they have not explained yet. */
  advance_given: string;
  /**
   * The other direction, and not netted against the one above.
   *
   * Somebody paid for something themselves and said what for. The expense is
   * in the book so the balance has dropped, but the notes never left the
   * drawer -- so the box holds more than the book alone implies, by exactly
   * this, until they are paid back.
   */
  owed_to_people: string;
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
  approval_statuses: { value: EntryApprovalStatus; label: string }[];
  balance: string;
  gl_account_search_limit: number;
  /** The register's columns, each filterable and sortable. */
  entry_columns: string[];
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

/**
 * A batch of approved vouchers, bundled to be mailed to head office.
 *
 * Paperwork, not a decision: everything in it was approved one by one before
 * it was bundled. `total` is derived from the contents, so it cannot disagree
 * with them — the old spreadsheet used that figure as the batch's own name.
 */
export interface CashBunch {
  id: number;
  number: number;
  remarks: string;
  created_at: string;
  created_by_name: string | null;
  /** Null until somebody says it has gone — the app does not send the mail. */
  sent_at: string | null;
  sent_by_name: string | null;
  is_sent: boolean;
  entry_count: number;
  total: string;
}

export interface CashBunchDetail extends CashBunch {
  entries: CashEntry[];
}

/**
 * One column's ticked values, keyed by column name.
 *
 * An empty or missing list means that column is not filtering — nothing
 * ticked is "show everything", not "show nothing".
 */
export type ColumnFilters = Record<string, string[]>;

export interface CashEntryListParams {
  includeCancelled?: boolean;
  /** `amount` / `-amount`. The register is paged, so the server sorts it. */
  sort?: string;
  filters?: ColumnFilters;
  page?: number;
  pageSize?: number;
}

export interface ColumnValue {
  value: string;
  label: string;
  count: number;
}

export interface ColumnValues {
  column: string;
  values: ColumnValue[];
  /** True when the column holds more distinct values than the list can carry. */
  truncated: boolean;
  total: number;
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

/**
 * Column filters go up as `f_branch=Oil|Common`.
 *
 * A pipe rather than a comma: commas appear inside G/L names and all over a
 * detail line, and would split a value in half.
 */
function columnParams(filters?: ColumnFilters) {
  const out: Record<string, string> = {};
  for (const [column, values] of Object.entries(filters ?? {})) {
    if (values.length > 0) out[`f_${column}`] = values.join('|');
  }
  return out;
}

function listParams(params?: CashEntryListParams) {
  return {
    ...(params?.includeCancelled ? { include_cancelled: 'true' } : {}),
    ...(params?.sort ? { sort: params.sort } : {}),
    ...columnParams(params?.filters),
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

  /** What one column holds, for its filter drop-down. */
  async columnValues(
    column: string,
    filters?: ColumnFilters,
    includeCancelled = false,
  ): Promise<ColumnValues> {
    const { data } = await apiClient.get<ColumnValues>(
      API_ENDPOINTS.CASH_BOOK.ENTRY_COLUMNS,
      {
        params: {
          column,
          ...columnParams(filters),
          ...(includeCancelled ? { include_cancelled: 'true' } : {}),
        },
      },
    );
    return data;
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

  async bunches(state?: 'SENT' | 'UNSENT'): Promise<CashBunch[]> {
    const { data } = await apiClient.get<CashBunch[]>(API_ENDPOINTS.CASH_BOOK.BUNCHES, {
      params: state ? { state } : {},
    });
    return data;
  },

  async bunch(bunchId: number): Promise<CashBunchDetail> {
    const { data } = await apiClient.get<CashBunchDetail>(
      API_ENDPOINTS.CASH_BOOK.BUNCH_DETAIL(bunchId),
    );
    return data;
  },

  /** Bundle approved vouchers into a batch. Only approved ones may go in. */
  async createBunch(entryIds: number[], remarks = ''): Promise<CashBunchDetail> {
    const { data } = await apiClient.post<CashBunchDetail>(
      API_ENDPOINTS.CASH_BOOK.BUNCHES,
      { entry_ids: entryIds, remarks },
    );
    return data;
  },

  /**
   * The batch as the spreadsheet that gets mailed.
   *
   * Fetched as a blob rather than linked to: the endpoint is permission
   * checked, so the request has to carry the auth header and a plain
   * `<a href>` would not.
   */
  async exportBunch(bunchId: number): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(
      API_ENDPOINTS.CASH_BOOK.BUNCH_EXPORT(bunchId),
      { responseType: 'blob' },
    );
    return data;
  },

  async markBunchSent(bunchId: number, sent = true): Promise<CashBunch> {
    const { data } = await apiClient.post<CashBunch>(
      API_ENDPOINTS.CASH_BOOK.BUNCH_SENT(bunchId),
      { sent },
    );
    return data;
  },

  /** Take one voucher back out of a batch that has not gone yet. */
  async removeFromBunch(entryId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CASH_BOOK.ENTRY_BUNCH(entryId));
  },
};
