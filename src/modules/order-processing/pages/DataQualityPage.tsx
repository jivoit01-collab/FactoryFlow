/** The lines the engine cannot fully trust — and why.
 *
 * A third of live lines carry a flag, almost all of them BEVERAGES with no
 * warehouse, because OMS sends no WarehouseCode for that category. Those orders
 * can never reach a stock answer, so they need somewhere to be seen and chased
 * rather than sitting at UNKNOWN with no explanation.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useOpLineIssues } from '../api/order-processing.queries';
import { StatTile } from '../components';

const ISSUES = [
  { value: 'NO_WAREHOUSE', label: 'No warehouse' },
  { value: 'QTY_DISAGREES', label: 'Quantity disagrees' },
  { value: 'NO_ITEM_CODE', label: 'No item code' },
  { value: 'ZERO_QTY', label: 'No quantity' },
  { value: 'any', label: 'All flagged' },
];

const EXPLANATION: Record<string, string> = {
  NO_WAREHOUSE:
    'OMS sends no WarehouseCode for these lines, so there is nowhere to check stock. '
    + 'They cannot reach an availability answer until a warehouse rule is agreed.',
  QTY_DISAGREES:
    'The quantity disagrees with cases x pack size. OMS holds two conventions in that '
    + 'column, and nothing on the row says which applies — so the figure is shown as '
    + 'given rather than corrected.',
  NO_ITEM_CODE: 'The line carries no item code, so it cannot be matched to SAP.',
  ZERO_QTY: 'The line has no quantity.',
};

export default function DataQualityPage() {
  const [issue, setIssue] = useState('NO_WAREHOUSE');
  const query = useOpLineIssues(issue);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Data quality"
        description="Lines the engine cannot fully trust, and the orders they block."
      />

      <div className="flex flex-wrap gap-2">
        {ISSUES.map((i) => (
          <Button key={i.value} size="sm"
                  variant={issue === i.value ? 'default' : 'outline'}
                  onClick={() => setIssue(i.value)}>
            {i.label}
            {query.data?.summary?.[i.value] != null && (
              <span className="ml-1.5 text-xs opacity-80">({query.data.summary[i.value]})</span>
            )}
          </Button>
        ))}
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {query.isError && (
        <p className="text-sm text-destructive">
          {getErrorMessage(query.error, 'Could not load the flagged lines.')}
        </p>
      )}

      {query.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Lines flagged" value={query.data.total_lines}
                      alert={query.data.total_lines > 0} />
            <StatTile label="Orders affected" value={query.data.orders_affected}
                      hint="These cannot reach a stock answer"
                      alert={query.data.orders_affected > 0} />
            <StatTile label="Distinct items" value={query.data.by_item.length} />
          </div>

          {EXPLANATION[issue] && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">
              {EXPLANATION[issue]}
            </CardContent></Card>
          )}

          {query.data.by_item.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <p className="border-b p-3 text-sm font-medium">Worst affected items</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Lines</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.by_item.slice(0, 15).map((r) => (
                        <tr key={r.item_code} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <span className="font-medium">{r.item_code}</span>
                            <span className="block text-xs text-muted-foreground">
                              {r.item_name}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{r.category}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.lines}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <p className="border-b p-3 text-sm font-medium">
                Affected lines {query.data.results.length < query.data.total_lines &&
                  `(first ${query.data.results.length})`}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Order</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Warehouse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.results.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <Link className="font-medium text-primary hover:underline"
                                to={`/order-processing/orders/${r.oms_order_id}`}>
                            {r.order_number}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            {r.oms_status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.customer_name}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium">{r.item_code}</span>
                          <span className="block text-xs text-muted-foreground">
                            {r.item_name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.quantity}</td>
                        <td className="px-3 py-2">
                          {/* The whole point: state the gap in words rather than
                              leaving a blank cell that reads as "nothing to say". */}
                          {!r.warehouse_code ? (
                            <Badge className="bg-amber-500 text-white">
                              {r.warehouse_label}
                            </Badge>
                          ) : (
                            r.warehouse_label
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
