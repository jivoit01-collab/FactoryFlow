import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

// ---------------------------------------------------------------------------
// Shapes, as `factory_app/sap_finance/views.py` and
// `sap_client/hana/finance_reader.py` send them.
// ---------------------------------------------------------------------------

export interface JournalEntryLine {
  line_id: number | null;
  account: string;
  account_name: string;
  short_name: string;
  debit: number;
  credit: number;
  contra_account: string;
  line_memo: string;
  project: string;
  cost_centers: string[];
}

export interface JournalEntry {
  trans_id: number;
  number: number | null;
  ref_date: string | null;
  due_date: string | null;
  tax_date: string | null;
  memo: string;
  base_ref: string;
  trans_type: string;
  trans_type_label: string;
  total_debit: number;
  total_credit: number;
  lines: JournalEntryLine[];
}

export interface JournalEntryFilters {
  number?: string;
  reference?: string;
  trans_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface LedgerLine {
  trans_id: number | null;
  date: string | null;
  due_date: string | null;
  document_date: string | null;
  debit: number;
  credit: number;
  balance: number;
  memo: string;
  reference: string;
  bill_no: string;
  trans_type: string;
  trans_type_label: string;
  offset_account: string;
  offset_name: string;
}

export interface Ledger {
  account: string;
  kind: 'G/L' | 'BP';
  name: string;
  balance: number;
  closing_balance: number;
  currency: string;
  total: number;
  lines: LedgerLine[];
}

export interface LedgerFilters {
  account: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface LedgerAccountOption {
  code: string;
  name: string;
  kind: 'G/L' | 'Vendor' | 'Customer' | 'BP';
}

export interface ChartAccount {
  code: string;
  name: string;
  parent: string | null;
  drawer: number;
  level: number;
  postable: boolean;
  type: string;
  type_label: string;
  currency: string;
  balance: number;
  rollup: number;
  children: number;
  frozen: boolean;
  details: string;
  match?: boolean;
}

export interface ChartDrawer {
  id: number;
  label: string;
  count: number;
  postable: number;
  total: number;
}

export interface ChartOfAccounts {
  accounts: ChartAccount[];
  drawers: ChartDrawer[];
  total: number;
  postable: number;
}

export interface BudgetLine {
  line_id?: number | null;
  month: string;
  fixed_amount: number;
  variable_amount: number;
  sub_budget: string;
}

export interface Budget {
  doc_entry: number;
  doc_num: number | null;
  budget: string;
  sub_budget: string;
  created_at: string | null;
  lines: BudgetLine[];
}

export interface BudgetPayload {
  budget: string;
  sub_budget: string;
  lines: Omit<BudgetLine, 'line_id'>[];
}

export interface BudgetChange {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  action_label: string;
  doc_entry: number | null;
  budget_code: string;
  sub_budget_code: string;
  line_count: number;
  changed_by: string;
  created_at: string;
}

/** A cost-dimension code from `/sap-lookups/costing-codes/`. */
export interface CostingCode {
  code: string;
  name: string;
}

function compact<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Partial<T>;
}

export const sapFinanceApi = {
  journalEntries: async (filters: JournalEntryFilters): Promise<JournalEntry[]> => {
    const { data } = await apiClient.get<{ results: JournalEntry[] }>(
      API_ENDPOINTS.SAP_FINANCE.JOURNAL_ENTRIES,
      { params: compact(filters) },
    );
    return data.results;
  },

  generalLedger: async (filters: LedgerFilters): Promise<Ledger> => {
    const { data } = await apiClient.get<Ledger>(API_ENDPOINTS.SAP_FINANCE.GENERAL_LEDGER, {
      params: compact(filters),
    });
    return data;
  },

  ledgerAccounts: async (search: string): Promise<LedgerAccountOption[]> => {
    const { data } = await apiClient.get<LedgerAccountOption[]>(
      API_ENDPOINTS.SAP_FINANCE.LEDGER_ACCOUNTS,
      { params: { search } },
    );
    return data;
  },

  chartOfAccounts: async (search: string, drawer?: number): Promise<ChartOfAccounts> => {
    const { data } = await apiClient.get<ChartOfAccounts>(
      API_ENDPOINTS.SAP_FINANCE.CHART_OF_ACCOUNTS,
      { params: compact({ search, drawer }) },
    );
    return data;
  },

  budgets: async (): Promise<Budget[]> => {
    const { data } = await apiClient.get<Budget[]>(API_ENDPOINTS.SAP_FINANCE.BUDGETS);
    return data;
  },

  budget: async (docEntry: number): Promise<Budget> => {
    const { data } = await apiClient.get<Budget>(API_ENDPOINTS.SAP_FINANCE.BUDGET_DETAIL(docEntry));
    return data;
  },

  createBudget: async (payload: BudgetPayload): Promise<Budget> => {
    const { data } = await apiClient.post<Budget>(API_ENDPOINTS.SAP_FINANCE.BUDGETS, payload);
    return data;
  },

  updateBudget: async (docEntry: number, payload: BudgetPayload): Promise<Budget> => {
    const { data } = await apiClient.put<Budget>(
      API_ENDPOINTS.SAP_FINANCE.BUDGET_DETAIL(docEntry),
      payload,
    );
    return data;
  },

  deleteBudget: async (docEntry: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.SAP_FINANCE.BUDGET_DETAIL(docEntry));
  },

  budgetChanges: async (docEntry?: number): Promise<BudgetChange[]> => {
    const { data } = await apiClient.get<BudgetChange[]>(API_ENDPOINTS.SAP_FINANCE.BUDGET_CHANGES, {
      params: compact({ doc_entry: docEntry }),
    });
    return data;
  },

  costingCodes: async (dimension: number): Promise<CostingCode[]> => {
    const { data } = await apiClient.get<CostingCode[]>(API_ENDPOINTS.SAP_LOOKUPS.COSTING_CODES, {
      params: { dimension, limit: 500 },
    });
    return data;
  },
};
