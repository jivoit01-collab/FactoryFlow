import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { ProductionRunCost } from '../types';

interface CostBreakdownCardProps {
  cost?: ProductionRunCost;
}

const fmt = (value: string | number | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0';
};

/**
 * Read-only derived cost breakdown for a production run. Costs are computed
 * automatically from the Cost Master rates + BOM snapshot + running hours /
 * produced cases — there is no manual entry. Empty until the run has cost lines
 * (populated on run creation and finalised at completion).
 */
export function CostBreakdownCard({ cost }: CostBreakdownCardProps) {
  const lines = cost?.lines ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cost Breakdown</span>
          <span className="text-xs font-normal text-muted-foreground">
            Auto-derived from Cost Master · BOM · run hours
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No cost yet. Cost is derived once the run has a BOM and cost rates are set in Cost
            Master; the per-unit cost finalises when the run completes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">Cost Item</th>
                  <th className="text-left p-2 font-medium">Calculation</th>
                  <th className="text-right p-2 font-medium">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2">
                      {l.category_display}
                      {l.is_credit && (
                        <span className="ml-2 text-[10px] text-green-600">credit</span>
                      )}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{l.note}</td>
                    <td
                      className={`p-2 text-right font-mono ${
                        l.is_credit ? 'text-green-600' : ''
                      }`}
                    >
                      {l.is_credit ? '−' : ''}
                      {fmt(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td className="p-2 font-medium" colSpan={2}>
                    Total cost
                  </td>
                  <td className="p-2 text-right font-mono">{fmt(cost?.total_cost)}</td>
                </tr>
                {Number(cost?.waste_recovery_credit ?? 0) > 0 && (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={2}>
                      Less: waste recovery
                    </td>
                    <td className="p-2 text-right font-mono text-green-600">
                      −{fmt(cost?.waste_recovery_credit)}
                    </td>
                  </tr>
                )}
                <tr className="border-t">
                  <td className="p-2 font-bold" colSpan={2}>
                    Net cost
                  </td>
                  <td className="p-2 text-right font-mono text-lg font-bold">
                    {fmt(cost?.net_cost)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground" colSpan={2}>
                    Per unit ({fmt(cost?.produced_qty)} cases)
                  </td>
                  <td className="p-2 text-right font-mono">{fmt(cost?.per_unit_cost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
