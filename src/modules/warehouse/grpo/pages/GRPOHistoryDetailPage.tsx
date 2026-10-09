import { AlertCircle, ArrowLeft, FileCheck2, FileUp, RefreshCw, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AP_INVOICE_DRAFT_ACCESS, AP_INVOICE_DRAFT_PERMISSIONS, GRPO_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { useHasPermission, usePermission } from '@/core/auth';
import { useGRPOAPStatus } from '@/modules/warehouse/ap-invoice-draft/api';
import { APInvoiceStatusBadge } from '@/modules/warehouse/ap-invoice-draft/components/APInvoiceStatusBadge';
import { NewAPInvoiceDraftDialog } from '@/modules/warehouse/ap-invoice-draft/components/NewAPInvoiceDraftDialog';
import { RecordTimestamps } from '@/shared/components';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useGRPODetail } from '../api';
import {
  AttachmentsSection,
  GRPOPrintButton,
  POPrintButton,
  QCReportButton,
  useQCReportPrint,
} from '../components';
import { GRPO_STATUS_CONFIG } from '../constants';

// Format date/time for display
const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) return '-';
  try {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
};

export default function GRPOHistoryDetailPage() {
  const navigate = useNavigate();
  const { postingId } = useParams<{ postingId: string }>();
  const id = postingId ? parseInt(postingId, 10) : null;

  const { data: posting, isLoading, error, refetch } = useGRPODetail(id);
  const canManageAttachments = useHasPermission(GRPO_PERMISSIONS.MANAGE_ATTACHMENTS);
  const { printQCReport, printingArrivalSlipId, printOptionsModal, printPortal, printError } =
    useQCReportPrint();

  // The A/P invoice for this GRPO: where it stands in SAP, and the form that
  // starts one, opened on this GRPO with only the bill left to upload.
  const canCreateAPDraft = useHasPermission(AP_INVOICE_DRAFT_PERMISSIONS.CREATE);
  const { hasAnyPermission } = usePermission();
  const canOpenAPDraft = hasAnyPermission([...AP_INVOICE_DRAFT_ACCESS]);
  const [apDialogOpen, setAPDialogOpen] = useState(false);
  const grpoDocEntry = posting?.status === 'POSTED' ? posting.sap_doc_entry : null;
  const { data: apStatusMap, isLoading: apLoading } = useGRPOAPStatus(
    grpoDocEntry ? [grpoDocEntry] : [],
  );
  const apStatus = grpoDocEntry ? apStatusMap?.[String(grpoDocEntry)] : undefined;
  const apEntry = apStatus?.entry ?? null;
  // Offered unless SAP already has the invoice, or this app has the entry.
  const canStartAPDraft =
    canCreateAPDraft &&
    !!grpoDocEntry &&
    !apEntry &&
    (!apStatus || apStatus.status === 'NONE' || apStatus.status === 'DRAFT');

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const statusConfig = posting ? GRPO_STATUS_CONFIG[posting.status] : null;

  // Every PO this posting covers. A merged GRPO carries them on
  // `merged_po_receipts`; an unmerged one has the single FK, and the server
  // sends that one through the same field, so this is a fallback for older
  // payloads rather than the common case.
  const poReceipts = posting
    ? (posting.merged_po_receipts?.length
        ? posting.merged_po_receipts
        : [{ id: posting.po_receipt, po_number: posting.po_number }])
    : [];

  return (
    <div className="space-y-6">
      {printOptionsModal}
      {printPortal}
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => navigate('/warehouse/grpo/material/history')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Posting Detail</h2>
      </div>

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view this posting.'}
            </p>
          </div>
        </div>
      )}

      {/* QC report print error */}
      {printError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{printError}</p>
        </div>
      )}

      {/* General Error */}
      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-500/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading posting detail.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Posting Detail */}
      {!isLoading && !error && posting && (
        <>
          {/* Info Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Posting Information</h3>
                <div className="flex items-center gap-2">
                  {/* SAP's own purchase order, one per PO — a merged GRPO
                      covers several, and each has its own sheet. */}
                  {poReceipts.map((receipt) => (
                    <POPrintButton
                      key={receipt.id}
                      receipt={receipt}
                      label={poReceipts.length > 1 ? `PO ${receipt.po_number}` : 'Print PO'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                    />
                  ))}
                  {/* SAP's own Goods Receipt Note, for a posting SAP accepted. */}
                  <GRPOPrintButton posting={posting} size="sm" className="h-7 px-2 text-xs" />
                  {canStartAPDraft && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setAPDialogOpen(true)}
                    >
                      <FileUp className="mr-1 h-3.5 w-3.5" />
                      Create A/P invoice draft
                    </Button>
                  )}
                  {apEntry && canOpenAPDraft && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigate(`/warehouse/ap-invoice-drafts/${apEntry.id}`)}
                    >
                      <FileCheck2 className="mr-1 h-3.5 w-3.5" />
                      Open {apEntry.entry_no}
                    </Button>
                  )}
                  {statusConfig && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Entry No</span>
                  <p className="font-medium">{posting.entry_no}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PO Number</span>
                  <p className="font-medium">{posting.po_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SAP Doc Number</span>
                  <p className="font-medium">{posting.sap_doc_num ?? '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SAP Doc Entry</span>
                  <p className="font-medium">{posting.sap_doc_entry ?? '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Value</span>
                  <p className="font-medium">
                    {posting.sap_doc_total
                      ? parseFloat(posting.sap_doc_total).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Posted At</span>
                  <p className="font-medium">{formatDateTime(posting.posted_at)}</p>
                </div>
                {grpoDocEntry && (
                  <div>
                    <span className="text-muted-foreground">A/P Invoice</span>
                    <div className="mt-0.5">
                      {apStatus ? (
                        <APInvoiceStatusBadge status={apStatus} />
                      ) : (
                        <p className="font-medium text-muted-foreground">
                          {apLoading ? 'Checking SAP…' : '-'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error message for failed postings */}
              {posting.error_message && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-xs text-muted-foreground">{posting.error_message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          {posting.lines && posting.lines.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Posted Items</h3>
                <div className="space-y-2">
                  {posting.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-md border bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {line.item_code} - {line.item_name}
                        </p>
                        {/* The lot this receipt created in SAP's stock ledger. */}
                        {line.batches && line.batches.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Batch: {line.batches.map((batch) => batch.BatchNumber).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold">{line.quantity_posted}</span>
                        <QCReportButton
                          item={line}
                          onPrint={printQCReport}
                          printingArrivalSlipId={printingArrivalSlipId}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Record Timestamps */}
          <RecordTimestamps createdAt={posting.created_at} updatedAt={posting.updated_at} />
          {/* Attachments */}
          {posting.status === 'POSTED' && (
            <AttachmentsSection
              postingId={posting.id}
              attachments={posting.attachments || []}
              canManage={canManageAttachments}
            />
          )}

          {grpoDocEntry && (
            <NewAPInvoiceDraftDialog
              open={apDialogOpen}
              onOpenChange={setAPDialogOpen}
              grpoDocEntry={grpoDocEntry}
              // Stay on the GRPO: its A/P status and button refresh in place.
              onCreated={(entry) =>
                entry.sap_status === 'CREATED'
                  ? toast.success(
                      `${entry.entry_no} made — A/P invoice draft ${entry.sap_draft_entry} is in SAP.`,
                    )
                  : toast.warning(
                      `${entry.entry_no} saved, but SAP did not take the draft. Open it to try again.`,
                    )
              }
            />
          )}

          {/* Back Button */}
          <Button variant="outline" onClick={() => navigate('/warehouse/grpo/material/history')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </>
      )}
    </div>
  );
}
