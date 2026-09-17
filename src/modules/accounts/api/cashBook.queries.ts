import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdvanceDirection,
  type BranchPayload,
  type BunchStatus,
  cashBookApi,
  type CashEntryListParams,
  type EntryApprovalStatus,
  type RecordEntryPayload,
  type SendForApprovalPayload,
  type UpdateEntryPayload,
} from './cashBook.api';

export const CASH_BOOK_QUERY_KEYS = {
  all: ['cash-book'] as const,
  options: () => [...CASH_BOOK_QUERY_KEYS.all, 'options'] as const,
  entries: (params?: CashEntryListParams) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'entries', params ?? {}] as const,
  summary: (params?: CashEntryListParams) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'summary', params ?? {}] as const,
  glAccounts: (search: string) => [...CASH_BOOK_QUERY_KEYS.all, 'gl-accounts', search] as const,
  branches: (includeRetired: boolean) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'branches', includeRetired] as const,
  atmAccounts: (includeClosed: boolean) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'atm', includeClosed] as const,
  atmStatement: (id: number) => [...CASH_BOOK_QUERY_KEYS.all, 'atm', 'statement', id] as const,
  advanceHolders: () => [...CASH_BOOK_QUERY_KEYS.all, 'advance-holders'] as const,
  advanceStatement: (id: number) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'advance-statement', id] as const,
  approvals: (state: string) => [...CASH_BOOK_QUERY_KEYS.all, 'approvals', state] as const,
  people: (search: string, holdingOnly: boolean) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'people', search, holdingOnly] as const,
  bunches: (status?: BunchStatus) => [...CASH_BOOK_QUERY_KEYS.all, 'bunches', status ?? ''] as const,
  bunch: (id: number) => [...CASH_BOOK_QUERY_KEYS.all, 'bunch', id] as const,
};

/**
 * The branches, the balance and this user's rights.
 *
 * Long-lived: none of it changes within a session, and both pages read it on
 * every render. The balance it carries is a starting figure — the register's
 * own response carries the live one.
 */
export function useCashBookOptions() {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.options(),
    queryFn: () => cashBookApi.options(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCashEntries(params?: CashEntryListParams) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.entries(params),
    queryFn: () => cashBookApi.entries(params),
  });
}

/**
 * SAP's chart of accounts, searched on the server.
 *
 * `enabled` is the caller's: the picker only asks once somebody has typed, so
 * a page that never opens the entry form never touches SAP.
 */
export function useGLAccounts(search: string, enabled = true) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.glAccounts(search),
    queryFn: () => cashBookApi.glAccounts(search),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** The branch list. The settings page is the only caller wanting retired ones. */
export function useCashBranches(includeRetired = false) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.branches(includeRetired),
    queryFn: () => cashBookApi.branches(includeRetired),
  });
}

export function useCashBunches(status?: BunchStatus) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.bunches(status),
    queryFn: () => cashBookApi.bunches(status),
  });
}

export function useCashBunch(id: number | null) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.bunch(id ?? 0),
    queryFn: () => cashBookApi.bunch(id as number),
    enabled: id != null,
  });
}

/**
 * Every write invalidates the whole module.
 *
 * Coarser than it needs to be, and deliberately so: a change to one entry
 * moves the running balance of every entry after it, so there is no smaller
 * correct invalidation.
 */
function useCashBookMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CASH_BOOK_QUERY_KEYS.all });
    },
  });
}

export function useRecordCashEntry() {
  return useCashBookMutation((payload: RecordEntryPayload) => cashBookApi.record(payload));
}

export function useUpdateCashEntry() {
  return useCashBookMutation((vars: { id: number; payload: UpdateEntryPayload }) =>
    cashBookApi.update(vars.id, vars.payload),
  );
}

export function useCancelCashEntry() {
  return useCashBookMutation((id: number) => cashBookApi.cancel(id));
}

export function useSendForApproval() {
  return useCashBookMutation((payload: SendForApprovalPayload) =>
    cashBookApi.sendForApproval(payload),
  );
}

export function useCreateCashBranch() {
  return useCashBookMutation((payload: BranchPayload) => cashBookApi.createBranch(payload));
}

export function useUpdateCashBranch() {
  return useCashBookMutation((vars: { id: number; payload: Partial<BranchPayload> }) =>
    cashBookApi.updateBranch(vars.id, vars.payload),
  );
}

export function useRetireCashBranch() {
  return useCashBookMutation((id: number) => cashBookApi.retireBranch(id));
}


export function useAtmAccounts(includeClosed = false) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.atmAccounts(includeClosed),
    queryFn: () => cashBookApi.atmAccounts(includeClosed),
  });
}

export function useAtmStatement(accountId: number | null) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.atmStatement(accountId ?? 0),
    queryFn: () => cashBookApi.atmStatement(accountId as number),
    enabled: accountId != null,
  });
}

export function useAdvanceHolders() {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.advanceHolders(),
    queryFn: () => cashBookApi.advanceHolders(),
  });
}

export function useAdvanceStatement(personId: number | null) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.advanceStatement(personId ?? 0),
    queryFn: () => cashBookApi.advanceStatement(personId as number),
    enabled: personId != null,
  });
}

/**
 * Who may be picked as a person. Searched on the server — it is the staff list.
 *
 * `holdingOnly` is the difference between "who may be given an advance"
 * (anybody) and "whose advance is this settling" (only people holding one).
 */
export function useCashPeople(search = '', holdingOnly = false) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.people(search, holdingOnly),
    queryFn: () => cashBookApi.people(search, holdingOnly),
    staleTime: 5 * 60 * 1000,
  });
}

/** The entries waiting on somebody. Entries, not bunches. */
export function useApprovalQueue(state: EntryApprovalStatus = 'PENDING') {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.approvals(state),
    queryFn: () => cashBookApi.approvalQueue(state),
  });
}

export function useDecideEntries() {
  return useCashBookMutation((vars: { ids: number[]; approve: boolean; note?: string }) =>
    cashBookApi.decideEntries(vars.ids, vars.approve, vars.note ?? ''),
  );
}

export function useCreateAtmAccount() {
  return useCashBookMutation((payload: { name: string; opening_balance?: string }) =>
    cashBookApi.createAtmAccount(payload),
  );
}

export function useAddAtmCash() {
  return useCashBookMutation(
    (vars: {
      accountId: number;
      payload: { received_on: string; amount: string; detail?: string };
    }) => cashBookApi.addAtmCash(vars.accountId, vars.payload),
  );
}

export function useCancelAtmReceipt() {
  return useCashBookMutation((id: number) => cashBookApi.cancelAtmReceipt(id));
}

export function useRecordAdvance() {
  return useCashBookMutation(
    (payload: {
      person: number;
      entry_date: string;
      direction: AdvanceDirection;
      amount: string;
      detail?: string;
    }) => cashBookApi.recordAdvance(payload),
  );
}

export function useCancelAdvance() {
  return useCashBookMutation((id: number) => cashBookApi.cancelAdvance(id));
}

export function useApproveCashBunch() {
  return useCashBookMutation((vars: { id: number; note?: string }) =>
    cashBookApi.approve(vars.id, vars.note ?? ''),
  );
}

export function useRejectCashBunch() {
  return useCashBookMutation((vars: { id: number; note: string }) =>
    cashBookApi.reject(vars.id, vars.note),
  );
}

export function useResendCashBunch() {
  return useCashBookMutation((vars: { id: number; remarks?: string }) =>
    cashBookApi.resend(vars.id, vars.remarks),
  );
}
