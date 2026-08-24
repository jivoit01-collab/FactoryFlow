/**
 * One purchase order: its lines, the evidence for each quantity, and the three
 * steps to SAP.
 *
 * Raise, approve, post. Three permissions, and the backend also refuses to let
 * one person approve their own order — a buyer who can do all three alone can
 * commit the company's money with nobody else seeing the number.
 */
import { AlertTriangle, ArrowLeft, CheckCircle2, Send, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { PLANNING_PURCHASE_PERMISSIONS } from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  usePostPurchaseOrder,
  usePurchaseOrder,
} from '../api';
import { money, qty, qtyPrecise, shortDate } from '../components';
import { PO_STATUS_CLASS } from '../constants';

export default function PurchaseOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const id = Number(orderId);

  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(PLANNING_PURCHASE_PERMISSIONS.APPROVE_PO);
  const canPost = hasPermission(PLANNING_PURCHASE_PERMISSIONS.POST_PO);
  const canEdit = hasPermission(PLANNING_PURCHASE_PERMISSIONS.CREATE_PO);

  const query = usePurchaseOrder(id || undefined);
  const approve = useApprovePurchaseOrder();
  const post = usePostPurchaseOrder();
  const cancel = useCancelPurchaseOrder();

  if (query.isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <DashboardHeader title="Purchase Order" description="Loading…" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <DashboardHeader title="Purchase Order" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">
              {getErrorMessage(query.error, 'Could not load this purchase order.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = query.data;

  // The author cannot approve their own order. Saying so before the click beats
  // a 409 after it.
  const isAuthor = Boolean(user?.id && order.created_by === user.id);
  const approvable = order.status === 'DRAFT' && canApprove && !isAuthor;
  const postable = (order.status === 'APPROVED' || order.status === 'FAILED') && canPost;
  const cancellable =
    order.status !== 'POSTED' && order.status !== 'CANCELLED' && canEdit;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title={order.vendor_name || order.vendor_code}
        description={
          order.plan_code
            ? `Raised from plan ${order.plan_code}`
            : 'Purchase order'
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/planning-purchase/purchase-orders">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All orders
            </Link>
          </Button>

          {approvable ? (
            <Button
              size="sm"
              onClick={() => approve.mutate(order.id)}
              disabled={approve.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {approve.isPending ? 'Approving…' : 'Approve'}
            </Button>
          ) : null}

          {postable ? (
            <Button
              size="sm"
              onClick={() => post.mutate(order.id)}
              disabled={post.isPending}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {post.isPending ? 'Posting…' : 'Post to SAP'}
            </Button>
          ) : null}

          {cancellable ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancel.mutate({ id: order.id })}
              disabled={cancel.isPending}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
          ) : null}
        </div>
      </DashboardHeader>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn(PO_STATUS_CLASS[order.status])}>
          {order.status_display}
        </Badge>
        {order.simulated ? (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            Simulated — nothing was sent to SAP
          </Badge>
        ) : null}
        {order.sap_doc_num ? (
          <Badge variant="outline" className="font-mono">
            SAP {order.sap_doc_num}
          </Badge>
        ) : null}
      </div>

      {order.status === 'DRAFT' && isAuthor && canApprove ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          You raised this order, so somebody else has to approve it. That separation
          is deliberate — approving your own spend leaves nobody checking the number.
        </p>
      ) : null}

      {order.sap_error_message ? (
        <Card className="border-destructive/40">
          <CardContent className="flex gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">SAP rejected this order</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                {order.sap_error_message}
              </p>
              {canPost ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Fix the cause in SAP or on the lines below, then post again. Retrying
                  cannot create a duplicate — the order carries a one-time key.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Supplier" value={`${order.vendor_name} (${order.vendor_code})`} />
        <Detail label="Delivery date" value={shortDate(order.doc_due_date)} />
        <Detail
          label="Receiving warehouse"
          value={order.warehouse_code || 'per BOM issue warehouse'}
        />
        <Detail label="Total" value={money(order.total_value, order.currency)} />
        <Detail label="Raised by" value={order.created_by_name || '—'} />
        <Detail
          label="Approved by"
          value={
            order.approved_by_name
              ? `${order.approved_by_name} · ${shortDate(order.approved_at)}`
              : 'not yet'
          }
        />
        <Detail label="Posted" value={order.posted_at ? shortDate(order.posted_at) : '—'} />
        <Detail label="Plan" value={order.plan_name || order.plan_code || '—'} />
      </div>

      {order.remarks ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground">Remarks</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{order.remarks}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Order qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
              <th className="px-3 py-2 text-left font-medium">Needed</th>
              <th className="px-3 py-2 text-right font-medium">Why this quantity</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id} className="border-t align-top">
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">{line.item_code}</span>
                  <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                    {line.item_name}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {qtyPrecise(line.quantity)}
                  <span className="ml-1 text-[10px] text-muted-foreground">{line.uom}</span>
                  {line.moq_applied ? (
                    <div
                      className="text-[10px] text-muted-foreground"
                      title="Rounded up to the supplier's minimum order quantity."
                    >
                      MOQ {qty(line.moq_applied)}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {money(line.unit_price, order.currency)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {money(line.line_value, order.currency)}
                </td>
                <td className="px-3 py-2 text-xs">{shortDate(line.required_date)}</td>
                <td className="px-3 py-2 text-right text-[11px] text-muted-foreground">
                  {/* The snapshot taken when the order was raised, so the approver
                      can check the arithmetic instead of trusting it. */}
                  needed {qty(line.required_qty)} · had {qty(line.available_qty)} · on
                  order {qty(line.on_order_qty)} ={' '}
                  <span className="font-medium text-foreground">
                    short {qty(line.shortage_qty)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        The &ldquo;why this quantity&rdquo; figures are a snapshot from when the order was
        raised, not live values — the plan and the stock both move on, and the
        approver needs to see what the decision was actually based on.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
