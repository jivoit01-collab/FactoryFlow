import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

const PAGE_SIZE = 20;

import { BST_LIVE_POLL_MS, useBSTIncoming, useBSTTransfers } from '../../api';
import type { BSTTransferListItem } from '../../types';
import { formatBstDateTime } from './bstFormat';
import { BSTStatusBadge } from './bstStatus';

type StatusFilter = 'all' | 'pending' | 'received';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'received', label: 'Received' },
];

// A transfer is "received" once its receipt is finalized (fully or closed);
// everything still in flight counts as "pending".
function isReceived(t: BSTTransferListItem): boolean {
  return t.status === 'RECEIVED' || t.status === 'CLOSED';
}

// One lowercased haystack per row so a multi-term search can match across every
// meaningful field (entry, SAP doc, route, customer, vehicle, status…).
function searchHaystack(t: BSTTransferListItem): string {
  return [
    t.entry_no,
    t.sap_doc_num,
    t.invoice_no,
    t.sap_from_warehouse,
    t.sap_to_warehouse,
    t.destination_company_code,
    t.destination_company_name,
    t.customer_code,
    t.customer_name,
    t.vehicle_number,
    t.driver_name,
    t.status,
    t.source_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Apply the status filter + multi-term search (every term must match). */
function filterTransfers(
  list: BSTTransferListItem[],
  statusFilter: StatusFilter,
  terms: string[],
): BSTTransferListItem[] {
  return list.filter((t) => {
    if (statusFilter === 'received' && !isReceived(t)) return false;
    if (statusFilter === 'pending' && isReceived(t)) return false;
    if (terms.length === 0) return true;
    const hay = searchHaystack(t);
    return terms.every((term) => hay.includes(term));
  });
}

function TransferTable({
  transfers,
  emptyLabel,
  onRowClick,
}: {
  transfers: BSTTransferListItem[];
  emptyLabel: string;
  onRowClick: (t: BSTTransferListItem) => void;
}) {
  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Truck className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 px-3">Entry No.</th>
            <th className="py-2 px-3">Route</th>
            <th className="py-2 px-3">SAP Doc</th>
            <th className="py-2 px-3 text-right">Boxes</th>
            <th className="py-2 px-3">Dispatched</th>
            <th className="py-2 px-3">Received</th>
            <th className="py-2 px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr
              key={t.id}
              className="border-b hover:bg-muted/50 cursor-pointer"
              onClick={() => onRowClick(t)}
            >
              <td className="py-2 px-3 font-medium">{t.entry_no}</td>
              <td className="py-2 px-3">
                <span className="inline-flex items-center gap-1">
                  {t.sap_from_warehouse || '—'}
                  <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                  {t.source_type === 'INVOICE'
                    ? t.destination_company_code || t.customer_name || t.customer_code || '—'
                    : t.sap_to_warehouse || '—'}
                </span>
                {t.source_type === 'INVOICE' && (
                  <span className="ml-1 rounded bg-blue-50 px-1 text-[10px] font-medium text-blue-700">
                    invoice
                  </span>
                )}
              </td>
              <td className="py-2 px-3">
                {t.sap_doc_num || '—'}
                {t.doc_count > 1 && (
                  <span className="ml-1 text-xs text-muted-foreground">+{t.doc_count - 1}</span>
                )}
              </td>
              <td className="py-2 px-3 text-right">{t.scanned_box_count}</td>
              <td className="py-2 px-3">{formatBstDateTime(t.dispatched_at)}</td>
              <td className="py-2 px-3">{formatBstDateTime(t.received_at)}</td>
              <td className="py-2 px-3">
                <BSTStatusBadge status={t.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** TransferTable + a page slice and pager (client-side over the loaded list). */
function PaginatedTable({
  transfers,
  emptyLabel,
  onRowClick,
  page,
  onPageChange,
}: {
  transfers: BSTTransferListItem[];
  emptyLabel: string;
  onRowClick: (t: BSTTransferListItem) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const total = transfers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const rows = transfers.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <TransferTable transfers={rows} emptyLabel={emptyLabel} onRowClick={onRowClick} />
      {total > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={current <= 1}
              onClick={() => onPageChange(current - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <span className="tabular-nums">
              Page {current} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={current >= totalPages}
              onClick={() => onPageChange(current + 1)}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BSTDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dateRange, dateRangeAsDateObjects, setDateRange, resetDateRange } = useGlobalDateRange();
  const dateParams = { from_date: dateRange.from, to_date: dateRange.to };
  // Poll both boards: a live internal transfer appears on the destination's
  // Incoming tab the moment the sender scans its first box, and its box count
  // ticks up as scanning continues — no manual refresh.
  const { data: outgoing = [], isLoading: outLoading } = useBSTTransfers(dateParams, {
    refetchInterval: BST_LIVE_POLL_MS,
  });
  const { data: incoming = [], isLoading: inLoading } = useBSTIncoming(dateParams, {
    refetchInterval: BST_LIVE_POLL_MS,
  });

  const activeTab = searchParams.get('tab') === 'incoming' ? 'incoming' : 'outgoing';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const terms = useMemo(
    () => search.toLowerCase().split(/[\s,]+/).filter(Boolean),
    [search],
  );

  const outgoingFiltered = useMemo(
    () => filterTransfers(outgoing, statusFilter, terms),
    [outgoing, statusFilter, terms],
  );
  const incomingFiltered = useMemo(
    () => filterTransfers(incoming, statusFilter, terms),
    [incoming, statusFilter, terms],
  );

  // Reset to the first page whenever the tab, filter or search changes the list
  // (done in each handler below rather than in an effect).
  const [page, setPage] = useState(1);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Branch Stock Transfer"
        description="Move stock between branches — dispatch and receive"
        primaryAction={{
          label: 'New BST',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/warehouse/bst/new'),
        }}
      >
        <DateRangePicker
          date={dateRangeAsDateObjects}
          className="w-full sm:w-[300px]"
          onDateChange={(date) => {
            if (date && 'from' in date) {
              setDateRange(date);
            } else {
              resetDateRange();
            }
          }}
        />
      </DashboardHeader>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setSearchParams(v === 'incoming' ? { tab: 'incoming' } : {});
          setPage(1);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
          </TabsList>

          {/* Search (multi-term) + status filter, on the far right of the tabs. */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search entry, SAP doc, route, customer…"
                className="w-64 pl-8"
              />
            </div>
            <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded px-3 py-1 text-sm transition-colors',
                    statusFilter === f.key
                      ? 'bg-background font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <TabsContent value="outgoing" className="mt-4">
          {outLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading…</p>
          ) : (
            <PaginatedTable
              transfers={outgoingFiltered}
              emptyLabel={
                outgoing.length ? 'No transfers match your filters' : 'No outgoing transfers yet'
              }
              onRowClick={(t) => navigate(`/warehouse/bst/${t.id}`)}
              page={page}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4">
          {inLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading…</p>
          ) : (
            <PaginatedTable
              transfers={incomingFiltered}
              emptyLabel={
                incoming.length
                  ? 'No transfers match your filters'
                  : 'No incoming transfers expected'
              }
              onRowClick={(t) => navigate(`/warehouse/bst/incoming/${t.id}`)}
              page={page}
              onPageChange={setPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
