/** Supply Chain — Live Trail.
 *
 * The whole order book in one chain, read live from SAP: what is ordered, what
 * can ship today, what has to be made, what making it consumes, and what we do
 * not have. Where the Planning page answers *when* to order and the Daily Run
 * is the morning routine, this is the picture underneath both — and the only
 * one that crosses company books.
 *
 * Demand is consolidated over every book the factory fills (Oil and Mart);
 * stock, work orders, BOMs, purchase orders and lead times are Oil's, because
 * Oil is the only production unit.
 */
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useLiveTrail } from '../api/supply-chain.queries';
import type { Focus, StageTab } from '../components/live-trail';
import {
  inr,
  n0,
  onDate,
  TrailBuyBox,
  TrailCover,
  TrailDepartments,
  TrailDrill,
  TrailStages,
  TrailTables,
  TrailTomorrow,
  UnresolvedDemandPanel,
} from '../components/live-trail';
import type { TrailScope } from '../types';

export default function SupplyChainLiveTrailPage() {
  // EXTERNAL by default: an Oil order to Mart and Mart's own order for the same
  // goods are the same litres, and planning both would put demand on the
  // factory twice. The toggle keeps the group reading one click away.
  const [scope, setScope] = useState<TrailScope>('EXTERNAL');
  const [tab, setTab] = useState<StageTab>('skus');
  const [focus, setFocus] = useState<Focus>(null);

  const trail = useLiveTrail(scope);

  const openSku = useCallback((item: string) => setFocus({ kind: 'sku', item }), []);
  const openComponent = useCallback(
    (item: string) => setFocus({ kind: 'component', item }),
    [],
  );

  if (trail.isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <DashboardHeader
          title="Supply Chain — Live Trail"
          description="Reading the order book, stock, work orders and bills of materials from SAP…"
        />
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            This is a live read across two company databases, so it takes a few seconds.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trail.isError || !trail.data) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <DashboardHeader title="Supply Chain — Live Trail" />
        <Card className="border-destructive/40">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm font-medium text-destructive">
              {getErrorMessage(trail.error, 'Could not read the trail from SAP.')}
            </p>
            <Button variant="outline" size="sm" onClick={() => void trail.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = trail.data;
  const s = data.summary;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Supply Chain — Live Trail"
        description={
          `${s.production_company} makes it · ${n0(s.open_orders)} open orders ` +
          `(${n0(s.open_lines)} lines, ${n0(s.parties)} parties) worth ${inr(s.demand_value)}`
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal">
            Live read · {s.as_of}
          </Badge>

          {/* Two readings of the same rows, not two datasets. */}
          <div className="flex overflow-hidden rounded-md border">
            {(['EXTERNAL', 'ALL'] as TrailScope[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setScope(option)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  scope === option
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {option === 'EXTERNAL' ? 'External only' : 'Include intercompany'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void trail.refetch()}
            disabled={trail.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${trail.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      {data.unavailable_books.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium">This trail is missing an order book.</p>
            {data.unavailable_books.map((book) => (
              <p key={book.code} className="text-xs text-muted-foreground">
                {book.label}: {book.reason}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Where the demand came from — the one thing a consolidated view must not
          hide, because the factory is being planned against both books. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {s.books.map((book) => (
          <span key={book.company}>
            <b className="font-semibold text-foreground">{book.label}</b> — {n0(book.lines)}{' '}
            lines, {n0(book.units)} pieces, {inr(book.value)}
          </span>
        ))}
        {scope === 'EXTERNAL' && s.interco_lines > 0 && (
          <span>
            {n0(s.interco_lines)} intercompany lines ({inr(s.interco_value)}) excluded
          </span>
        )}
      </div>

      <TrailStages data={data} active={tab} onOpen={setTab} />

      {/* The two questions someone actually opens this page with: what do I run
          tomorrow, and who has to move for it. Everything below is the evidence
          under these two answers. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">
              Produce on {onDate(data.tomorrow.date)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Oldest promise first, capped by the material actually on the shelf.
              Stock is allocated down the list, so nothing is promised twice.
            </p>
          </CardHeader>
          <CardContent>
            <TrailTomorrow
              data={data}
              onOpenSku={openSku}
              onOpenComponent={openComponent}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Who has to act</CardTitle>
            <p className="text-xs text-muted-foreground">
              Every open issue on one desk, with the date it missed. Sent to each
              department automatically each morning — this is the same list.
            </p>
          </CardHeader>
          <CardContent>
            <TrailDepartments
              data={data}
              onOpenSubject={(kind, code) =>
                kind === 'sku' ? openSku(code) : openComponent(code)
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Where every open order stands</CardTitle>
            <p className="text-xs text-muted-foreground">
              SKUs with a production gap, biggest first. Click a bar to open its trail.
            </p>
          </CardHeader>
          <CardContent>
            <TrailCover
              skus={data.skus}
              selected={focus?.kind === 'sku' ? focus.item : undefined}
              onSelect={openSku}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Buy or make</CardTitle>
            <p className="text-xs text-muted-foreground">
              Every purchased component the gap consumes, netted against stock and live POs.
            </p>
          </CardHeader>
          <CardContent>
            <TrailBuyBox data={data} onOpenComponent={openComponent} />
          </CardContent>
        </Card>
      </div>

      <UnresolvedDemandPanel data={data} />

      <CapacityPanel data={data} />

      <Card>
        <CardContent className="pt-4">
          <TrailTables
            data={data}
            tab={tab}
            onTab={setTab}
            onOpenSku={openSku}
            onOpenComponent={openComponent}
          />
        </CardContent>
      </Card>

      <TrailDrill data={data} focus={focus} onFocus={setFocus} />

      <TrailFooter data={data} />
    </div>
  );
}

/** Whether the lines can actually run the gap.
 *
 * SAP knows what filling costs; it does not know how many hours of which
 * machine that is. Until the reference template comes back this says so, rather
 * than showing a green light nobody has earned.
 */
function CapacityPanel({ data }: { data: Parameters<typeof TrailFooter>[0]['data'] }) {
  const capacity = data.capacity;

  if (!capacity.available) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="p-4">
          <p className="text-[13px] font-semibold">Feasibility cannot be checked yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{capacity.reason}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            What SAP does hold is the conversion cost: {n0(data.summary.filling_litres)} litres
            of filling at {inr(data.summary.filling_cost)}, on the Filling capacity tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px]">Can the lines run this gap?</CardTitle>
        <p className="text-xs text-muted-foreground">
          Machine hours from the reference template, including one changeover per SKU
          scheduled on the line.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {capacity.machines.map((machine) => (
          <div key={machine.machine_id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold">
                {machine.machine_id} {machine.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {machine.location}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {machine.required_hours} h needed of {machine.usable_hours} h usable
                {machine.changeover_hours > 0 &&
                  ` (after ${machine.changeover_hours} h changeover)`}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <i
                aria-hidden
                className="block h-full rounded-full"
                style={{
                  width: `${Math.min(machine.utilisation_percent ?? 0, 100)}%`,
                  background: machine.feasible
                    ? 'var(--trail-stock)'
                    : 'hsl(var(--destructive))',
                }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {machine.feasible
                ? `${machine.utilisation_percent}% utilised across ${machine.skus.length} SKU(s).`
                : `Over capacity by ${machine.shortfall_hours} h across ${machine.skus.length} SKU(s).`}
            </p>
          </div>
        ))}

        {capacity.unmapped.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {capacity.unmapped.length} SKU(s) with a gap have no machine or output rate on
            file, so they are not in this check:{' '}
            {capacity.unmapped.slice(0, 4).map((u) => u.sku).join(', ')}
            {capacity.unmapped.length > 4 ? '…' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** How each number is built, and what it cannot tell you. Kept on the page
 *  rather than in a tooltip, because someone is going to be asked to defend
 *  these figures in a meeting. */
function TrailFooter({ data }: { data: NonNullable<ReturnType<typeof useLiveTrail>['data']> }) {
  return (
    <footer className="space-y-3 border-t pt-4 text-xs text-muted-foreground">
      <p>
        <b className="text-foreground">How each number is built.</b> Demand = open sales-order
        lines in SAP (ORDR/RDR1, not cancelled), in pieces — single bottles, not cartons. Stock
        = OITW on hand pooled across the Oil and Mart warehouses. In production = open work
        orders (OWOR, Planned or Released), remaining = planned − completed. Must produce =
        demand − stock − in production, floored at zero. Component requirement = that gap
        exploded through the live bill of materials (OITT/ITT1). Shortfall = requirement −
        component stock − credible open POs, where credible means the PO&apos;s expected date is
        in the future or slipped by 30 days or less. Lead times are measured, not assumed: the
        average PO-date → goods-receipt gap per item over the last 18 months (OPOR/POR1 →
        OPDN/PDN1). Make-vs-buy compares an item&apos;s last purchase price against its own
        sub-BOM.
      </p>

      <div>
        <b className="text-foreground">Caveats worth knowing.</b>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {data.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      </div>

      <ul className="list-disc space-y-0.5 pl-5">
        {data.sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </footer>
  );
}
