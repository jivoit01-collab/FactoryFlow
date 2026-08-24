/**
 * Production plans, as SAP holds them.
 *
 * JIVO's planners author the monthly plan as a SAP *sales forecast* — every
 * `OFCT` header in this company is named "OIL Monthly Production Planning for
 * the <Month> <Year>". This page reads them; there is no create or edit here on
 * purpose. SAP stays the system of record, so a plan can never say two different
 * things in two places.
 */
import { ArrowRight, RefreshCw, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PLANNING_PURCHASE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { usePlans } from '../api';
import { monthLabel, pickUnit, qtyWithUnit, UNIT_LABEL, UnitToggle } from '../components';
import { usePlanUnit } from '../hooks/usePlanUnit';

export default function PlanListPage() {
  const { hasPermission } = usePermission();
  const canBuy = hasPermission(PLANNING_PURCHASE_PERMISSIONS.CREATE_PO);
  const plans = usePlans();
  // The same sticky unit the plan detail page uses, so the list does not
  // contradict the screen you opened it from.
  const [unit, setUnit] = usePlanUnit();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Production Plans"
        description="The monthly plan as SAP holds it — read only, because SAP is where planners author it."
      >
        <UnitToggle unit={unit} onChange={setUnit} compact className="mr-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void plans.refetch()}
          disabled={plans.isFetching}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', plans.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </DashboardHeader>

      {plans.isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Reading plans from SAP…
          </CardContent>
        </Card>
      ) : null}

      {plans.isError ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">
              {getErrorMessage(plans.error, 'Could not read plans from SAP.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void plans.refetch()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {plans.data && !plans.data.data.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">No production plans in SAP for this company.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Plans are created in SAP as a forecast (Sales &gt; Forecast). Once one exists
              it appears here.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {plans.data?.data.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Plan</th>
                <th className="px-3 py-2 text-left font-medium">Period</th>
                <th className="px-3 py-2 text-left font-medium">Grain</th>
                <th className="px-3 py-2 text-right font-medium">SKUs</th>
                <th className="px-3 py-2 text-right font-medium">
                  Planned ({UNIT_LABEL[unit]})
                </th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {plans.data.data.map((plan) => (
                <tr
                  key={plan.abs_id}
                  className={cn('border-t', plan.is_current && 'bg-primary/5')}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/planning-purchase/plans/${plan.abs_id}`}
                        className="font-medium hover:underline"
                      >
                        {plan.code || `Plan ${plan.abs_id}`}
                      </Link>
                      {plan.is_current ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                        >
                          Current
                        </Badge>
                      ) : null}
                    </div>
                    <div className="max-w-[420px] truncate text-xs text-muted-foreground">
                      {plan.name}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {monthLabel(plan.start_date, plan.end_date)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {plan.period_view === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {plan.item_count ?? plan.line_count}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {qtyWithUnit(
                      pickUnit(
                        {
                          pieces: plan.planned_qty,
                          litres: plan.planned_litres,
                          cases: plan.planned_cases,
                        },
                        unit,
                      ),
                      unit,
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canBuy ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/planning-purchase/plans/${plan.abs_id}/purchase`}>
                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                            Buy
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/planning-purchase/plans/${plan.abs_id}`}>
                          Open
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {plans.data ? (
        <p className="text-xs text-muted-foreground">
          Source: {plans.data.meta.source}. SAP stores the plan in pieces — PCS means
          single bottles or tins, not cases. Litres come from the item master
          (SalPackUn) and cases from pieces per case; the toggle above switches all
          three, and the choice is remembered.
        </p>
      ) : null}
    </div>
  );
}
