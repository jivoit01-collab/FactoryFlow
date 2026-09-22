/**
 * Advances against salary — the money that comes back off a wage.
 *
 * Its own client rather than another corner of `cashBook.api`, because the two
 * screens do not share a reader. The register is the custodian's; this list is
 * read by accounts and decided by HR, and HR reach it without a cash book
 * right at all.
 *
 * Three calls: the list, the act of naming who an advance was for, and HR's
 * verdict on it. Correcting, withdrawing and ticking off a deduction the
 * server also takes; the screen does not ask for them.
 */
import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

/**
 * Where an advance has got to with HR.
 *
 * `NOT_SENT` is a state of the screen rather than of a record: a voucher on
 * the register that nobody has shown HR. It is what almost every historical
 * row is, and it has no HR record behind it — so no employee, no verdict and
 * no salary month.
 */
export type SalaryAdvanceState = 'NOT_SENT' | 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * One line of the screen: a voucher on the register, carrying HR's verdict
 * when it has one.
 *
 * Built by the server from two sources, so there is no one model behind it.
 * `id` is the HR record's and is null on a voucher nobody has sent to HR;
 * `cash_entry` is the register's and is null on an advance recorded with no
 * voucher behind it — the cash went out by bank transfer, or on a line nobody
 * joined up.
 */
export interface SalaryAdvanceRow {
  id: number | null;
  state: SalaryAdvanceState;
  /** The server's own wording, so every state reads alike everywhere. */
  state_label: string;
  cash_entry: number | null;
  voucher_number: number | null;
  /** The day the cash was handed over. */
  paid_on: string;
  amount: string;
  /**
   * The register's own words — its Item ("Parveen khatun"), or the narrative
   * when Item is one of the custodian's generic ones ("Advance", "Salary").
   *
   * Rendered verbatim, and it identifies nobody: the server matches no name
   * against the directory and parses none out of prose. Naming the person is
   * HR's act, and it happens when they send it for deduction.
   */
  description: string;
  gl_account_name: string;

  /** The person HR attributed it to. Empty until somebody sent it to them. */
  employee: number | null;
  employee_name: string;
  employee_code: string;
  department: string;
  reason: string;

  decided_at: string | null;
  decided_by_name: string;
  decision_note: string;
  /** The first of the salary month it comes off. Null until HR approve. */
  deduct_from: string | null;
  /** The day HR recorded it as actually taken off a wage. */
  deducted_on: string | null;
  /** Approved, and still to come off a wage. */
  is_outstanding: boolean;
  is_active: boolean;
}

/** A count and a total for one band of the list. */
export interface SalaryAdvanceBand {
  amount: string;
  count: number;
}

/**
 * The bands the server heads the list with.
 *
 * `not_sent` is read off the register rather than off the HR table, because
 * that is the whole point of it: vouchers that went out against wages and
 * which nobody in HR has been shown. `outstanding` is approved and not yet
 * taken off a wage — deliberately not `approved`, which goes on counting an
 * advance that was recovered months ago.
 */
export interface SalaryAdvanceSummary {
  not_sent: SalaryAdvanceBand;
  pending: SalaryAdvanceBand;
  approved: SalaryAdvanceBand;
  outstanding: SalaryAdvanceBand;
  deducted: SalaryAdvanceBand;
  rejected: SalaryAdvanceBand;
}

export interface SalaryAdvanceList {
  results: SalaryAdvanceRow[];
  /**
   * Over the whole book, not the narrowed list: a filtered list must not
   * restate what is outstanding as though the rest were empty.
   */
  summary: SalaryAdvanceSummary;
  /** Whether this reader may write an advance down. Accounts', not HR's. */
  can_record: boolean;
  /** Whether this reader may decide one. HR's, not the cash approver's. */
  can_decide: boolean;
}

export interface SalaryAdvanceListParams {
  state?: SalaryAdvanceState;
  employee?: number;
  include_cancelled?: boolean;
}

/** A name an advance can be recorded against. Carries no pay. */
export interface SalaryAdvanceEmployee {
  id: number;
  employee_code: string;
  full_name: string;
  department: string;
  designation: string;
}

/**
 * Naming who a voucher's cash went to, which is what puts it in front of HR.
 *
 * The register cannot answer this, and the server will not guess: an advance
 * reaches HR attributed to somebody or not at all.
 */
export interface RecordSalaryAdvancePayload {
  employee: number;
  paid_on: string;
  amount: string;
  reason?: string;
  /** The voucher on the register it went out on, when there was one. */
  cash_entry?: number | null;
}

export interface DecideSalaryAdvancePayload {
  advance_ids: number[];
  approve: boolean;
  /** Required when rejecting — the cash is already with them. */
  note?: string;
  /** Defaulted on the server to the month after it was paid. */
  deduct_from?: string | null;
}

/** One advance as the write calls answer with it — the record, not the row. */
export interface SalaryAdvance {
  id: number;
  employee: number;
  employee_name: string;
  paid_on: string;
  amount: string;
  state: Exclude<SalaryAdvanceState, 'NOT_SENT'>;
  state_label: string;
  deduct_from: string | null;
  deducted_on: string | null;
}

export const salaryAdvancesApi = {
  async list(params?: SalaryAdvanceListParams): Promise<SalaryAdvanceList> {
    const { data } = await apiClient.get<SalaryAdvanceList>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCES,
      {
        params: {
          ...(params?.state ? { state: params.state } : {}),
          ...(params?.employee ? { employee: params.employee } : {}),
          ...(params?.include_cancelled ? { include_cancelled: 'true' } : {}),
        },
      },
    );
    return data;
  },

  /**
   * Write down who the cash went to. It reaches HR as PENDING at once —
   * telling them is the whole purpose of the row, so there is no draft.
   */
  async record(payload: RecordSalaryAdvancePayload): Promise<SalaryAdvance> {
    const { data } = await apiClient.post<SalaryAdvance>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCES,
      payload,
    );
    return data;
  },

  /** HR's verdict. Several at once, each carrying its own. */
  async decide(payload: DecideSalaryAdvancePayload): Promise<SalaryAdvance[]> {
    const { data } = await apiClient.post<{ results: SalaryAdvance[] }>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCES_DECIDE,
      payload,
    );
    return data.results;
  },

  /** The payroll, searched on the server and capped. */
  async employees(search = ''): Promise<SalaryAdvanceEmployee[]> {
    const { data } = await apiClient.get<SalaryAdvanceEmployee[]>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCE_EMPLOYEES,
      { params: search ? { search } : {} },
    );
    return data;
  },
};
