/**
 * Warehouse insights: pipeline, issued-vs-dispatched per item, and shortfalls.
 * Answers "how much did we issue, how much shipped, what's still in packing".
 */
import { AlertTriangle } from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import type { WarehouseInsights } from '../types/marketplace.types';

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

export function WarehouseInsightsPanel({ insights }: { insights: WarehouseInsights }) {
  const { totals, orders, requests, by_item, shortfalls } = insights;
  const inPacking = Number(totals.issued) - Number(totals.dispatched);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Warehouse insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Issued (qty)" value={totals.issued} />
          <Kpi label="Dispatched (qty)" value={totals.dispatched} />
          <Kpi label="In packing" value={inPacking} tone={inPacking > 0 ? 'text-amber-600' : ''} />
          <Kpi label="Awaiting dispatch" value={orders.awaiting_dispatch} tone={orders.awaiting_dispatch > 0 ? 'text-amber-600' : ''} />
          <Kpi label="Orders dispatched" value={orders.dispatched} />
          <Kpi label="Issue requests" value={requests.total} />
        </div>

        {/* Pipeline by status */}
        {Object.keys(requests.by_status).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Pipeline:</span>
            {Object.entries(requests.by_status).map(([status, n]) => (
              <Badge key={status} variant="outline">
                {status.replace('_', ' ')}: {n}
              </Badge>
            ))}
          </div>
        )}

        {/* Issued vs dispatched by item */}
        <div>
          <div className="mb-1 text-sm font-medium">Issued vs dispatched by item</div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Issued</th>
                  <th className="p-2 text-right">Dispatched</th>
                  <th className="p-2 text-right">In packing</th>
                </tr>
              </thead>
              <tbody>
                {by_item.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      Nothing issued yet.
                    </td>
                  </tr>
                ) : (
                  by_item.map((it) => {
                    const packing = Number(it.in_packing);
                    return (
                      <tr key={`${it.component_type}-${it.item_code}`} className="border-b last:border-0">
                        <td className="p-2">
                          <span className="font-mono">{it.item_code}</span>
                          {it.item_name ? (
                            <span className="ml-2 text-xs text-muted-foreground">{it.item_name}</span>
                          ) : null}
                        </td>
                        <td className="p-2">
                          <Badge variant={it.component_type === 'FG' ? 'default' : 'outline'}>
                            {it.component_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">{Number(it.issued)}</td>
                        <td className="p-2 text-right">{Number(it.dispatched)}</td>
                        <td className={`p-2 text-right ${packing > 0 ? 'text-amber-600 font-medium' : ''}`}>
                          {packing}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shortfalls */}
        {shortfalls.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Short-issued items (approved &lt; required)
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {shortfalls.map((s) => (
                <Badge key={s.item_code} variant="outline">
                  {s.item_code}: short {s.short} (approved {s.approved}/{s.required})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
