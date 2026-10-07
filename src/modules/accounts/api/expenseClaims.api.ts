import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

export type ExpenseClaimStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface ExpenseClaim {
  id: number;
  /** The page's "Branch": the company. */
  company_code: string;
  company_name: string;
  /** The page's "Budget": SAP's business place (OBPL), as it read when put in. */
  budget_id: number;
  budget_name: string;
  gl_account_code: string;
  gl_account_name: string;
  comment: string;
  amount: string;
  status: ExpenseClaimStatus;
  status_label: string;
  submitted_by: number | null;
  submitted_by_name: string | null;
  submitted_at: string;
  /** Who it was sent to. */
  approver: number;
  approver_name: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  /** Why the HOD rejected it. Blank otherwise. */
  decision_note: string;
}

export interface ExpenseClaimList {
  results: ExpenseClaim[];
  /** How many sit in each status, over the same set the list is drawn from. */
  counts: Record<ExpenseClaimStatus, number>;
}

export interface ExpenseListParams {
  status?: ExpenseClaimStatus;
  /** Only those I put in. */
  by_me?: boolean;
  /** Only those sent to me. */
  for_me?: boolean;
}

/** Oil, Mart or Beverages. */
export interface ExpenseCompany {
  code: string;
  name: string;
}

export interface ExpenseBudget {
  budget_id: number;
  budget_name: string;
  /** FACTORY: what a new expense starts on. */
  is_default: boolean;
}

export interface SapGLAccount {
  account_code: string;
  account_name: string;
}

export interface ExpenseApprover {
  id: number;
  name: string;
  email: string;
}

export interface SubmitExpensePayload {
  company: string;
  budget_id: number;
  gl_account_code: string;
  comment: string;
  amount: string;
  approver: number;
}

export const expenseClaimsApi = {
  async submit(payload: SubmitExpensePayload): Promise<ExpenseClaim> {
    const { data } = await apiClient.post<ExpenseClaim>(
      API_ENDPOINTS.EXPENSE_CLAIMS.CLAIMS,
      payload,
    );
    return data;
  },

  async list(params: ExpenseListParams): Promise<ExpenseClaimList> {
    const { data } = await apiClient.get<ExpenseClaimList>(API_ENDPOINTS.EXPENSE_CLAIMS.CLAIMS, {
      params: {
        status: params.status,
        by_me: params.by_me ? 1 : undefined,
        for_me: params.for_me ? 1 : undefined,
      },
    });
    return data;
  },

  /** The whole expense again: its submitter's edit, until it is approved. */
  async update(claimId: number, payload: SubmitExpensePayload): Promise<ExpenseClaim> {
    const { data } = await apiClient.put<ExpenseClaim>(
      API_ENDPOINTS.EXPENSE_CLAIMS.DETAIL(claimId),
      payload,
    );
    return data;
  },

  async decide(claimId: number, approve: boolean, note = ''): Promise<ExpenseClaim> {
    const { data } = await apiClient.post<ExpenseClaim>(
      API_ENDPOINTS.EXPENSE_CLAIMS.DECIDE(claimId),
      { approve, note },
    );
    return data;
  },

  async companies(): Promise<ExpenseCompany[]> {
    const { data } = await apiClient.get<ExpenseCompany[]>(API_ENDPOINTS.EXPENSE_CLAIMS.COMPANIES);
    return data;
  },

  async budgets(company: string): Promise<ExpenseBudget[]> {
    const { data } = await apiClient.get<ExpenseBudget[]>(API_ENDPOINTS.EXPENSE_CLAIMS.BUDGETS, {
      params: { company },
    });
    return data;
  },

  async glAccounts(company: string, search: string): Promise<SapGLAccount[]> {
    const { data } = await apiClient.get<SapGLAccount[]>(API_ENDPOINTS.EXPENSE_CLAIMS.GL_ACCOUNTS, {
      params: { company, search },
    });
    return data;
  },

  /** Every active user but the caller. */
  async approvers(): Promise<ExpenseApprover[]> {
    const { data } = await apiClient.get<ExpenseApprover[]>(API_ENDPOINTS.EXPENSE_CLAIMS.APPROVERS);
    return data;
  },
};
