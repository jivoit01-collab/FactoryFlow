import { OpsDrill } from '@/modules/dashboards/logistics-control/components';
import { decimal, whole } from '@/modules/dashboards/plant-board/components/drills/format';
import type { PlanSku,PlantBoardProduction } from '@/modules/dashboards/plant-board/types';
import { cn } from '@/shared/utils';

/**
 * A tonne figure with its pieces underneath.
 *
 * A SKU SAP holds no litre volume for has no tonnage, which is not zero, so
 * it reads "—" and the pieces carry it.
 */
function Tonnes({
  tons,
  sub,
  weighed,
  className,
}: {
  tons: number;
  sub: string | null;
  weighed: boolean;
  className?: string;
}) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className={cn('font-semibold', className)}>
        {weighed ? `${decimal(tons, 2)} t` : '—'}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </span>
  );
}

function cases(value: number | null): string | null {
  return value ? `${whole(value)} cs` : null;
}

/**
 * The month's plan SKU by SKU, opened from the month-plan strip.
 *
 * Made is the floor's own receipt — the journal the strip's headline is
 * summed from — so the rows add up to the figure that opened them. SKUs the
 * floor made off-plan are listed too, planned at zero; BH-PF stock is what is
 * on the production floor now, not at the month's end.
 */
export function MonthPlanSkuDrill({
  production,
  onClose,
}: {
  production: PlantBoardProduction;
  onClose: () => void;
}) {
  const rows = production.by_sku;
  const list = rows ?? [];
  const sum = (pick: (row: PlanSku) => number) => list.reduce((total, row) => total + pick(row), 0);
  const left = Math.max(0, production.planned_tons - production.produced_tons);

  return (
    <OpsDrill<PlanSku>
      title="This month's plan, SKU by SKU"
      subtitle="Planned against made off SAP's movement journal · BH-PF stock as it stands now"
      domain="production"
      onClose={onClose}
      stats={[
        { label: 'SKUs on plan', value: whole(list.filter((row) => row.on_plan).length) },
        { label: 'Planned', value: `${decimal(production.planned_tons)} t` },
        { label: 'Made', value: `${decimal(production.produced_tons)} t` },
        { label: 'Left', value: `${decimal(left)} t` },
        { label: 'At BH-PF', value: `${decimal(sum((row) => row.stock_tons))} t` },
        { label: 'Off-plan SKUs', value: whole(list.filter((row) => !row.on_plan).length) },
      ]}
      rows={list}
      rowKey={(row) => row.item_code}
      empty={
        rows === undefined
          ? 'This server does not list the plan by SKU yet.'
          : 'The plan lists no SKUs and nothing has been made.'
      }
      columns={[
        { label: 'SKU', cell: (row) => row.item_code, dim: true },
        {
          label: 'Item',
          cell: (row) => (
            <span className="flex flex-col leading-tight">
              <span>{row.item_name || '—'}</span>
              {!row.on_plan && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  not on plan
                </span>
              )}
            </span>
          ),
        },
        {
          label: 'Planned',
          cell: (row) => (
            <Tonnes
              tons={row.planned_tons}
              weighed={row.weighed}
              sub={cases(row.planned_cases) ?? `${whole(row.planned_qty)} pcs`}
            />
          ),
          numeric: true,
        },
        {
          label: 'Made',
          cell: (row) => (
            <Tonnes
              tons={row.produced_tons}
              weighed={row.weighed}
              sub={cases(row.produced_cases) ?? `${whole(row.produced_qty)} pcs`}
            />
          ),
          numeric: true,
        },
        {
          label: 'Planned − made',
          cell: (row) => (
            <Tonnes
              tons={row.balance_tons}
              weighed={row.weighed}
              sub={
                row.balance_qty < 0
                  ? `${whole(-row.balance_qty)} pcs over`
                  : `${whole(row.balance_qty)} pcs`
              }
              className={
                row.balance_tons < 0 || row.balance_qty < 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : row.balance_qty > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : undefined
              }
            />
          ),
          numeric: true,
        },
        {
          label: '% done',
          cell: (row) => (row.attainment_pct == null ? '—' : `${decimal(row.attainment_pct, 0)}%`),
          numeric: true,
        },
        {
          label: 'At BH-PF',
          cell: (row) => (
            <Tonnes
              tons={row.stock_tons}
              weighed={row.weighed}
              sub={row.stock_qty > 0 ? `${whole(row.stock_qty)} pcs` : null}
            />
          ),
          numeric: true,
        },
      ]}
    />
  );
}
