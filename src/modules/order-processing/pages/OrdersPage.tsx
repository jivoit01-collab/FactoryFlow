/** The order queue, with the blocked ones first. */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useOpOrders } from '../api/order-processing.queries';
import { StateBadge } from '../components';

const STATES = [
  { value: '', label: 'All' },
  { value: 'PRODUCTION_REQUIRED', label: 'Need production' },
  { value: 'READY_FOR_FULFILLMENT', label: 'Ready' },
  { value: 'STOCK_CHECKED', label: 'Unresolved' },
  { value: 'RECEIVED', label: 'Not checked' },
];

export default function OrdersPage() {
  const [state, setState] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useOpOrders({ state: state || undefined, search: search || undefined, page });

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader title="Orders" description="Mirrored from OMS. Read-only here." />

      <div className="flex flex-wrap items-center gap-2">
        {STATES.map((s) => (
          <Button key={s.value} size="sm"
                  variant={state === s.value ? 'default' : 'outline'}
                  onClick={() => { setState(s.value); setPage(1); }}>
            {s.label}
          </Button>
        ))}
        <Input className="h-9 w-56" placeholder="Order, customer or item code"
               value={search}
               onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Card>
        <CardContent className="p-0">
          {query.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {query.isError && (
            <p className="p-6 text-sm text-destructive">
              {getErrorMessage(query.error, 'Could not load orders.')}
            </p>
          )}
          {query.data && query.data.results.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No orders match.</p>
          )}
          {query.data && query.data.results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Order</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">OMS status</th>
                    <th className="px-3 py-2 text-right font-medium">Lines</th>
                    <th className="px-3 py-2 font-medium">Delivery</th>
                    <th className="px-3 py-2 font-medium">In SAP</th>
                    <th className="px-3 py-2 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.results.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <Link className="font-medium text-primary hover:underline"
                              to={`/order-processing/orders/${o.oms_order_id}`}>
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{o.customer_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{o.oms_status}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {o.line_count}
                        {/* A line the engine cannot trust is worth seeing from the
                            list, not only after opening the order. */}
                        {o.issue_count > 0 && (
                          <span className="ml-1 text-amber-600">({o.issue_count} flagged)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{o.delivery_date ?? '—'}</td>
                      <td className="px-3 py-2">
                        {o.sap_created ? (o.sap_doc_number || 'yes') : (
                          <span className="text-amber-600">not pushed</span>
                        )}
                      </td>
                      <td className="px-3 py-2"><StateBadge state={o.state} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {query.data && query.data.count > query.data.page_size && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {query.data.count} orders — page {query.data.page}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline"
                    disabled={page * query.data.page_size >= query.data.count}
                    onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
