import { AlertTriangle, FileText, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Switch,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  type BillSummary,
  type BillSummaryStatus,
  useBillSummaries,
  useSapBillSummaries,
} from '../../api';

/** Matches the smallest option PaginationControls offers. */
const DEFAULT_PAGE_SIZE = 25;

const STATUS_STYLE: Record<string, string> = {
  GENERATED: 'bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-400',
  PICKED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
  CANCELLED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400',
};

const STATUS_LABEL: Record<string, string> = {
  GENERATED: 'With the floor',
  PICKED: 'Picked',
  CANCELLED: 'Cancelled',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BillSummaryListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [status, setStatus] = useState<BillSummaryStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeSap, setIncludeSap] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const params = {
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };

  const { data: rows = [], isLoading } = useBillSummaries({
    ...(status ? { status } : {}),
    ...params,
  });

  /* Dispatches stamped straight onto the invoice in SAP — the flow this module
     replaced, still in daily use. Fetched only when asked for: it reads HANA,
     and the app's own list should not wait behind it. */
  const {
    data: sapRows = [],
    isFetching: sapLoading,
    error: sapError,
  } = useSapBillSummaries(params, includeSap);

  /* A SAP row is a live dispatch SAP is holding, which is what a GENERATED sheet
     is. Filtering to any other status is therefore a question about the app's
     own records, and these have no answer to it. */
  const sapHidden = includeSap && status !== '' && status !== 'GENERATED';

  const allRows = useMemo(() => {
    const merged: BillSummary[] = includeSap && !sapHidden ? [...rows, ...sapRows] : [...rows];
    return merged.sort((a, b) => {
      const byDate = String(b.dispatch_date ?? '').localeCompare(String(a.dispatch_date ?? ''));
      return byDate !== 0 ? byDate : b.entry_no.localeCompare(a.entry_no);
    });
  }, [rows, sapRows, includeSap, sapHidden]);

  /* Paged in the browser, not on the server. The list on screen is two feeds
     sorted into one — the app's own sheets and the dispatches stamped straight
     into SAP — and a row's place in it depends on the other feed's dates, so a
     page can only be cut once both are in hand. The app side is a few hundred
     rows and the SAP side is a month's window. */
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));

  /* A filter that shortens the list can strand the viewer past the end of it,
     as can the SAP rows arriving late. Clamped here rather than written back
     through setState, so the page number stays derived from the list instead
     of chasing it a render behind. */
  const safePage = Math.min(page, totalPages);

  const pagedRows = useMemo(
    () => allRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [allRows, safePage, pageSize],
  );

  const canIssue = hasPermission(DISPATCH_PERMISSIONS.CREATE_BILL_SUMMARY);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Bill Summaries"
        description="Picking sheets issued to the warehouse floor"
      >
        {canIssue && (
          <Button onClick={() => navigate('/warehouse/bill-summaries/new')}>
            <Plus className="mr-2 h-4 w-4" /> New bill summary
          </Button>
        )}
      </DashboardHeader>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
            <div className="space-y-1">
              <Label htmlFor="bs-status">Status</Label>
              <select
                id="bs-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as BillSummaryStatus | '');
                  setPage(1);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">All</option>
                <option value="GENERATED">With the floor</option>
                <option value="PICKED">Picked</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bs-from">Dispatch from</Label>
              <Input
                id="bs-from"
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bs-to">Dispatch to</Label>
              <Input
                id="bs-to"
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <Switch
              id="bs-sap"
              checked={includeSap}
              onChange={(next) => {
                setIncludeSap(next);
                setPage(1);
              }}
            />
            <Label htmlFor="bs-sap" className="cursor-pointer">
              Also show dispatches stamped in SAP
            </Label>
            <span className="text-xs text-muted-foreground">
              Bills whose dispatch was typed straight into SAP, without a sheet issued here.
              {!dateFrom && !dateTo && ' Defaults to this month.'}
            </span>
          </div>
        </CardContent>
      </Card>

      {includeSap && sapError && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {getErrorMessage(sapError, 'Could not read the SAP-stamped dispatches.')}
        </p>
      )}

      {/* Said out loud rather than silently returning fewer rows: the toggle is
          on, so the user is entitled to know why none of them are showing. */}
      {sapHidden && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          SAP-stamped dispatches are hidden while the status filter is set — they are all
          live dispatches, so only “All” or “With the floor” can show them.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading bill summaries…</p>
      ) : allRows.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {sapLoading ? 'Reading SAP…' : 'No bill summaries yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {sapLoading && (
            <p className="text-xs text-muted-foreground">Reading SAP for stamped dispatches…</p>
          )}
          {pagedRows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={() => navigate(`/warehouse/bill-summaries/${row.key}`)}
              className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {row.entry_no}
                  <span className="text-muted-foreground">
                    · bill {row.sap_invoice_doc_num}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {row.customer_name || row.customer_code} · dispatch{' '}
                  {formatDate(row.dispatch_date)} · {row.totals.lines} line(s)
                  {row.warehouse_codes && ` · ${row.warehouse_codes}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Which flow produced it. The row behaves the same either way,
                    but "no sheet was ever issued for this one" is worth seeing. */}
                {row.source === 'SAP' && (
                  <Badge variant="outline" className="border-violet-400 text-violet-700 dark:text-violet-400">
                    Stamped in SAP
                  </Badge>
                )}
                {/* A picked sheet whose SAP write failed is the case that needs
                    chasing, so it is called out rather than folded into status. */}
                {row.sap_status === 'FAILED' && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Not in SAP
                  </Badge>
                )}
                {row.sap_status === 'POSTED' && (
                  <Badge variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-400">
                    In SAP
                  </Badge>
                )}
                <Badge className={STATUS_STYLE[row.status] ?? ''}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </Badge>
              </div>
            </button>
          ))}

          <PaginationControls
            page={safePage}
            pageSize={pageSize}
            /* The whole filtered list, not the page — "Showing 1-25 of 154" is
               the sentence somebody reads to know how much is left. */
            total={allRows.length}
            totalPages={totalPages}
            /* Left enabled while SAP is still being read: the app's own sheets
               are already on screen and worth paging through. The count grows
               when the SAP rows land, and the clamp above keeps the viewer on
               a page that exists. */
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              // Row 100 sits on a different page once the size changes, so the
              // old page number means nothing.
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
