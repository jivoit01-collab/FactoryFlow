/** One order: its lines, the stock answer, and how it got there. */
import { PackageSearch } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { ORDER_PROCESSING_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useOpCheckStock, useOpOrder, useOpTimeline } from '../api/order-processing.queries';
import { IssueList, StateBadge, VerdictBadge } from '../components';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const id = Number(orderId);
  const { hasPermission } = usePermission();
  const canCheck = hasPermission(ORDER_PROCESSING_PERMISSIONS.PLAN_PRODUCTION);

  const query = useOpOrder(id);
  const timeline = useOpTimeline(id);
  const check = useOpCheckStock();

  if (query.isLoading) {
    return <div className="p-6"><DashboardHeader title="Order" description="Loading…" /></div>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="p-6">
        <DashboardHeader title="Order" />
        <p className="mt-4 text-sm text-destructive">
          {getErrorMessage(query.error, 'Could not load this order.')}
        </p>
      </div>
    );
  }

  const o = query.data;
  const latest = o.latest_check;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader title={o.order_number}
                       description={`${o.customer_name} · ${o.oms_status}`}>
        <div className="flex items-center gap-2">
          <StateBadge state={o.state} />
          {canCheck && (
            <Button size="sm" onClick={() => check.mutate(id)} disabled={check.isPending}>
              <PackageSearch className="mr-2 h-4 w-4" />
              {check.isPending ? 'Checking…' : 'Check stock'}
            </Button>
          )}
        </div>
      </DashboardHeader>

      <Card>
        <CardContent className="grid gap-x-8 gap-y-1 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <span><span className="text-muted-foreground">Customer</span> {o.customer_code}</span>
          <span><span className="text-muted-foreground">Branch</span> {o.branch_name || '—'}</span>
          <span><span className="text-muted-foreground">Delivery</span>{' '}
            {o.delivery_date ?? (o.delivery_date_raw
              ? <span className="text-amber-600">unparsed: {o.delivery_date_raw}</span> : '—')}</span>
          <span><span className="text-muted-foreground">In SAP</span>{' '}
            {o.sap_created ? (o.sap_doc_number || 'yes')
              : <span className="text-amber-600">not pushed</span>}</span>
          <span><span className="text-muted-foreground">PO</span> {o.po_number || '—'}</span>
          <span><span className="text-muted-foreground">Value</span> {o.total_amount ?? '—'}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Pack</th>
                  <th className="px-3 py-2 text-right font-medium">Cases</th>
                  <th className="px-3 py-2 font-medium">Warehouse</th>
                  <th className="px-3 py-2 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {o.lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-medium">{l.item_code}</span>
                      <span className="block text-xs text-muted-foreground">{l.item_name}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.pack_size}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.cases}</td>
                    <td className="px-3 py-2">{l.warehouse_code || <span className="text-amber-600">none</span>}</td>
                    <td className="px-3 py-2"><IssueList issues={l.issues} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {latest && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <VerdictBadge verdict={latest.verdict} />
              <span className="text-muted-foreground">
                checked {new Date(latest.checked_at).toLocaleString()}
                {latest.checked_by && ` by ${latest.checked_by}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Need</th>
                    <th className="px-3 py-2 text-right font-medium">On hand</th>
                    <th className="px-3 py-2 text-right font-medium">Committed</th>
                    <th className="px-3 py-2 text-right font-medium">Free</th>
                    <th className="px-3 py-2 text-right font-medium">Short</th>
                    <th className="px-3 py-2 font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.lines.map((l, i) => (
                    <tr key={`${l.item_code}-${i}`} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{l.item_code}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.required}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.on_hand}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.committed_in_sap}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.available}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.short}</td>
                      <td className="px-3 py-2">
                        <VerdictBadge verdict={l.verdict} />
                        {l.notes.map((n) => (
                          <span key={n} className="block text-xs text-muted-foreground">{n}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {latest.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-amber-600">
                {latest.errors.map((e) => <li key={e}>! {e}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">Timeline</p>
          {timeline.data?.events.length ? (
            <ul className="space-y-1 text-sm">
              {timeline.data.events.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-2">
                  <span className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                  <span className="font-medium">{e.event}</span>
                  {e.old_state && <span className="text-muted-foreground">{e.old_state} → {e.new_state}</span>}
                  {e.error && <span className="text-destructive">{e.error}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
