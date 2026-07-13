import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  HandCoins,
  History,
  Lock,
  Paperclip,
  Pencil,
  Send,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import {
  useAcknowledgeReturnable,
  useApproveReturnable,
  useCancelReturnable,
  useCloseReturnable,
  useRejectReturnable,
  useReturnableGatePass,
  useShortCloseReturnable,
  useSubmitReturnableGatePass,
} from '../api/returnableGatePass.queries';
import {
  ReturnableReasonDialog,
  ReturnableStatusBadge,
  ReturnableTimeline,
  ReturnableTypeBadge,
} from '../components/returnable';
import { OUTSTANDING_STATUSES, RETURN_CONDITION_STYLES } from '../constants/returnable.constants';

type ReasonAction = 'cancel' | 'short-close' | 'reject' | null;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || '—'}</dd>
    </div>
  );
}

export default function MaintenanceReturnableDetailPage() {
  const { passId } = useParams<{ passId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const id = passId ? Number(passId) : null;
  const { data: pass, isLoading } = useReturnableGatePass(id);

  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);

  const submitMutation = useSubmitReturnableGatePass();
  const approveMutation = useApproveReturnable();
  const rejectMutation = useRejectReturnable();
  const acknowledgeMutation = useAcknowledgeReturnable();
  const closeMutation = useCloseReturnable();
  const shortCloseMutation = useShortCloseReturnable();
  const cancelMutation = useCancelReturnable();

  const canManage = hasPermission(RETURNABLE_PERMISSIONS.MANAGE_GATEPASS);
  const canSubmit = hasPermission(RETURNABLE_PERMISSIONS.SUBMIT_GATEPASS);
  const canApprove = hasPermission(RETURNABLE_PERMISSIONS.APPROVE_GATEPASS);
  const canAcknowledge = hasPermission(RETURNABLE_PERMISSIONS.ACKNOWLEDGE);
  const canClose = hasPermission(RETURNABLE_PERMISSIONS.CLOSE);
  const canShortClose = hasPermission(RETURNABLE_PERMISSIONS.SHORT_CLOSE);
  const canCancel = hasPermission(RETURNABLE_PERMISSIONS.CANCEL);

  if (isLoading || !pass || !id) {
    return <div className="p-6 text-muted-foreground">Loading gate pass…</div>;
  }

  const unacknowledged = pass.return_events.filter((event) => !event.is_acknowledged);
  // A non-returnable pass closes at the gate: nothing to return, collect or short close.
  const isOutstanding = pass.is_returnable && OUTSTANDING_STATUSES.includes(pass.status);

  const run = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
      setReasonAction(null);
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'The action could not be completed.';
      toast.error(detail);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/maintenance/returnable')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="mt-2 text-2xl font-semibold">{pass.pass_no}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ReturnableTypeBadge isReturnable={pass.is_returnable} />
            <ReturnableStatusBadge
              status={pass.status}
              isOverdue={pass.is_overdue}
              daysOverdue={pass.days_overdue}
            />
            <span className="text-sm text-muted-foreground">
              {pass.purpose_display} · {pass.destination}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pass.status === 'DRAFT' && canManage ? (
            <Button
              variant="outline"
              onClick={() => navigate(`/maintenance/returnable/${id}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}

          {pass.status === 'DRAFT' && canSubmit ? (
            <Button
              onClick={() =>
                run(() => submitMutation.mutateAsync(id), 'Sent to the approver for sign-off.')
              }
              disabled={submitMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Send for Approval
            </Button>
          ) : null}

          {pass.status === 'PENDING_APPROVAL' && canApprove ? (
            <>
              <Button
                variant="outline"
                onClick={() => setReasonAction('reject')}
                disabled={rejectMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() =>
                  run(
                    () => approveMutation.mutateAsync({ passId: id }),
                    `${pass.pass_no} approved and sent to the gate.`,
                  )
                }
                disabled={approveMutation.isPending}
              >
                <ThumbsUp className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          ) : null}

          {pass.is_returnable && unacknowledged.length > 0 && canAcknowledge ? (
            <Button
              onClick={() =>
                run(
                  () => acknowledgeMutation.mutateAsync({ passId: id }),
                  'Receipt acknowledged. The gate has been notified.',
                )
              }
              disabled={acknowledgeMutation.isPending}
            >
              <HandCoins className="mr-2 h-4 w-4" />
              Acknowledge Collection ({unacknowledged.length})
            </Button>
          ) : null}

          {pass.is_returnable && pass.status === 'RETURNED' && unacknowledged.length === 0 && canClose ? (
            <Button
              onClick={() => run(() => closeMutation.mutateAsync(id), `${pass.pass_no} closed.`)}
              disabled={closeMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Close Pass
            </Button>
          ) : null}

          {isOutstanding && canShortClose ? (
            <Button variant="outline" onClick={() => setReasonAction('short-close')}>
              <Lock className="mr-2 h-4 w-4" />
              Short Close
            </Button>
          ) : null}

          {['DRAFT', 'PENDING_APPROVAL', 'PENDING_GATE_OUT', 'OUT', 'PARTIALLY_RETURNED'].includes(
            pass.status,
          ) &&
          pass.return_events.length === 0 &&
          canCancel ? (
            <Button variant="destructive" onClick={() => setReasonAction('cancel')}>
              <Ban className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {pass.approval_rejected_reason && pass.status === 'DRAFT' ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-sm text-rose-900">
            <strong>Rejected by the approver:</strong> {pass.approval_rejected_reason}
          </CardContent>
        </Card>
      ) : null}

      {pass.rejected_reason && pass.status === 'DRAFT' ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-sm text-rose-900">
            <strong>Rejected at the gate:</strong> {pass.rejected_reason}
          </CardContent>
        </Card>
      ) : null}

      {pass.short_close_reason ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            <strong>Short closed:</strong> {pass.short_close_reason} — {pass.pending_return_qty}{' '}
            unit(s) never came back.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gate Pass Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Field label="Department" value={pass.department_name} />

                {pass.is_returnable ? (
                  <>
                    <Field label="Requested By" value={pass.requested_by_name} />
                    <Field label="Contact" value={pass.contact_no} />
                    <Field label="Party" value={pass.party_name} />
                    <Field label="Party Contact" value={pass.party_contact} />
                    <Field label="Party GSTIN" value={pass.party_gstin} />
                    <Field
                      label="Expected Return"
                      value={
                        pass.expected_return_date
                          ? new Date(pass.expected_return_date).toLocaleDateString()
                          : ''
                      }
                    />
                  </>
                ) : (
                  <>
                    <Field label="Issued By" value={pass.issued_by_name} />
                    <Field
                      label="Issued To"
                      value={pass.recipient_display_name || pass.recipient_name}
                    />
                    <Field label="Recipient Contact" value={pass.recipient_contact} />
                    <Field label="Recipient Department" value={pass.recipient_department} />
                    <Field label="Destination / Firm" value={pass.party_name} />
                  </>
                )}
                <Field label="Linked Asset" value={pass.asset_name} />
                <Field label="Work Order" value={pass.work_order_no} />
                <Field label="Purpose Detail" value={pass.purpose_detail} />
                <Field label="Submitted By" value={pass.submitted_by_name} />
                <Field
                  label="Approved By"
                  value={
                    pass.approved_at
                      ? `${pass.approved_by_name} · ${new Date(pass.approved_at).toLocaleDateString()}`
                      : ''
                  }
                />
              </dl>
            </CardContent>
          </Card>

          {pass.gate_out_at ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gate Out</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-3">
                  {pass.is_hand_carried ? (
                    <>
                      <Field label="Conveyance" value="Hand-carried (no vehicle)" />
                      <Field label="Carried By" value={pass.carried_by_name} />
                    </>
                  ) : (
                    <>
                      <Field
                        label="Vehicle"
                        value={pass.vehicle_number || pass.vehicle_number_manual}
                      />
                      <Field label="Driver" value={pass.driver_name || pass.driver_name_manual} />
                      <Field label="Driver Mobile" value={pass.driver_mobile} />
                      <Field label="Transporter" value={pass.transporter_name} />
                    </>
                  )}
                  <Field label="Security" value={pass.security_name} />
                  <Field label="Gated Out At" value={new Date(pass.gate_out_at).toLocaleString()} />
                  <Field label="Gated Out By" value={pass.gate_out_by_name} />
                  <Field label="Remarks" value={pass.out_remarks} />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {pass.is_returnable
                  ? `Items (${pass.total_quantity_returned} of ${pass.total_quantity_out} returned)`
                  : `Items Issued (${pass.total_quantity_out})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      {/* Serial, make/model and condition only exist on a
                          returnable line — a non-returnable pass never captures them. */}
                      {pass.is_returnable ? (
                        <>
                          <th className="px-3 py-2 text-left font-medium">Serial</th>
                          <th className="px-3 py-2 text-left font-medium">Condition Out</th>
                        </>
                      ) : null}
                      <th className="px-3 py-2 text-right font-medium">Out</th>
                      {pass.is_returnable ? (
                        <>
                          <th className="px-3 py-2 text-right font-medium">Returned</th>
                          <th className="px-3 py-2 text-right font-medium">Pending</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {pass.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{item.line_num}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(pass.is_returnable
                              ? [item.item_code, item.make_model]
                              : [item.item_code]
                            )
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </td>
                        {pass.is_returnable ? (
                          <>
                            <td className="px-3 py-2">{item.serial_no || '—'}</td>
                            <td className="px-3 py-2">{item.condition_out_display}</td>
                          </>
                        ) : null}
                        <td className="px-3 py-2 text-right">
                          {item.quantity_out} {item.uom}
                        </td>
                        {pass.is_returnable ? (
                          <>
                            <td className="px-3 py-2 text-right">{item.quantity_returned}</td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={
                                  Number(item.pending_return_qty) > 0
                                    ? 'font-medium text-amber-700'
                                    : 'text-emerald-700'
                                }
                              >
                                {item.pending_return_qty}
                              </span>
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {pass.attachments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Attachments ({pass.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {pass.attachments.map((attachment) => (
                    <li key={attachment.id} className="flex items-center gap-2 text-sm">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <a
                        href={attachment.file}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium underline-offset-2 hover:underline"
                      >
                        {attachment.caption || attachment.file.split('/').pop()}
                      </a>
                      <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {attachment.doc_type_display}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {pass.return_events.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Return Trips ({pass.return_events.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pass.return_events.map((event) => (
                  <div key={event.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{event.event_ref}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.returned_at).toLocaleString()} · Vehicle{' '}
                          {event.vehicle_number || '—'} · Verified by {event.verified_by_name}
                        </p>
                      </div>
                      {event.is_acknowledged ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          Collected by {event.acknowledged_by_name}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Awaiting collection
                        </span>
                      )}
                    </div>

                    <ul className="mt-2 space-y-1">
                      {event.lines.map((line) => (
                        <li key={line.id} className="flex items-center gap-2 text-sm">
                          <span className="flex-1">{line.item_name}</span>
                          <span className="text-muted-foreground">
                            {line.quantity_returned} {line.uom}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${RETURN_CONDITION_STYLES[line.return_condition]}`}
                          >
                            {line.return_condition_display}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Audit trail. The backend has no simple-history, so the module keeps
            its own append-only log of every action taken on the pass. */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Audit History
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Every action taken on {pass.pass_no}, newest first.
            </p>
          </CardHeader>
          <CardContent>
            <ReturnableTimeline passId={id} />
          </CardContent>
        </Card>
      </div>

      <ReturnableReasonDialog
        open={reasonAction === 'reject'}
        onOpenChange={(open) => setReasonAction(open ? 'reject' : null)}
        title={`Reject ${pass.pass_no}`}
        description="The pass goes back to the department as a draft. The gate never sees it."
        confirmLabel="Reject"
        destructive
        isPending={rejectMutation.isPending}
        onConfirm={(reason) =>
          run(
            () => rejectMutation.mutateAsync({ passId: id, payload: { reason } }),
            `${pass.pass_no} sent back to the department.`,
          )
        }
      />

      <ReturnableReasonDialog
        open={reasonAction === 'cancel'}
        onOpenChange={(open) => setReasonAction(open ? 'cancel' : null)}
        title={`Cancel ${pass.pass_no}`}
        description="The gate will be told to stop expecting this pass. Only possible while nothing has come back."
        confirmLabel="Cancel Gate Pass"
        destructive
        isPending={cancelMutation.isPending}
        onConfirm={(reason) =>
          run(
            () => cancelMutation.mutateAsync({ passId: id, payload: { reason } }),
            `${pass.pass_no} cancelled.`,
          )
        }
      />

      <ReturnableReasonDialog
        open={reasonAction === 'short-close'}
        onOpenChange={(open) => setReasonAction(open ? 'short-close' : null)}
        title={`Short close ${pass.pass_no}`}
        description={`${pass.pending_return_qty} unit(s) are still out. Short closing records them as never returning — scrapped, lost or written off.`}
        confirmLabel="Short Close"
        destructive
        isPending={shortCloseMutation.isPending}
        onConfirm={(reason) =>
          run(
            () => shortCloseMutation.mutateAsync({ passId: id, payload: { reason } }),
            `${pass.pass_no} short closed.`,
          )
        }
      />
    </div>
  );
}
