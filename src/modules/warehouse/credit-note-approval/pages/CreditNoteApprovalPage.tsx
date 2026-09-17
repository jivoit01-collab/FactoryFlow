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
 */

import { RefreshCw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

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
} from '../types';

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

  const query = useCreditNoteApprovals(tab, family);
  const needle = search.trim().toLowerCase();
  const searching = needle.length >= MIN_SEARCH;

  const rows = useMemo(() => {
    const all = query.data ?? [];
    return searching ? all.filter((row) => matches(row, needle)) : all;
  }, [query.data, needle, searching]);

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
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search the credit-note queue"
            placeholder="Search — SAP no., draft, party, invoice, item, account or person"
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
    </div>
  );
}
