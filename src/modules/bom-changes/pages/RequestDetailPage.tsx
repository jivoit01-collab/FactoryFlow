/**
 * One BOM change request: what it asks for, where it is on the ladder, every
 * decision on it, and — for a change — what it does to the tree SAP holds.
 *
 * The buttons follow the row's own flags (`can_approve`, `can_reject`,
 * `can_cancel`, `can_push`), so the page never offers what the server would
 * refuse. The approval that writes SAP (`can_push`) confirms through
 * `confirmSapPost` first. As on SAP Portal's approvals page, one remarks box
 * serves approve and reject, and rejecting without a reason asks first.
 */
import { AlertTriangle, CheckCircle2, ClipboardList, Database, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog, confirmSapPost } from '@/shared/components';
import {
  EmptyPanel,
  PageHeader,
  PageSection,
  StatusPill,
  TableCard,
} from '@/shared/components/page';
import { Button, Textarea } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import {
  type ChangeRequestDetail,
  useApproveRequest,
  useCancelRequest,
  useChangeRequest,
  useRejectRequest,
} from '../api';
import { BomLinesTable } from '../components/BomLinesTable';
import { LineDiffTable } from '../components/LineDiffTable';
import { ApprovalHistory, RequestSteps } from '../components/RequestProgress';
import { diffLines } from '../utils/requestDraft';
import { STATUS_TONE } from '../utils/status';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children || '—'}</dd>
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const requestId = Number(id);
  const request = useChangeRequest(Number.isFinite(requestId) ? requestId : null);

  if (request.isLoading) return <EmptyPanel message="Loading the request…" loading />;
  if (request.isError || !request.data) return <EmptyPanel message="This request was not found." />;
  return <RequestDetail request={request.data} />;
}

function RequestDetail({ request }: { request: ChangeRequestDetail }) {
  const [remarks, setRemarks] = useState('');
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const cancel = useCancelRequest();
  const busy = approve.isPending || reject.isPending || cancel.isPending;
  const isChange = request.kind === 'UPDATE';
  const snapshotLines = Array.isArray(request.original_data?.lines)
    ? request.original_data.lines
    : null;
  const diff =
    isChange && snapshotLines
      ? diffLines(
          snapshotLines.filter((l) => l.item_type !== 'text'),
          request.lines,
        )
      : null;
  const decidable = request.can_approve || request.can_reject;

  const onApprove = async () => {
    if (request.can_push) {
      const items = request.lines.filter((line) => line.item_type === 'item').length;
      const ok = await confirmSapPost({
        title: isChange
          ? `Approve and replace the BOM for ${request.item_code} in SAP?`
          : `Approve and create the BOM for ${request.item_code} in SAP?`,
        description: isChange
          ? 'This is the last approval. SAP will keep exactly the lines of this request — any other line is removed from the BOM.'
          : 'This is the last approval. The BOM is created in SAP straight away.',
        details: [
          { label: 'Item', value: `${request.item_code} — ${request.item_name || '-'}` },
          {
            label: 'Type / quantity',
            value: `${request.bom_type}, makes ${Number(request.quantity)}`,
          },
          { label: 'Lines', value: `${items} items, ${request.lines.length - items} resources` },
          { label: 'Raised by', value: request.submitted_by || '-' },
        ],
        confirmLabel: isChange ? 'Approve and replace in SAP' : 'Approve and create in SAP',
      });
      if (!ok) return;
    }
    try {
      const result = await approve.mutateAsync({ id: request.id, remarks });
      setRemarks('');
      toast.success(
        result.status === 'SAP_PUSHED'
          ? `BOM ${result.item_code} ${isChange ? 'updated' : 'created'} in SAP`
          : `Approved — now waiting for: ${result.awaiting}`,
      );
    } catch {
      // The API client has already shown SAP's or the server's words.
    }
  };

  const onReject = async () => {
    if (!remarks.trim()) {
      const ok = await confirmDialog({
        title: 'Reject without a reason?',
        description: 'The person who asked will see the request rejected with no reason given.',
        confirmLabel: 'Reject',
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await reject.mutateAsync({ id: request.id, remarks });
      setRemarks('');
      toast.success('Request rejected');
    } catch {
      // Already shown by the API client.
    }
  };

  const onCancel = async () => {
    const ok = await confirmDialog({
      title: `Cancel request #${request.id}?`,
      description: 'It leaves the approval queue. Nothing has been written to SAP.',
      confirmLabel: 'Cancel request',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancel.mutateAsync(request.id);
      toast.success('Request cancelled');
    } catch {
      // Already shown by the API client.
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span>
            <span className="font-mono">{request.item_code}</span>{' '}
            <span className="text-xl font-normal text-muted-foreground">#{request.id}</span>
          </span>
        }
        description={request.item_name}
        icon={ClipboardList}
        accent="indigo"
        backTo="/bom-changes/requests"
        backLabel="Change requests"
        meta={
          <>
            <StatusPill tone={request.kind === 'CREATE' ? 'done' : 'info'}>
              {request.kind_label}
            </StatusPill>
            <StatusPill tone={STATUS_TONE[request.status]} dot>
              {request.status_label}
            </StatusPill>
          </>
        }
      >
        {request.can_cancel && (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            <Undo2 className="mr-2 h-4 w-4" />
            Cancel request
          </Button>
        )}
      </PageHeader>

      <RequestSteps steps={request.steps} />

      {request.status === 'SAP_PUSHED' && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Database className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {request.sap_result?.operation === 'UPDATED' ? 'Replaced' : 'Created'} in SAP as BOM{' '}
            <span className="font-mono">{request.sap_result?.tree_code || request.item_code}</span>
            {request.sap_pushed_by_name && ` by ${request.sap_pushed_by_name}`}
            {request.sap_pushed_at && `, ${formatDateTimeShort(request.sap_pushed_at)}`}.
          </span>
        </div>
      )}
      {request.push_error && request.status !== 'SAP_PUSHED' && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The last push to SAP failed
            {request.push_failed_at && ` (${formatDateTimeShort(request.push_failed_at)})`}:{' '}
            {request.push_error}
          </span>
        </div>
      )}

      <dl className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="BOM type">{request.bom_type}</Fact>
        <Fact label="Quantity it makes">{Number(request.quantity).toLocaleString('en-IN')}</Fact>
        <Fact label="Warehouse">{request.warehouse}</Fact>
        <Fact label="Distribution rule / project">
          {[request.distribution_rule, request.project].filter(Boolean).join(' / ')}
        </Fact>
        <Fact label="Raised by">{request.submitted_by}</Fact>
        <Fact label="Raised">{formatDateTimeShort(request.submitted_at)}</Fact>
        <Fact label="Waiting for">{request.awaiting}</Fact>
        {request.legacy_portal_id ? (
          <Fact label="From SAP Portal">Request #{request.legacy_portal_id}</Fact>
        ) : request.cancelled_at ? (
          <Fact label="Cancelled">
            {request.cancelled_by_name} {formatDateTimeShort(request.cancelled_at)}
          </Fact>
        ) : null}
      </dl>

      {decidable && (
        <PageSection
          title="Your decision"
          description={
            request.can_push
              ? 'Approving now writes this BOM to SAP.'
              : `You sign: ${request.awaiting}.`
          }
        >
          <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Remarks (optional)"
              aria-label="Remarks"
            />
            <div className="flex flex-wrap justify-end gap-2">
              {request.can_reject && (
                <Button variant="outline" onClick={onReject} disabled={busy}>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              )}
              {request.can_approve && (
                <Button onClick={onApprove} disabled={busy}>
                  {request.can_push ? (
                    <Database className="mr-2 h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {approve.isPending
                    ? request.can_push
                      ? 'Writing to SAP…'
                      : 'Approving…'
                    : request.can_push
                      ? 'Approve and push to SAP'
                      : 'Approve'}
                </Button>
              )}
            </div>
          </div>
        </PageSection>
      )}

      {diff && (
        <PageSection
          title="What changes in SAP"
          description="The lines asked for, against the BOM as SAP held it when last read"
        >
          <TableCard>
            <LineDiffTable diff={diff} />
          </TableCard>
        </PageSection>
      )}

      <PageSection
        title={isChange ? 'The BOM after the change' : 'Components'}
        description={isChange ? 'Line prices and comments are not sent on a change.' : undefined}
      >
        <TableCard
          summary={`${request.lines.length} ${request.lines.length === 1 ? 'line' : 'lines'}`}
        >
          <BomLinesTable lines={request.lines} showCost={!isChange} />
        </TableCard>
      </PageSection>

      <PageSection title="Decisions">
        <ApprovalHistory approvals={request.approvals} />
      </PageSection>
    </div>
  );
}
