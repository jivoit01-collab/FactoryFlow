/**
 * Purchase orders raised from a plan, and where each one has got to.
 *
 * Draft to approved to posted. A `simulated` badge matters here: an order marked
 * posted while the backend was in simulate mode has no SAP document behind it,
 * and somebody will otherwise go looking for one.
 */
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { usePurchaseOrders } from '../api';
import { money, shortDate } from '../components';
import { PO_STATUS_CLASS } from '../constants';
import type { PurchaseOrderStatus } from '../types';

const STATUS_TABS: { value: PurchaseOrderStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function PurchaseOrderListPage() {
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [search, setSearch] = useState('');

  const query = usePurchaseOrders({
    status: status || undefined,
    search: search || undefined,
  });

  const counts = query.data?.meta.status_counts;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Purchase Orders"
        description="Raised from a production plan's bill of materials."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', query.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'rounded border px-3 py-1.5 text-xs transition-colors',
                status === tab.value
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {tab.label}
              {tab.value && counts ? (
                <span className="ml-1.5 tabular-nums opacity-70">
                  {counts[tab.value] ?? 0}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Supplier, plan or item code"
          className="h-9 max-w-xs"
        />
      </div>

      {query.isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading purchase orders…
          </CardContent>
        </Card>
      ) : null}

      {query.isError ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">
              {getErrorMessage(query.error, 'Could not load purchase orders.')}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {query.data && !query.data.data.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">No purchase orders yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open a plan and use <span className="font-medium">Purchase from BOM</span> to
              raise one from its material shortfall.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/planning-purchase">Go to plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {query.data?.data.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Supplier</th>
                <th className="px-3 py-2 text-left font-medium">Plan</th>
                <th className="px-3 py-2 text-right font-medium">Lines</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
                <th className="px-3 py-2 text-left font-medium">Delivery</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">SAP</th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/planning-purchase/purchase-orders/${order.id}`}
                      className="font-medium hover:underline"
                    >
                      {order.vendor_name || order.vendor_code}
                    </Link>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {order.vendor_code}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {order.plan_code || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {order.line_count}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {money(order.total_value, order.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{shortDate(order.doc_due_date)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', PO_STATUS_CLASS[order.status])}
                      >
                        {order.status_display}
                      </Badge>
                      {order.simulated ? (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          title="Marked posted in simulate mode — there is no SAP document behind this."
                        >
                          simulated
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {order.sap_doc_num ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/planning-purchase/purchase-orders/${order.id}`}>
                        Open
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {query.data && query.data.meta.total_pages > 1 ? (
        <p className="text-xs text-muted-foreground">
          Showing page {query.data.meta.page} of {query.data.meta.total_pages} (
          {query.data.meta.total} orders).
        </p>
      ) : null}
    </div>
  );
}
