/**
 * Credit Note Approval — SAP's own approval queue on credit-note drafts.
 *
 * Credit notes are raised in the SAP client. Where a company's approval
 * procedure catches one it becomes a draft that only SAP can see, waiting on a
 * single named authorizer; if that person does not sit in SAP it simply stalls,
 * and nobody outside SAP can even tell that it has. This page is where they
 * surface and get decided, with the identity rules SAP enforces intact: the
 * decision is signed as the caller's own SAP account, and only for the rows SAP
 * named them on.
 *
 * Three tabs, because they answer different questions: Pending is work, and
 * Approved / Rejected are the log people come back to with "I decided that,
 * where did it go?". The family filter splits customer credit notes from vendor
 * ones — the same queue to the system, rarely the same person's job.
 *
 * Two kinds of search. "Search SAP" sends SAP Portal's filters — party,
 * document number, request number, the dates it was raised between — to the
 * server, so they reach the whole history and not just the rows loaded. The
 * quick filter narrows the rows already on screen by anything in them (items,
 * accounts, people). Rows load a page at a time; "Load more" pages on.
 */

import { RefreshCw, Search, X } from 'lucide-react';
import { type ChangeEvent, useMemo, useState } from 'react';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Input } from '@/shared/components/ui';

import { useCreditNoteApprovals } from '../api/creditNoteApproval.queries';
import { CreditNoteApprovalTable } from '../components/CreditNoteApprovalTable';
import type {
  CreditNoteApproval,
  CreditNoteApprovalStatus,
  CreditNoteFamily,
  CreditNoteListFilters,
} from '../types';

const NO_FILTERS: CreditNoteListFilters = { party: '', doc_num: '', code: '', date_from: '', date_to: '' };

function hasFilters(filters: CreditNoteListFilters): boolean {
  return Object.values(filters).some((value) => !!value?.trim());
}

const TABS: { key: CreditNoteApprovalStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const FAMILIES: { key: CreditNoteFamily; label: string; hint: string }[] = [
  { key: 'AR', label: 'A/R — customer', hint: 'A customer is credited' },
  { key: 'AP', label: 'A/P — vendor', hint: 'A vendor is debited' },
];

/** One character matches nearly everything; below two it is not a search. */
const MIN_SEARCH = 2;

/**
 * `doc_num` is deliberately not searched: on a pending row it is the draft's
 * provisional number, shared by every open draft in the series and usually
 * already belonging to some unrelated posted document — matching on it would
 * answer a search with rows that have nothing to do with the number typed.
 * `posted_doc_num` is the one SAP kept.
 */
function matches(row: CreditNoteApproval, needle: string): boolean {
  const parts: (string | number | null)[] = [
    row.posted_doc_num,
    row.draft_entry,
    row.card_code,
    row.party_name,
    row.reference,
    row.comments,
    row.approver_code,
    row.approver_name,
    row.decided_by,
    row.decided_by_name,
    row.created_by,
    ...row.base_documents,
    ...row.warehouses,
  ];
  if (
    parts.some((p) => p !== null && p !== undefined && String(p).toLowerCase().includes(needle))
  ) {
    return true;
  }
  // The line the searcher remembers may be an item or an expense account.
  return row.lines.some((line) =>
    [line.item_code, line.description, line.account_code, line.account_name].some(
      (p) => p && p.toLowerCase().includes(needle),
    ),
  );
}

export default function CreditNoteApprovalPage() {
  const { hasPermission } = usePermission();
  /**
   * Only the families this user holds. The server narrows the queue regardless
   * — asking for A/P without the permission returns an empty list, not an
   * error — so this exists to stop the page offering a filter that could only
   * ever come back empty, not as the access control itself.
   */
  const families = useMemo(
    () =>
      FAMILIES.filter(({ key }) =>
        hasPermission(
          key === 'AR'
            ? WAREHOUSE_PERMISSIONS.VIEW_AR_CREDIT_NOTE_APPROVAL
            : WAREHOUSE_PERMISSIONS.VIEW_AP_CREDIT_NOTE_APPROVAL,
        ),
      ),
    [hasPermission],
  );

  const [tab, setTab] = useState<CreditNoteApprovalStatus>('PENDING');
  const [family, setFamily] = useState<CreditNoteFamily | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  // What is typed in the SAP search, and what was last sent.
  const [draft, setDraft] = useState<CreditNoteListFilters>(NO_FILTERS);
  const [applied, setApplied] = useState<CreditNoteListFilters>(NO_FILTERS);

  const query = useCreditNoteApprovals(tab, family, applied);
  const needle = search.trim().toLowerCase();
  const searching = needle.length >= MIN_SEARCH || hasFilters(applied);

  const loaded = useMemo(() => (query.data?.pages ?? []).flat(), [query.data]);
  const rows = useMemo(
    () => (needle.length >= MIN_SEARCH ? loaded.filter((row) => matches(row, needle)) : loaded),
    [loaded, needle],
  );
  const field = (key: keyof CreditNoteListFilters) => ({
    value: draft[key] ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Credit Note Approval"
        description="Credit notes SAP is holding for approval — decided as your own SAP user, from the rows SAP named you on"
      >
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label="Reload the queue from SAP"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="space-y-3">
        <form
          className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3 lg:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(draft);
          }}
          aria-label="Search SAP"
        >
          <Input {...field('party')} aria-label="Party" placeholder="Party — code or name" className="h-9" />
          <Input {...field('doc_num')} aria-label="Document number" placeholder="Document no." inputMode="numeric" className="h-9" />
          <Input {...field('code')} aria-label="Approval request number" placeholder="Request no." inputMode="numeric" className="h-9" />
          <Input {...field('date_from')} aria-label="Raised from" type="date" className="h-9" />
          <Input {...field('date_to')} aria-label="Raised to" type="date" className="h-9" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-9 flex-1">
              <Search className="mr-1.5 h-4 w-4" />
              Search SAP
            </Button>
            {hasFilters(applied) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9"
                aria-label="Clear the SAP search"
                onClick={() => {
                  setDraft(NO_FILTERS);
                  setApplied(NO_FILTERS);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filter the rows shown"
            placeholder="Filter the rows shown — SAP no., draft, party, invoice, item, account or person"
            className="h-10 pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear the search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.label}
              {tab === t.key && !query.isLoading && (
                <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
                  {rows.length}
                  {query.hasNextPage && '+'}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* One family granted means there is nothing to filter — the queue is
            already only that family, and a lone chip reads as a broken toggle. */}
        {families.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {[{ key: 'ALL' as const, label: 'All', hint: 'Customer and vendor credit notes' }, ...families].map(
              (f) => (
                <button
                  key={f.key}
                  type="button"
                  title={f.hint}
                  onClick={() => setFamily(f.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    family === f.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      <CreditNoteApprovalTable
        rows={rows}
        isLoading={query.isLoading}
        isError={query.isError}
        view={tab}
        searching={searching}
      />

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
