/**
 * Advances against salary — the money that comes back off a wage.
 *
 * Its own client rather than another corner of `cashBook.api`, because the two
 * screens do not share a reader. The register is the custodian's; this is read
 * by accounts and decided by HR, and HR reach it without a cash book right at
 * all.
 */
import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

/**
 * Where an advance has got to with HR.
 *
 * There is deliberately no "not sent". Accounts hand the cash over and HR are
 * told; an advance nobody in HR has seen is the exact failure this screen
 * exists to stop, so a new one is with them from the moment it is recorded.
 */
export type SalaryAdvanceState = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A name an advance can be recorded against. Carries no pay. */
export interface SalaryAdvanceEmployee {
  id: number;
  employee_code: string;
  full_name: string;
  department: string;
  designation: string;
}

/** One advance against salary, as both halves of the screen read it. */
export interface SalaryAdvance {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  department: string;
  /** The day the cash was handed over. */
  paid_on: string;
  amount: string;
  reason: string;
  /** The voucher on the register it went out on, when the two were linked. */
  cash_entry: number | null;
  voucher_number: number | null;
  state: SalaryAdvanceState;
  /** The server's own wording, so the three states read alike everywhere. */
  state_label: string;
  decided_by: number | null;
  decided_by_name: string;
  decided_at: string | null;
  decision_note: string;
  /** The first of the salary month it comes off. Null until HR approve. */
  deduct_from: string | null;
  /** The day HR recorded it as actually taken off a wage. */
  deducted_on: string | null;
  /** Approved, and still to come off a wage — the figure HR are asked for. */
  is_outstanding: boolean;
  is_active: boolean;
  recorded_by_name: string;
  created_at: string;
}

/** A count and a total for one band of the list. */
export interface SalaryAdvanceBand {
  amount: string;
  count: number;
}

/**
 * The five figures the screen heads itself with.
 *
 * `outstanding` is the one HR actually want — approved and not yet taken off a
 * wage. Deliberately not `approved`, which goes on counting an advance that
 * was recovered months ago.
 */
export interface SalaryAdvanceSummary {
  pending: SalaryAdvanceBand;
  approved: SalaryAdvanceBand;
  outstanding: SalaryAdvanceBand;
  deducted: SalaryAdvanceBand;
  rejected: SalaryAdvanceBand;
}

export interface SalaryAdvanceList {
  results: SalaryAdvance[];
  /**
   * Over the whole book, not the narrowed list: a tab showing four pending
   * advances must not restate what is outstanding as though the rest were
   * empty.
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

export interface RecordSalaryAdvancePayload {
  employee: number;
  paid_on: string;
  amount: string;
  reason?: string;
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

  async record(payload: RecordSalaryAdvancePayload): Promise<SalaryAdvance> {
    const { data } = await apiClient.post<SalaryAdvance>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCES,
      payload,
    );
    return data;
  },

  /** Corrections, which the server allows only while HR have not decided. */
  async update(
    advanceId: number,
    payload: Partial<RecordSalaryAdvancePayload>,
  ): Promise<SalaryAdvance> {
    const { data } = await apiClient.patch<SalaryAdvance>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCE_DETAIL(advanceId),
      payload,
    );
    return data;
  },

  /** Takes it out of the list, keeping the row. */
  async cancel(advanceId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCE_DETAIL(advanceId));
  },

  /** HR's verdict. Several at once, each carrying its own. */
  async decide(payload: DecideSalaryAdvancePayload): Promise<SalaryAdvance[]> {
    const { data } = await apiClient.post<{ results: SalaryAdvance[] }>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCES_DECIDE,
      payload,
    );
    return data.results;
  },

  /** The amount has come off a wage. Only the payroll knows this. */
  async markDeducted(advanceId: number, deductedOn?: string): Promise<SalaryAdvance> {
    const { data } = await apiClient.post<SalaryAdvance>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCE_DEDUCTED(advanceId),
      deductedOn ? { deducted_on: deductedOn } : {},
    );
    return data;
  },

  /** Puts it back on the to-deduct list, leaving HR's verdict alone. */
  async undoDeduction(advanceId: number): Promise<SalaryAdvance> {
    const { data } = await apiClient.delete<SalaryAdvance>(
      API_ENDPOINTS.CASH_BOOK.SALARY_ADVANCE_DEDUCTED(advanceId),
    );
    return data;
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
