import { AlertCircle, ArrowLeft, FileCheck2, FlaskConical, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import { confirmDialog, RecordTimestamps } from '@/shared/components';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useDiscardSimulatedFAGRPO, useFAGRPODetail } from '../api/faGrpo.queries';
import { FAGRPOPrintButton } from '../components/FAGRPOPrintButton';
import { FAPostingStatusBadge } from '../components/FAPostingStatusBadge';
import { FA_GRPO_POST_ACCESS } from '../constants/permissions';
import { faGrpoPaths } from '../constants/routes';

/**
 * One fixed-asset GRPO, read-only: what was posted (or simulated, or refused),
 * its lines and files, and SAP's own Goods Receipt Note to print.
 *
 * A simulated post wrote nothing to SAP; the document it would have sent is
 * shown instead, and the post right can discard it to free the PO.
 */
export default function FAGRPOHistoryDetailPage() {
  const navigate = useNavigate();
  const { postingId } = useParams<{ postingId: string }>();
  const id = postingId ? parseInt(postingId, 10) : null;
  const { hasAnyPermission } = usePermission();
  const canPost = hasAnyPermission(FA_GRPO_POST_ACCESS);

  const { data: posting, isLoading, error, refetch } = useFAGRPODetail(id);
  const discard = useDiscardSimulatedFAGRPO();
  const apiError = error as ApiError | null;

  const backToHistory = () => navigate(faGrpoPaths.list('history'));

  const handleDiscard = async () => {
    if (!posting) return;
    const ok = await confirmDialog({
      title: `Discard the simulated GRPO of ${posting.entry_no}?`,
      description:
        'Nothing was sent to SAP for it. Discarding frees the PO, so it can be posted for real.',
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    try {
      await discard.mutateAsync(posting.id);
      toast.success('Simulated GRPO discarded.');
      backToHistory();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not discard the simulated GRPO.'));
    }
  };

  const pos = posting?.merged_po_receipts?.length
    ? posting.merged_po_receipts.map((r) => r.po_number).join(', ')
    : posting?.po_numbers?.length
      ? posting.po_numbers.join(', ')
      : posting?.po_number;

  return (
    <div className="space-y-6">
      <div className="mb-1 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={backToHistory}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Fixed Asset GRPO</h2>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-muted-foreground">
            {apiError?.status === 404
              ? 'This is not a fixed-asset GRPO of this company.'
              : getErrorMessage(error, 'Could not load this posting.')}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && !error && posting && (
        <>
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Posting information</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <FAGRPOPrintButton posting={posting} className="h-7 px-2 text-xs" />
                  {posting.status !== 'POSTED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigate(faGrpoPaths.preview(posting.vehicle_entry))}
                    >
                      <FileCheck2 className="mr-1 h-3.5 w-3.5" /> Open entry
                    </Button>
                  )}
                  {posting.simulated && canPost && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-red-600"
                      disabled={discard.isPending}
                      onClick={() => void handleDiscard()}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Discard
                    </Button>
                  )}
                  <FAPostingStatusBadge status={posting.status} simulated={posting.simulated} />
                </div>
              </div>

              {posting.simulated && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Simulated: every check ran and nothing was written to SAP, so there is no SAP
                    number. It blocks a real post of the same PO until it is discarded.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Field label="Entry no" value={posting.entry_no} />
                <Field label="PO" value={pos || '-'} />
                <Field label="SAP doc number" value={posting.sap_doc_num ?? '-'} />
                <Field label="SAP doc entry" value={posting.sap_doc_entry ?? '-'} />
                <Field
                  label="Total value"
                  value={
                    posting.sap_doc_total && !posting.simulated
                      ? Number(posting.sap_doc_total).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })
                      : '-'
                  }
                />
                <Field label="Posted at" value={formatDateTimeShort(posting.posted_at)} />
              </div>

              {posting.error_message && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-xs text-muted-foreground">{posting.error_message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {posting.lines?.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="font-semibold">Lines</h3>
                <div className="space-y-2">
                  {posting.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {line.item_code} - {line.item_name}
                        </p>
                        {line.batches && line.batches.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Batch: {line.batches.map((b) => b.BatchNumber).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{line.quantity_posted}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {posting.attachments?.length > 0 && (
            <Card>
              <CardContent className="space-y-2 p-4">
                <h3 className="font-semibold">Files</h3>
                <ul className="space-y-1 text-sm">
                  {posting.attachments.map((att) => (
                    <li key={att.id} className="flex flex-wrap items-center gap-2">
                      {att.file ? (
                        <a
                          href={att.file}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {att.original_filename}
                        </a>
                      ) : (
                        att.original_filename
                      )}
                      <span className="text-xs text-muted-foreground">
                        {att.sap_attachment_status}
                        {att.sap_error_message ? ` — ${att.sap_error_message}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {posting.simulated && posting.simulated_payload && (
            <Card>
              <CardContent className="space-y-2 p-4">
                <h3 className="font-semibold">The document it would have sent</h3>
                <pre className="max-h-96 overflow-auto rounded-md bg-muted/40 p-3 text-xs">
                  {JSON.stringify(posting.simulated_payload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <RecordTimestamps createdAt={posting.created_at} updatedAt={posting.updated_at} />

          <Button variant="outline" onClick={backToHistory}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to history
          </Button>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  );
}
