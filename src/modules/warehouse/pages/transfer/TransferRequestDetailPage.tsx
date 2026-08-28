import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Upload,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Textarea } from '@/shared/components/ui';

import {
  useApproveTransferRequest,
  useWarehouseScope,
  usePostTransferSecondLeg,
  usePostTransferToSAP,
  useRejectTransferRequest,
  useTransferBatchVerification,
  useTransferRequest,
} from '../../api';
import type { TransferPostAllocation, TransferRequestDetail } from '../../types';
import { BatchAllocationDialog } from './BatchAllocationDialog';
import { QuantityInput } from './QuantityInput';
import { ApprovalBadge, PostingBadge, Route, RouteBadge } from './TransferBadges';
import { qty, shortDate } from './transferFormat';

function apiError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function TransferRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const id = Number(requestId);

  const { data: request, isLoading, isError } = useTransferRequest(id);
  const approve = useApproveTransferRequest();
  const reject = useRejectTransferRequest();
  const post = usePostTransferToSAP();
  const secondLeg = usePostTransferSecondLeg();

  const [approvedQty, setApprovedQty] = useState<Record<number, string>>({});
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [verifyOn, setVerifyOn] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  const [error, setError] = useState('');

  const verification = useTransferBatchVerification(id, verifyOn);

  // Two things have to be true to approve: the permission, and being the manager
  // of the warehouse the stock is coming INTO. The permission alone used to be
  // enough, which let any approver accept another site's inbound stock.
  const scope = useWarehouseScope();
  const canPost = hasPermission(WAREHOUSE_PERMISSIONS.POST_TRANSFER_TO_SAP);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading request…</p>;
  if (isError || !request) {
    return <p className="p-6 text-sm text-red-600">Could not load this transfer request.</p>;
  }

  const r: TransferRequestDetail = request;
  const managesDestination = scope.manages(r.to_warehouse);
  const canApprove =
    hasPermission(WAREHOUSE_PERMISSIONS.APPROVE_TRANSFER_REQUEST) && managesDestination;
  const isPending = r.status === 'PENDING';
  const isApproved = r.status === 'APPROVED' || r.status === 'PARTIALLY_APPROVED';
  const notPosted = r.posting_status === 'NOT_POSTED' || r.posting_status === 'FAILED';
  const hasBatchLines = r.lines.some((l) => l.is_batch_managed);

  async function run(fn: () => Promise<unknown>, fallback: string) {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(apiError(err, fallback));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title={r.entry_no} description={`${r.from_warehouse} → ${r.to_warehouse}`}>
        <Button variant="outline" onClick={() => navigate('/warehouse/transfer-requests')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>

      {/* --- state ------------------------------------------------------- */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Route">
            <div className="flex flex-wrap items-center gap-2">
              <Route from={r.from_warehouse} to={r.to_warehouse} />
              <RouteBadge routeType={r.route_type} />
            </div>
          </Field>
          <Field label="Approval">
            <ApprovalBadge status={r.status} />
          </Field>
          <Field label="Stock movement">
            <PostingBadge status={r.posting_status} intransitWarehouse={r.intransit_warehouse} />
          </Field>
          <Field label="Raised">
            {shortDate(r.created_at)} by {r.requested_by_name || '—'}
          </Field>

          <Field label="Request in SAP">
            {r.sap_request_doc_num ? (
              <span className="tabular-nums" title="Reserves the stock while the decision is pending">
                {r.sap_request_doc_num}
              </span>
            ) : (
              <span className="text-muted-foreground">not raised</span>
            )}
          </Field>
          <Field label={r.is_cross_branch ? 'Transfer — leg 1' : 'Transfer'}>
            {r.sap_transfer_doc_num ? (
              <span className="tabular-nums">{r.sap_transfer_doc_num}</span>
            ) : (
              <span className="text-muted-foreground">not posted</span>
            )}
          </Field>
          {r.is_cross_branch && (
            <Field label="Transfer — leg 2">
              {r.sap_leg2_doc_num ? (
                <span className="tabular-nums">{r.sap_leg2_doc_num}</span>
              ) : (
                <span className="text-muted-foreground">posts on receipt</span>
              )}
            </Field>
          )}
          <Field label="BST">
            {r.bst_entry_no ? (
              <button
                type="button"
                className="text-primary underline"
                onClick={() => navigate(`/warehouse/bst/${r.bst_transfer}`)}
              >
                {r.bst_entry_no}
              </button>
            ) : (
              <span className="text-muted-foreground">none yet</span>
            )}
          </Field>
        </CardContent>
      </Card>

      {r.remarks && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Why</div>
            <p className="mt-1">{r.remarks}</p>
          </CardContent>
        </Card>
      )}

      {r.status === 'REJECTED' && r.rejection_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Rejected:</strong> {r.rejection_reason}
        </div>
      )}

      {r.posting_status === 'FAILED' && r.posting_error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>SAP refused this transfer.</strong>
              <p className="mt-1">{r.posting_error}</p>
            </div>
          </div>
        </div>
      )}

      {r.awaits_second_leg && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              This move crosses SAP branches, so the stock is sitting in{' '}
              <strong>{r.intransit_warehouse}</strong>. It lands at {r.to_warehouse} when the
              receiving side finishes the BST receipt — which posts the second leg
              automatically.
            </div>
          </div>
        </div>
      )}

      {/* --- lines ------------------------------------------------------- */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Route</th>
                  <th className="px-4 py-3 text-right font-medium">Requested</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {isPending && canApprove ? 'Approve' : 'Approved'}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Moved</th>
                  <th className="px-4 py-3 text-left font-medium">Batches</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{line.item_code}</div>
                      {line.item_name && (
                        <div className="text-xs text-muted-foreground">{line.item_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Route from={line.source_warehouse} to={line.destination_warehouse} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {qty(line.requested_qty)} {line.uom}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPending && canApprove ? (
                        <QuantityInput
                          ariaLabel={`Approved quantity for ${line.item_code}`}
                          className="ml-auto w-28 text-right"
                          placeholder={qty(line.requested_qty)}
                          uom={line.uom}
                          max={line.requested_qty}
                          value={approvedQty[line.line_num] ?? ''}
                          onChange={(value) =>
                            setApprovedQty((p) => ({ ...p, [line.line_num]: value }))
                          }
                        />
                      ) : (
                        <span className="tabular-nums">{qty(line.approved_qty)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {qty(line.transferred_qty)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {!line.is_batch_managed ? (
                        <span>not batch-tracked</span>
                      ) : line.batch_allocation.length ? (
                        line.batch_allocation.map((b) => (
                          <div key={b.BatchNumber} className="tabular-nums">
                            {b.BatchNumber} × {qty(b.Quantity)}
                          </div>
                        ))
                      ) : (
                        <span>chosen at posting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isPending && canApprove && (
            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              Leave a quantity blank to approve it in full. Set it to 0 to reject just that
              line.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* A user with the approve permission but the wrong warehouse would
          otherwise just find the buttons missing, which reads as a bug. */}
      {isPending &&
        hasPermission(WAREHOUSE_PERMISSIONS.APPROVE_TRANSFER_REQUEST) &&
        !managesDestination && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            This request is coming into <strong>{r.to_warehouse}</strong>, which you do not
            manage — its own manager decides on it. You can follow it here but not approve or
            reject it.
          </div>
        )}

      {/* --- actions ----------------------------------------------------- */}
      <div className="flex flex-wrap justify-end gap-2">
        {isPending && canApprove && (
          <>
            <Button
              variant="outline"
              onClick={() => setShowReject((v) => !v)}
              disabled={reject.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              disabled={approve.isPending}
              onClick={() =>
                run(
                  () =>
                    approve.mutateAsync({
                      requestId: id,
                      data: {
                        lines: Object.entries(approvedQty)
                          .filter(([, v]) => v !== '')
                          .map(([lineNum, v]) => ({
                            line_num: Number(lineNum),
                            approved_qty: Number(v),
                          })),
                      },
                    }),
                  'Could not approve this request.',
                )
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {approve.isPending ? 'Approving…' : 'Approve'}
            </Button>
          </>
        )}

        {isApproved && notPosted && canPost && (
          <Button
            disabled={post.isPending}
            onClick={() => {
              // Anything batch-tracked gets the choose-batches step; a request
              // with nothing batch-tracked has no choice to make, so skip it.
              if (hasBatchLines) {
                setShowBatches(true);
                return;
              }
              void run(
                () => post.mutateAsync({ requestId: id }),
                'Could not post the transfer to SAP.',
              );
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            {post.isPending
              ? 'Posting…'
              : hasBatchLines
                ? 'Choose batches & post'
                : r.is_cross_branch
                  ? 'Post leg 1 to SAP'
                  : 'Post transfer to SAP'}
          </Button>
        )}

        {r.sap_transfer_doc_entry && !r.bst_transfer && canPost && (
          <Button
            variant="outline"
            onClick={() =>
              // Hand off to the ordinary BST screen with this transfer's document
              // pre-selected, so the user still gets vehicle, driver, gate and
              // the option to combine other documents onto the same shipment.
              navigate(
                `/warehouse/bst/new?docEntry=${r.sap_transfer_doc_entry}` +
                  `&fromRequest=${encodeURIComponent(r.entry_no)}`,
              )
            }
          >
            <Boxes className="mr-2 h-4 w-4" />
            Create BST
          </Button>
        )}

        {/* Leg 2 normally posts itself when the receipt completes; this is the
            manual retry for when that post failed. */}
        {r.is_cross_branch && r.sap_transfer_doc_entry && !r.sap_leg2_doc_entry && canPost && (
          <Button
            variant="outline"
            disabled={secondLeg.isPending}
            onClick={() =>
              run(
                () => secondLeg.mutateAsync({ requestId: id }),
                'Could not post the second leg.',
              )
            }
          >
            <Truck className="mr-2 h-4 w-4" />
            {secondLeg.isPending ? 'Posting…' : 'Post leg 2 now'}
          </Button>
        )}

        {hasBatchLines && r.sap_transfer_doc_entry && (
          <Button variant="ghost" onClick={() => setVerifyOn(true)} disabled={verification.isFetching}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {verification.isFetching ? 'Checking…' : 'Check batches in SAP'}
          </Button>
        )}
      </div>

      {showReject && isPending && canApprove && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why are you rejecting this? The requester will see it."
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={() =>
                  run(
                    () =>
                      reject.mutateAsync({ requestId: id, data: { reason: rejectReason.trim() } }),
                    'Could not reject this request.',
                  )
                }
              >
                {reject.isPending ? 'Rejecting…' : 'Confirm rejection'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <BatchAllocationDialog
        requestId={id}
        open={showBatches}
        onOpenChange={setShowBatches}
        isPosting={post.isPending}
        crossBranch={r.is_cross_branch}
        onConfirm={(allocations: TransferPostAllocation[]) =>
          run(async () => {
            await post.mutateAsync({ requestId: id, allocations });
            setShowBatches(false);
          }, 'Could not post the transfer to SAP.')
        }
      />

      {verifyOn && verification.data && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            verification.data.matches
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {verification.data.matches ? (
            'SAP recorded exactly the batches we sent.'
          ) : (
            <>
              <strong>SAP recorded different batches:</strong>
              <ul className="mt-1 list-disc pl-5">
                {verification.data.discrepancies.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
