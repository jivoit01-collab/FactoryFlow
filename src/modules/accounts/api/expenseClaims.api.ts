import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

export type ExpenseClaimStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

/** A bill, receipt or photograph behind an expense. */
export interface ExpenseAttachment {
  id: number;
  original_filename: string;
  size_bytes: number;
  url: string | null;
  uploaded_at: string;
}

export interface ExpenseAttachResult {
  attached: ExpenseAttachment[];
  refused: { filename: string; reason: unknown }[];
}

export interface ExpenseClaim {
  id: number;
  /** The page's "Branch": the company. */
  company_code: string;
  company_name: string;
  /** SAP's dimension 3 budget, as it read when saved. */
  budget_code: string;
  budget_name: string;
  /** Blank when the submitter did not know the account... */
  gl_account_code: string;
  gl_account_name: string;
  /** ...and said what the expense is for instead. */
  gl_description: string;
  comment: string;
  amount: string;
  attachments: ExpenseAttachment[];
  status: ExpenseClaimStatus;
  status_label: string;
  submitted_by: number | null;
  submitted_by_name: string | null;
  submitted_at: string;
  decided_at: string | null;
  decided_by_name: string | null;
  /** Why it was rejected. Blank otherwise. */
  decision_note: string;
}

export interface ExpenseClaimList {
  results: ExpenseClaim[];
  /** How many sit in each status, over the same set the list is drawn from. */
  counts: Record<ExpenseClaimStatus, number>;
}

export interface ExpenseListParams {
  status?: ExpenseClaimStatus;
  /** Only those I put in. Without it, every expense (approvers only). */
  by_me?: boolean;
}

/** Oil, Mart or Beverages. */
export interface ExpenseCompany {
  code: string;
  name: string;
}

export interface ExpenseBudget {
  budget_code: string;
  budget_name: string;
  /** Factory: what a new expense starts on. */
  is_default: boolean;
}

export interface SapGLAccount {
  account_code: string;
  account_name: string;
}

export interface SubmitExpensePayload {
  company: string;
  budget_code: string;
  /** One of these two: the account, or what the expense is for. */
  gl_account_code: string;
  gl_description: string;
  comment: string;
  amount: string;
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

  /** Bills on an expense, several at once. Each is checked on its own. */
  async attach(claimId: number, files: File[]): Promise<ExpenseAttachResult> {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    const { data } = await apiClient.post<ExpenseAttachResult>(
      API_ENDPOINTS.EXPENSE_CLAIMS.ATTACHMENTS(claimId),
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        // The form says what went wrong and that the expense itself is saved.
        suppressErrorToast: true,
      },
    );
    return data;
  },

  async removeAttachment(attachmentId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.EXPENSE_CLAIMS.ATTACHMENT_DETAIL(attachmentId), {
      suppressErrorToast: true,
    });
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
};
