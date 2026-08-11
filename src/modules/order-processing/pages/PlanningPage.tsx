/** Production requirements, the materials they need, and what must be bought.
 *
 * One page rather than three: the three are a single chain, and splitting them
 * across routes hides that a purchase exists because of a specific order.
 */
import { Boxes } from 'lucide-react';
import { useState } from 'react';

import { ORDER_PROCESSING_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';

import {
  useOpMaterials,
  useOpPlanMaterials,
  useOpProcurement,
  useOpProduction,
} from '../api/order-processing.queries';

type Tab = 'production' | 'materials' | 'procurement';

export default function PlanningPage() {
  const [tab, setTab] = useState<Tab>('production');
  const { hasPermission } = usePermission();
  const canPlan = hasPermission(ORDER_PROCESSING_PERMISSIONS.PLAN_PROCUREMENT);

  const production = useOpProduction('open');
  const materials = useOpMaterials(true);
  const procurement = useOpProcurement('open');
  const plan = useOpPlanMaterials();

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'production', label: 'Production', count: production.data?.length ?? 0 },
    { key: 'materials', label: 'Materials short', count: materials.data?.length ?? 0 },
    { key: 'procurement', label: 'Procurement', count: procurement.data?.length ?? 0 },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Planning"
        description="What must be made, what it needs, and what must be bought."
      >
        {canPlan && (
          <Button size="sm" onClick={() => plan.mutate(1)} disabled={plan.isPending}>
            <Boxes className="mr-2 h-4 w-4" />
            {plan.isPending ? 'Exploding BOMs…' : 'Replan materials'}
          </Button>
        )}
      </DashboardHeader>

      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                    tab === t.key ? 'border-primary font-medium'
                                  : 'border-transparent text-muted-foreground'}`}>
            {t.label} <span className="ml-1 text-xs text-muted-foreground">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === 'production' && (
        <Card><CardContent className="p-0">
          {!production.data?.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nothing needs producing.
            </p>
          ) : (
            <div className="divide-y">
              {production.data.map((r) => (
                <div key={r.id} className="p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <span className="font-medium">{r.item_code}</span>
                      {r.item_name && <span className="text-muted-foreground"> · {r.item_name}</span>}
                    </span>
                    <span className="tabular-nums">
                      {r.quantity} @ {r.warehouse_code}
                      {r.needed_by && <span className="text-muted-foreground"> by {r.needed_by}</span>}
                    </span>
                  </div>
                  {/* Why this exists — the traceability the whole design turns on. */}
                  <p className="mt-1 text-xs text-muted-foreground">
                    For {r.sources.map((s) => `${s.order_number} (${s.shortfall})`).join(', ')}
                  </p>
                  {r.materials.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.materials.filter((m) => m.is_short).length} of {r.materials.length}{' '}
                      component(s) short
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {tab === 'materials' && (
        <Card><CardContent className="p-0">
          {!materials.data?.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No material shortages. Run “Replan materials” if requirements have changed.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Material</th>
                    <th className="px-3 py-2 text-right font-medium">Required</th>
                    <th className="px-3 py-2 text-right font-medium">On hand</th>
                    <th className="px-3 py-2 text-right font-medium">Committed</th>
                    <th className="px-3 py-2 text-right font-medium">Incoming</th>
                    <th className="px-3 py-2 text-right font-medium">Net short</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.data.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{m.item_code}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.gross_required}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.on_hand}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.committed}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.incoming_po}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-destructive">
                        {m.net_required}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      )}

      {tab === 'procurement' && (
        <Card><CardContent className="p-0">
          {!procurement.data?.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nothing needs buying.
            </p>
          ) : (
            <>
              <p className="border-b p-3 text-xs text-muted-foreground">
                Planning records only — no SAP purchase order is created from here.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Material</th>
                      <th className="px-3 py-2 text-right font-medium">Buy</th>
                      <th className="px-3 py-2 text-right font-medium">Already on order</th>
                      <th className="px-3 py-2 font-medium">Needed by</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procurement.data.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{p.item_code}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.incoming_po}</td>
                        <td className="px-3 py-2 tabular-nums">{p.needed_by ?? '—'}</td>
                        <td className="px-3 py-2">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent></Card>
      )}
    </div>
  );
}
