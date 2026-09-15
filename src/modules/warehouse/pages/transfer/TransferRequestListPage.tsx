import {
  ArrowRightLeft,
  Inbox,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import {
  useInTransitTransferRequests,
  usePendingTransferRequests,
  useSapAwaitingTransfers,
  useSapTransferApprovals,
  useSapTransferDrafts,
  useSapTransferSearch,
  useTransferRequests,
} from '../../api';
import { PrintTransferAction } from '../../components/PrintTransferDialog';
import { SapTransferPrintButton } from '../../components/SapTransferPrintButton';
import type { SapApprovalStatus, TransferRequestListItem } from '../../types';
import { SapAwaitingTransferTable } from './SapAwaitingTransferTable';
import { SapTransferApprovalTable } from './SapTransferApprovalTable';
import { SapUnpostedDraftTable } from './SapUnpostedDraftTable';
import { ApprovalBadge, PostingBadge, Route, RouteBadge } from './TransferBadges';
import { shortDate } from './transferFormat';
import {
  filterBy,
  matchesApproval,
  matchesAwaiting,
  matchesDraft,
  matchesRequest,
  MIN_SEARCH,
} from './transferSearch';

type Tab = 'all' | 'pending' | 'in-transit' | 'sap' | 'awaiting';

/** The SAP approval queue, then what happened to everything that left it. */
const SAP_VIEWS: { key: SapApprovalStatus; label: string }[] = [
  { key: 'PENDING', label: 'Waiting' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function TransferRequestListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [tab, setTab] = useState<Tab>('all');
  // Which SAP queue the `sap` tab shows: the live one, or the history. Kept
  // beside the tab because "what did I approve, and what became of it" is the
  // same question as "what is waiting", one step later.
  const [sapView, setSapView] = useState<SapApprovalStatus>('PENDING');

  /* One box over every tab. Somebody chasing a transfer has a number, a
     warehouse or an item — not the tab it happens to live in, which is the
     thing they came here to find out. */
  const [search, setSearch] = useState('');
  const needle = useDebounce(search.trim().toLowerCase(), 150);
  const searching = needle.length >= MIN_SEARCH;

  const canApprove = hasPermission(WAREHOUSE_PERMISSIONS.APPROVE_TRANSFER_REQUEST);
  const canCreate = hasPermission(WAREHOUSE_PERMISSIONS.CREATE_TRANSFER_REQUEST);

  const all = useTransferRequests();
  // Only fetch the approval queue for someone who can act on it.
  const pending = usePendingTransferRequests(canApprove);
  const inTransit = useInTransitTransferRequests();
  /* SAP's own queues cost a HANA round trip each, so they are fetched when
     their tab is opened — or when a search is running, which is the one other
     time their rows have to be in hand. */
  const sapApprovals = useSapTransferApprovals(sapView, tab === 'sap' || searching);
  // The tab badge counts the backlog, not whatever view is open — history has
  // no backlog. Only fetched for the pending view; on a history view the cached
  // pending result keeps the badge honest without a second HANA round trip.
  const sapPending = useSapTransferApprovals(
    'PENDING',
    (tab === 'sap' || searching) && sapView === 'PENDING',
  );
  // Approved requests that still owe stock.
  const awaiting = useSapAwaitingTransfers(tab === 'awaiting' || searching);
  // The other half of "approved, but the stock has not moved": a transfer
  // raised in the SAP client is approved as a DRAFT, and stays one until
  // somebody adds it. Same tab, because to a warehouse it is the same wait.
  const drafts = useSapTransferDrafts(tab === 'awaiting' || searching);
  /* A POSTED transfer is in none of the queues above — it is finished work,
     not something waiting on anybody. People search for one here all the same,
     because a document number is a document number, so the search answers for
     those too rather than saying "nothing matches" about a document that
     plainly exists. Only read while a search is running. */
  const posted = useSapTransferSearch(needle, searching);
  const postedRows = posted.data ?? [];

  /* Filtering is done here rather than in each table so that one needle gives
     every tab its own match count — which is what makes the strip tell you
     where the thing you are looking for actually is. */
  const allRows = useMemo(
    () => filterBy(all.data, needle, matchesRequest),
    [all.data, needle],
  );
  const pendingRows = useMemo(
    () => filterBy(pending.data, needle, matchesRequest),
    [needle, pending.data],
  );
  const inTransitRows = useMemo(
    () => filterBy(inTransit.data, needle, matchesRequest),
    [inTransit.data, needle],
  );
  const approvalRows = useMemo(
    () => filterBy(sapApprovals.data, needle, matchesApproval),
    [needle, sapApprovals.data],
  );
  const awaitingRows = useMemo(
    () => filterBy(awaiting.data, needle, matchesAwaiting),
    [awaiting.data, needle],
  );
  const draftRows = useMemo(
    () => filterBy(drafts.data, needle, matchesDraft),
    [drafts.data, needle],
  );

  const active = tab === 'pending' ? pending : tab === 'in-transit' ? inTransit : all;
  const rows: TransferRequestListItem[] =
    tab === 'pending' ? pendingRows : tab === 'in-transit' ? inTransitRows : allRows;

  const tabs: { key: Tab; label: string; icon: typeof Inbox; count?: number; show: boolean }[] = [
    {
      key: 'all',
      label: 'All requests',
      icon: ArrowRightLeft,
      count: all.data ? allRows.length : undefined,
      show: true,
    },
    {
      key: 'pending',
      label: 'Awaiting my decision',
      icon: Inbox,
      count: pending.data ? pendingRows.length : undefined,
      show: canApprove,
    },
    {
      key: 'in-transit',
      label: 'In transit',
      icon: Truck,
      count: inTransit.data ? inTransitRows.length : undefined,
      show: true,
    },
    {
      // SAP holds transfers raised in the SAP client too, so this queue is not
      // a subset of the tabs above — it is the only place they show up here.
      key: 'sap',
      label: 'SAP approvals',
      icon: ShieldCheck,
      // While searching, the count is what the open view matched: the search
      // reads the queue that is selected, not all three.
      count: searching
        ? sapApprovals.data
          ? approvalRows.length
          : undefined
        : sapPending.data?.length,
      show: true,
    },
    {
      // The step after that queue: an approved REQUEST has reserved stock that
      // nobody has moved yet, and it stays that way until posted.
      key: 'awaiting',
      label: 'Awaiting transfer',
      icon: PackageCheck,
      count:
        awaiting.data || drafts.data ? awaitingRows.length + draftRows.length : undefined,
      show: true,
    },
  ];

  const shownTabs = tabs.filter((t) => t.show);
  /* Named per tab rather than totalled: the same request is listed in All
     requests AND in the queue it is waiting in, so any total would be adding up
     one transfer twice. Where it is, is also the useful answer. */
  const found = shownTabs.filter((t) => (t.count ?? 0) > 0);
  const hereCount = shownTabs.find((t) => t.key === tab)?.count ?? 0;
  // Everything a search reads is already in hand except SAP's, which arrives a
  // round trip later; saying so beats a bare "0 matches" that is about to change.
  const stillReading =
    searching &&
    (sapApprovals.isLoading || awaiting.isLoading || drafts.isLoading || all.isLoading);
  const nothingFound = found.length === 0;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Inventory Transfer"
        description="Ask another warehouse for stock, approve what they ask of you, and print the transfer document"
      >
        {/* Reaches transfers keyed straight into SAP too - those are on no row
            below, and are the ones most often waiting to be printed. */}
        <PrintTransferAction />
        {canCreate && (
          <Button onClick={() => navigate('/warehouse/inventory-transfer/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Raise a request
          </Button>
        )}
      </DashboardHeader>

      <div className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search every transfer queue"
            placeholder="Search every tab — entry no., SAP no., warehouse, item or person"
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
          {shownTabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            const hasMatches = searching && (t.count ?? 0) > 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : hasMatches
                      ? 'border-primary/40 text-foreground hover:bg-muted'
                      : 'border-border text-muted-foreground hover:bg-muted'
                } ${searching && !hasMatches && !isActive ? 'opacity-50' : ''}`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {typeof t.count === 'number' && (
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${
                      hasMatches ? 'bg-primary/15 text-primary' : 'bg-muted'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {searching && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              {stillReading && nothingFound
                ? 'Searching SAP’s queues…'
                : nothingFound
                  ? postedRows.length > 0
                    ? `“${needle}” is a posted transfer — nothing is waiting on it.`
                    : `Nothing matches “${needle}” in any tab.`
                  : hereCount === 0
                    ? `Nothing here matches “${needle}”. Found in`
                    : `“${needle}” found in`}
            </span>
            {!nothingFound && (
              <span className="flex flex-wrap items-center gap-2">
                {found.map((t) =>
                  t.key === tab ? (
                    <span
                      key={t.key}
                      className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {t.label} ({t.count}) · open
                    </span>
                  ) : (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className="rounded-md border border-primary/40 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      {t.label} ({t.count})
                    </button>
                  ),
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Posted transfers the search matched. They belong to no tab — the work
          is done — so they are answered here, with the one thing still wanted
          from a finished transfer: its document. */}
      {searching && postedRows.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Posted in SAP ({postedRows.length})
            </div>
            <div className="divide-y rounded-md border">
              {postedRows.map((t) => (
                <div key={t.doc_entry} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      #{t.doc_num}
                      {t.cancelled ? (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
                          Cancelled
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.from_warehouse} → {t.to_warehouse} · {t.line_count} lines ·{' '}
                      {t.total_quantity} qty
                      {t.doc_date ? ` · ${new Date(t.doc_date).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <SapTransferPrintButton
                    docEntry={t.doc_entry}
                    docNum={t.doc_num}
                    label="Print"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'awaiting' ? (
        <div className="space-y-6">
          {/* Drafts first: they are the older backlog and the stock behind
              them has been frozen the longest. */}
          <SapUnpostedDraftTable
            rows={draftRows}
            isLoading={drafts.isLoading}
            isError={drafts.isError}
            searching={searching}
          />
          <SapAwaitingTransferTable
            rows={awaitingRows}
            isLoading={awaiting.isLoading}
            isError={awaiting.isError}
            searching={searching}
          />
        </div>
      ) : tab === 'sap' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SAP_VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setSapView(v.key)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  sapView === v.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <SapTransferApprovalTable
            rows={approvalRows}
            isLoading={sapApprovals.isLoading}
            isError={sapApprovals.isError}
            view={sapView}
            searching={searching}
          />
        </div>
      ) : (
        <>
          {tab === 'in-transit' && rows.length > 0 && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
              These moves cross SAP branches, so the stock is sitting in an in-transit warehouse. It
              only lands at the destination once the receiving side finishes the BST receipt.
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {active.isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading requests…</p>
              ) : active.isError ? (
                <p className="p-6 text-sm text-red-600">
                  Could not load transfer requests. Try again in a moment.
                </p>
              ) : rows.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  {searching
                    ? 'No request here matches that search.'
                    : tab === 'pending'
                      ? 'Nothing is waiting on your decision.'
                      : tab === 'in-transit'
                        ? 'No stock is sitting in transit.'
                        : 'No transfer requests yet.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Entry</th>
                        <th className="px-4 py-3 text-left font-medium">Route</th>
                        <th className="px-4 py-3 text-left font-medium">Approval</th>
                        <th className="px-4 py-3 text-left font-medium">Stock</th>
                        <th className="px-4 py-3 text-right font-medium">Items</th>
                        <th className="px-4 py-3 text-left font-medium">Raised by</th>
                        <th className="px-4 py-3 text-left font-medium">Raised</th>
                        <th className="px-4 py-3 text-right font-medium">Document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => navigate(`/warehouse/inventory-transfer/${row.id}`)}
                          className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{row.entry_no}</div>
                            {row.sap_transfer_doc_num && (
                              <div className="text-xs text-muted-foreground tabular-nums">
                                SAP {row.sap_transfer_doc_num}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Route from={row.from_warehouse} to={row.to_warehouse} />
                              <RouteBadge routeType={row.route_type} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <ApprovalBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3">
                            <PostingBadge
                              status={row.posting_status}
                              intransitWarehouse={row.intransit_warehouse}
                            />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.line_count}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.requested_by_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {shortDate(row.created_at)}
                          </td>
                          {/* Stop the click reaching the row, or printing would
                              navigate away to the request underneath it. */}
                          <td
                            className="px-4 py-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.sap_transfer_doc_entry ? (
                              <SapTransferPrintButton
                                docEntry={row.sap_transfer_doc_entry}
                                docNum={row.sap_transfer_doc_num || row.entry_no}
                              />
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
