import { CalendarRange, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePlantBoard } from '@/modules/dashboards/plant-board/api';
import { decimal, whole } from '@/modules/dashboards/plant-board/components/drills/format';
import type { PlanSku } from '@/modules/dashboards/plant-board/types';
import {
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

type Show = 'all' | 'pending' | 'done' | 'off-plan';

const SHOW: { key: Show; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Still to make' },
  { key: 'done', label: 'Done' },
  { key: 'off-plan', label: 'Not on plan' },
];

function matches(row: PlanSku, show: Show): boolean {
  if (show === 'pending') return row.on_plan && row.balance_qty > 0;
  if (show === 'done') return row.on_plan && row.balance_qty <= 0;
  if (show === 'off-plan') return !row.on_plan;
  return true;
}

/**
 * A tonne figure with its cases or pieces underneath.
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
 * The month's plan SKU by SKU, opened from the month-plan strip on Line
 * Performance.
 *
 * Read off the same plant-board response the strip reads, so the totals here
 * are the strip's own figures. Made is the floor's receipt — the journal the
 * strip's headline is summed from — so the rows add up to it; SKUs the floor
 * made off-plan are listed too, planned at zero. BH-PF stock is what stands on
 * the production floor now, not at the month's end.
 */
export default function MonthPlanSkuPage() {
  const { data, isLoading, isError } = usePlantBoard();
  const [query, setQuery] = useState('');
  const [show, setShow] = useState<Show>('all');

  const production = data?.production ?? null;
  const plan = data?.plan ?? null;
  const rows = production?.by_sku;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (row) =>
        matches(row, show) &&
        (!needle ||
          row.item_code.toLowerCase().includes(needle) ||
          row.item_name.toLowerCase().includes(needle)),
    );
  }, [rows, query, show]);

  const all = rows ?? [];
  const left = production ? Math.max(0, production.planned_tons - production.produced_tons) : null;
  const atFloor = all.reduce((sum, row) => sum + row.stock_tons, 0);
  const columns = 7;

  return (
    <div className="space-y-5">
      <PageHeader
        title="This month's plan, SKU by SKU"
        description={
          plan?.name
            ? `${plan.name} · planned against made off SAP's movement journal · BH-PF stock as it stands now`
            : "Planned against made off SAP's movement journal · BH-PF stock as it stands now"
        }
        icon={CalendarRange}
        accent="violet"
        backTo="/dashboards/production-lines"
        backLabel="Line Performance"
      />

      {production && (
        <StatTileRow>
          <StatTile
            label="Planned"
            value={`${decimal(production.planned_tons)} t`}
            sub={`${whole(all.filter((row) => row.on_plan).length)} SKUs on plan`}
            accent="violet"
          />
          <StatTile
            label="Made"
            value={`${decimal(production.produced_tons)} t`}
            sub={
              production.attainment_tons_pct == null
                ? undefined
                : `${production.attainment_tons_pct.toFixed(0)}% of the plan`
            }
            accent="emerald"
          />
          <StatTile label="Planned − made" value={`${decimal(left)} t`} accent="amber" />
          <StatTile
            label="At BH-PF"
            value={`${decimal(atFloor)} t`}
            sub="of this month's SKUs"
            accent="sky"
          />
          <StatTile
            label="Not on plan"
            value={whole(all.filter((row) => !row.on_plan).length)}
            sub={`${decimal(production.produced_unplanned_tons)} t made`}
            accent="slate"
          />
        </StatTileRow>
      )}

      <TableCard
        summary={rows ? `${whole(visible.length)} of ${whole(all.length)} SKUs` : undefined}
        actions={
          <>
            <div className="flex rounded-lg border p-0.5">
              {SHOW.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setShow(option.key)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                    show === option.key
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search SKU or item"
                className="h-8 w-56 pl-8"
              />
            </div>
          </>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>SKU</Th>
              <Th>Item</Th>
              <Th align="right">Planned</Th>
              <Th align="right">Made</Th>
              <Th align="right">Planned − made</Th>
              <Th align="right">% done</Th>
              <Th align="right">At BH-PF</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={columns} message="Reading the plan from SAP…" />
            ) : isError || !production ? (
              <TableEmpty
                colSpan={columns}
                message="The month's plan could not be read"
                hint="SAP is not answering, or this login does not hold the production-plan right."
              />
            ) : rows === undefined ? (
              <TableEmpty
                colSpan={columns}
                message="This server does not list the plan by SKU yet."
              />
            ) : visible.length === 0 ? (
              <TableEmpty colSpan={columns} message="No SKUs match" />
            ) : (
              visible.map((row) => (
                <tr key={row.item_code} className={ROW_CLASSES}>
                  <Td className="whitespace-nowrap text-muted-foreground">{row.item_code}</Td>
                  <Td>
                    <span className="flex flex-col leading-tight">
                      <span className="font-medium">{row.item_name || '—'}</span>
                      {!row.on_plan && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          not on plan
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td numeric>
                    <Tonnes
                      tons={row.planned_tons}
                      weighed={row.weighed}
                      sub={cases(row.planned_cases) ?? `${whole(row.planned_qty)} pcs`}
                    />
                  </Td>
                  <Td numeric>
                    <Tonnes
                      tons={row.produced_tons}
                      weighed={row.weighed}
                      sub={cases(row.produced_cases) ?? `${whole(row.produced_qty)} pcs`}
                    />
                  </Td>
                  <Td numeric>
                    <Tonnes
                      tons={row.balance_tons}
                      weighed={row.weighed}
                      sub={
                        row.balance_qty < 0
                          ? `${whole(-row.balance_qty)} pcs over`
                          : `${whole(row.balance_qty)} pcs`
                      }
                      className={
                        row.balance_qty < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.balance_qty > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : undefined
                      }
                    />
                  </Td>
                  <Td numeric className="font-semibold">
                    {row.attainment_pct == null ? '—' : `${decimal(row.attainment_pct, 0)}%`}
                  </Td>
                  <Td numeric>
                    <Tonnes
                      tons={row.stock_tons}
                      weighed={row.weighed}
                      sub={row.stock_qty > 0 ? `${whole(row.stock_qty)} pcs` : null}
                    />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
