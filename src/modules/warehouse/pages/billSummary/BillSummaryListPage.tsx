import { AlertTriangle, FileText, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
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

const STATUS_STYLE: Record<string, string> = {
  GENERATED: 'bg-sky-100 text-sky-800',
  PICKED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
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
                onChange={(event) => setStatus(event.target.value as BillSummaryStatus | '')}
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
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bs-to">Dispatch to</Label>
              <Input
                id="bs-to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <Switch id="bs-sap" checked={includeSap} onChange={setIncludeSap} />
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
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
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
          {allRows.map((row) => (
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
                  <Badge variant="outline" className="border-violet-400 text-violet-700">
                    Stamped in SAP
                  </Badge>
                )}
                {/* A picked sheet whose SAP write failed is the case that needs
                    chasing, so it is called out rather than folded into status. */}
                {row.sap_status === 'FAILED' && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Not in SAP
                  </Badge>
                )}
                {row.sap_status === 'POSTED' && (
                  <Badge variant="outline" className="border-emerald-400 text-emerald-700">
                    In SAP
                  </Badge>
                )}
                <Badge className={STATUS_STYLE[row.status] ?? ''}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
