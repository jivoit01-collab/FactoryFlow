import { AlertCircle, ArrowLeft, ExternalLink, FileText, Printer, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { resolveFileUrl } from '@/shared/utils';

import { useServiceGRPODetail } from '../api';
import { GRPO_STATUS, GRPO_STATUS_CONFIG } from '../constants';
import type { GRPOStatus } from '../types';

const getStatusBadgeClass = (status: GRPOStatus) => {
  switch (status) {
    case GRPO_STATUS.POSTED:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case GRPO_STATUS.FAILED:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case GRPO_STATUS.PARTIALLY_POSTED:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case GRPO_STATUS.PENDING:
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
};

const formatCurrency = (value?: string | null) => {
  const amount = parseFloat(value || '0');
  if (!amount) return '-';
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};

const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) return '-';
  try {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
};

const formatDate = (date?: string | null) => {
  if (!date) return '-';
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date;
  }
};

export default function ServiceGRPOHistoryDetailPage() {
  const navigate = useNavigate();
  const { postingId } = useParams<{ postingId: string }>();
  const id = postingId ? parseInt(postingId, 10) : null;

  const { data: posting, isLoading, error, refetch } = useServiceGRPODetail(id);
  const apiError = error as ApiError | null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/dispatch/bilty-grpo/history')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">
              {posting?.bilty_no || posting?.dispatch_bill_no || 'Service GRPO Detail'}
            </h2>
          </div>
          <p className="text-muted-foreground">Transport service GRPO posting details</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading posting details.'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && posting && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(posting.status)}`}
                  >
                    {GRPO_STATUS_CONFIG[posting.status]?.label || posting.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bilty Number</p>
                  <p className="text-sm font-medium">{posting.bilty_no || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bilty Date</p>
                  <p className="text-sm font-medium">{formatDate(posting.bilty_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bilty / SAP Doc Number</p>
                  <p className="text-sm font-medium">
                    {posting.bilty_no ? `Bilty #${posting.bilty_no}` : posting.sap_doc_num || '-'}
                  </p>
                  {posting.sap_doc_num && posting.bilty_no && (
                    <p className="text-xs text-muted-foreground">SAP #{posting.sap_doc_num}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SAP Doc Entry</p>
                  <p className="text-sm font-medium">{posting.sap_doc_entry || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispatch Bill DocEntry</p>
                  <p className="text-sm font-medium">{posting.sap_invoice_doc_entry || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(posting.total_amount || posting.sap_doc_total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Posted At</p>
                  <p className="text-sm font-medium">{formatDateTime(posting.posted_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendor Code</p>
                  <p className="text-sm font-medium">{posting.vendor_code || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendor Name</p>
                  <p className="text-sm font-medium">{posting.vendor_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-medium">{posting.vehicle_no || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transporter</p>
                  <p className="text-sm font-medium">{posting.transporter_name || '-'}</p>
                </div>
              </div>
              {posting.error_message && (
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {posting.error_message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-lg font-semibold">Service Lines</h3>
              {posting.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service lines recorded.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">Description</th>
                        <th className="p-3 text-left text-sm font-medium">G/L Account</th>
                        <th className="p-3 text-left text-sm font-medium">Tax Code</th>
                        <th className="p-3 text-right text-sm font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posting.lines.map((line) => (
                        <tr key={line.id} className="border-t">
                          <td className="p-3 text-sm">{line.service_description}</td>
                          <td className="p-3 text-sm">{line.gl_account || '-'}</td>
                          <td className="p-3 text-sm">{line.tax_code || '-'}</td>
                          <td className="p-3 text-sm text-right">{formatCurrency(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-lg font-semibold">Attachments</h3>
              {posting.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {posting.attachments.map((attachment) => {
                    const fileUrl = resolveFileUrl(attachment.file);

                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-w-0 items-center gap-1 text-sm hover:underline"
                            >
                              <span className="truncate">{attachment.original_filename}</span>
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-sm truncate">{attachment.original_filename}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {attachment.sap_attachment_status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
