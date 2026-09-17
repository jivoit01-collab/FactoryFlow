import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  History,
  List,
  ReceiptText,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useOpenBilties, useTransporterInvoiceHistory } from '../api';
import type { TransporterAPInvoicePosting } from '../types';

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
  if (!amount) return '-';
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};

export default function TransporterInvoicesPage() {
  const navigate = useNavigate();
  const {
    data: invoices = [],
    isLoading,
    error,
    refetch,
  } = useTransporterInvoiceHistory();
  const { data: openBilties = [] } = useOpenBilties();

  const apiError = error as ApiError | null;
  const queue = invoices.filter(
    (invoice) => invoice.status === 'PENDING' || invoice.status === 'FAILED',
  );
  const queueValue = queue.reduce(
    (sum, invoice) => sum + parseFloat(invoice.invoice_amount || '0'),
    0,
  );
  const historyCounts = {
    pending: invoices.filter((invoice) => invoice.status === 'PENDING').length,
    posted: invoices.filter((invoice) => invoice.status === 'POSTED').length,
    failed: invoices.filter((invoice) => invoice.status === 'FAILED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">A/P Invoice</h2>
          <p className="text-muted-foreground">
            Post submitted transporter invoices against bilty service GRPOs
          </p>
        </div>
        <Button
          onClick={() => navigate('/dispatch/transporter-invoices/pending')}
          className="w-full sm:w-auto"
        >
          <List className="mr-2 h-4 w-4" />
          View Pending
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {apiError && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-500/10">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {apiError.message || 'An error occurred while loading A/P invoices.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Card
            className="cursor-pointer border-primary/20 bg-primary/5 transition-shadow hover:shadow-md"
            onClick={() => navigate('/dispatch/transporter-invoices/pending')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Pending A/P Invoice</span>
                </div>
                <span className="text-3xl font-bold text-primary">{queue.length}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-primary/20 pt-3 text-sm text-muted-foreground">
                <span>
                  Pending value:{' '}
                  <span className="font-semibold text-primary">{formatCurrency(queueValue)}</span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Submitted Transporter Invoices
              </h3>
              <button
                type="button"
                onClick={() => navigate('/dispatch/transporter-invoices/pending')}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Show more
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="flex h-16 items-center justify-center rounded-lg border text-sm text-muted-foreground">
                No submitted invoices pending SAP posting
              </div>
            ) : (
              <div className="space-y-2">
                {queue.slice(0, 5).map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    onClick={() => navigate(`/dispatch/transporter-invoices/history/${invoice.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Posting History</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card
                className="cursor-pointer border border-yellow-200 bg-yellow-50 transition-shadow hover:shadow-md dark:border-yellow-500/30 dark:bg-yellow-500/10"
                onClick={() => navigate('/dispatch/transporter-invoices/history?status=pending')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {historyCounts.pending}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    Pending
                  </p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer border border-green-200 bg-green-50 transition-shadow hover:shadow-md dark:border-green-500/30 dark:bg-green-500/10"
                onClick={() => navigate('/dispatch/transporter-invoices/history?status=posted')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {historyCounts.posted}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                    Posted
                  </p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer border border-red-200 bg-red-50 transition-shadow hover:shadow-md dark:border-red-500/30 dark:bg-red-500/10"
                onClick={() => navigate('/dispatch/transporter-invoices/history?status=failed')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">
                      {historyCounts.failed}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    Failed
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Quick Actions</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                variant="outline"
                className="flex h-auto flex-col items-center gap-1 py-3"
                onClick={() => navigate('/dispatch/open-bilties')}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Open Bilties</span>
                <span className="text-xs text-muted-foreground">{openBilties.length} open</span>
              </Button>
              <Button
                variant="outline"
                className="flex h-auto flex-col items-center gap-1 py-3"
                onClick={() => navigate('/dispatch/transporter-invoices/pending')}
              >
                <List className="h-5 w-5" />
                <span className="text-xs">Pending A/P</span>
              </Button>
              <Button
                variant="outline"
                className="flex h-auto flex-col items-center gap-1 py-3"
                onClick={() => navigate('/dispatch/transporter-invoices/history')}
              >
                <History className="h-5 w-5" />
                <span className="text-xs">Posting History</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  onClick,
}: {
  invoice: TransporterAPInvoicePosting;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-sm font-medium">{invoice.invoice_number}</span>
        <span className="truncate text-xs text-muted-foreground">
          {invoice.vendor_name || invoice.vendor_code}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end text-xs text-muted-foreground">
          <span>{formatCurrency(invoice.invoice_amount)}</span>
          <span>{formatDateTime(invoice.created_at)}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
