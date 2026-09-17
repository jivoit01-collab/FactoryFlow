import { AlertCircle, ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

import { useTransporterInvoiceHistory } from '../api';
import type { TransporterAPInvoicePosting, TransporterAPInvoiceStatus } from '../types';

const STATUS_LABELS: Record<TransporterAPInvoiceStatus, string> = {
  PENDING: 'Pending',
  POSTED: 'Posted',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const statusClass = (status: TransporterAPInvoiceStatus) => {
  switch (status) {
    case 'POSTED':
      return 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300';
    case 'FAILED':
      return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-800 dark:bg-muted/40 dark:text-muted-foreground';
    case 'PENDING':
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const formatCurrency = (value?: string | number | null) => {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  return (Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export default function TransporterInvoiceHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: history = [], isLoading, error, refetch } = useTransporterInvoiceHistory();
  const [search, setSearch] = useState('');
  const statusFilter = (searchParams.get('status') || '').toUpperCase();

  const apiError = error as ApiError | null;
  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return history.filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) return false;
      if (!term) return true;
      return [
        entry.invoice_number,
        entry.vendor_code,
        entry.vendor_name,
        entry.sap_doc_num,
        entry.sap_doc_entry,
        entry.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [history, search, statusFilter]);

  const postedTotal = history
    .filter((entry) => entry.status === 'POSTED')
    .reduce((sum, entry) => sum + parseFloat(entry.sap_doc_total || entry.invoice_amount || '0'), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/dispatch/transporter-invoices')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">A/P Invoice History</h2>
          </div>
          <p className="text-muted-foreground">Submitted and posted A/P Invoices from bilty GRPOs</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Total Postings" value={history.length} />
        <Metric
          label="Posted"
          value={history.filter((entry) => entry.status === 'POSTED').length}
        />
        <Metric label="Posted Value" value={formatCurrency(postedTotal)} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice, vendor, SAP document"
          />
          {statusFilter && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Showing {STATUS_LABELS[statusFilter as TransporterAPInvoiceStatus] || statusFilter}
              {' '}A/P Invoice records
            </div>
          )}

          {apiError && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{apiError.message || 'Failed to load A/P Invoice history.'}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No A/P Invoice records found.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  onClick={() => navigate(`/dispatch/transporter-invoices/history/${entry.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function HistoryRow({
  entry,
  onClick,
}: {
  entry: TransporterAPInvoicePosting;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{entry.invoice_number}</span>
          <Badge className={statusClass(entry.status)}>{STATUS_LABELS[entry.status]}</Badge>
          {entry.sap_doc_num && (
            <span className="text-xs text-muted-foreground">SAP #{entry.sap_doc_num}</span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {entry.vendor_name || entry.vendor_code} / {entry.lines.length} bilty line(s)
        </p>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <div className="text-right text-sm">
          <p className="font-medium">
            {formatCurrency(entry.sap_doc_total || entry.invoice_amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(entry.posted_at || entry.created_at)}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
