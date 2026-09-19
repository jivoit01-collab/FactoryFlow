import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AdvanceDirection,
  type BranchPayload,
  cashBookApi,
  type CashEntryListParams,
  type ColumnFilters,
  type EntryApprovalStatus,
  type RecordEntryPayload,
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
  advanceStatement: (id: number, includeCancelled = false) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'advance-statement', id, includeCancelled] as const,
  approvals: (state: string) => [...CASH_BOOK_QUERY_KEYS.all, 'approvals', state] as const,
  approvers: () => [...CASH_BOOK_QUERY_KEYS.all, 'approvers'] as const,
  approverCandidates: (search: string) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'approver-candidates', search] as const,
  columnValues: (column: string, filters: ColumnFilters, includeCancelled: boolean) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'column', column, filters, includeCancelled] as const,
  people: (search: string, holdingOnly: boolean) =>
    [...CASH_BOOK_QUERY_KEYS.all, 'people', search, holdingOnly] as const,
  bunches: (state?: string) => [...CASH_BOOK_QUERY_KEYS.all, 'bunches', state ?? ''] as const,
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

/**
 * The values behind one column's filter button.
 *
 * `enabled` is the caller's: the list is only fetched when the drop-down is
 * actually opened, so a page with twelve filterable columns makes no requests
 * until somebody uses one.
 */
export function useColumnValues(
  column: string,
  filters: ColumnFilters,
  includeCancelled: boolean,
  enabled: boolean,
) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.columnValues(column, filters, includeCancelled),
    queryFn: () => cashBookApi.columnValues(column, filters, includeCancelled),
    enabled,
    staleTime: 60 * 1000,
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

export function useCashBunches(state?: 'SENT' | 'UNSENT') {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.bunches(state),
    queryFn: () => cashBookApi.bunches(state),
  });
}

export function useCreateBunch() {
  return useCashBookMutation((vars: { ids: number[]; remarks?: string }) =>
    cashBookApi.createBunch(vars.ids, vars.remarks ?? ''),
  );
}

export function useMarkBunchSent() {
  return useCashBookMutation((vars: { id: number; sent: boolean }) =>
    cashBookApi.markBunchSent(vars.id, vars.sent),
  );
}

export function useRemoveFromBunch() {
  return useCashBookMutation((entryId: number) => cashBookApi.removeFromBunch(entryId));
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

export function useAdvanceStatement(
  personId: number | null,
  includeCancelled = false,
) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.advanceStatement(personId ?? 0, includeCancelled),
    queryFn: () => cashBookApi.advanceStatement(personId as number, includeCancelled),
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

/**
 * Who a payment may be sent to.
 *
 * Long-lived: the list changes when somebody is made an approver, which is an
 * administrative act, not something that happens while a form is open.
 */
export function useCashApprovers() {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.approvers(),
    queryFn: () => cashBookApi.approvers(),
    staleTime: 10 * 60 * 1000,
  });
}

/** The entries waiting on somebody. Entries, not bunches. */
export function useApprovalQueue(state: EntryApprovalStatus = 'PENDING') {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.approvals(state),
    queryFn: () => cashBookApi.approvalQueue(state),
  });
}

/**
 * People matching a search who could approve, each saying whether they do.
 *
 * A search, not a listing: the server answers a blank one with nobody, so the
 * settings screen shows nothing until it is typed into rather than handing
 * over the whole staff directory.
 */
export function useApproverCandidates(enabled: boolean, search: string) {
  return useQuery({
    queryKey: CASH_BOOK_QUERY_KEYS.approverCandidates(search),
    queryFn: () => cashBookApi.approverCandidates(search),
    enabled: enabled && search.trim().length > 0,
  });
}

export function useSetCashApprover() {
  return useCashBookMutation((vars: { person: number; approving: boolean }) =>
    cashBookApi.setApprover(vars.person, vars.approving),
  );
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

export function useCreateCashPerson() {
  return useCashBookMutation((name: string) => cashBookApi.createPerson(name));
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

