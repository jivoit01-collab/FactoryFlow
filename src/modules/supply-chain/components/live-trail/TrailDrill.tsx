/** Follow one thing all the way down.
 *
 * A SKU opens as: who is waiting for it, what covers it, and what producing the
 * rest consumes. A component opens as the mirror image: what it is needed for,
 * what is inbound, and whether we could make it instead. Clicking a row in
 * either view crosses to the other, so the chain can be walked in both
 * directions without going back to a table.
 */
import { X } from 'lucide-react';

import { Button, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { LiveTrail, TrailComponent, TrailSku } from '../../types';
import { days, inr, n0, n1, onDate } from './trail-format';
import { CoverPill, TrailPill } from './TrailPill';

export type Focus = { kind: 'sku' | 'component'; item: string } | null;

export function TrailDrill({
  data,
  focus,
  onFocus,
}: {
  data: LiveTrail;
  focus: Focus;
  onFocus: (focus: Focus) => void;
}) {
  if (!focus) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Pick any SKU, component or order row above to follow its full trail — order →
          stock → production → BOM → buy or make.
        </CardContent>
      </Card>
    );
  }

  const sku = focus.kind === 'sku' ? data.skus.find((s) => s.item === focus.item) : undefined;
  const component =
    focus.kind === 'component'
      ? data.components.find((c) => c.item === focus.item)
      : undefined;

  if (!sku && !component) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {focus.item} is not on this trail. It may be covered by stock, or outside the
          current scope.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {sku && <SkuTrail data={data} sku={sku} onFocus={onFocus} />}
      {component && <ComponentTrail data={data} component={component} onFocus={onFocus} />}
    </Card>
  );
}

function Head({
  title,
  sub,
  badge,
  onClose,
}: {
  title: string;
  sub: string;
  badge?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b bg-muted/40 p-4">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close the drill-down</span>
        </Button>
      </div>
    </div>
  );
}

/** The five links of the chain, as a strip. Reads left to right like the stages
 *  above, because it is the same story told for one item. */
function Chain({ steps }: { steps: { label: string; value: string; note: string }[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border sm:grid-cols-3 lg:grid-cols-5">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={cn(
            'border-b border-r p-3 last:border-r-0',
            index >= steps.length - 1 && 'border-b-0',
            'lg:border-b-0',
          )}
        >
          <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            {step.label}
          </p>
          <p className="mt-1 text-[17px] font-semibold tabular-nums">{step.value}</p>
          <p className="text-[11px] text-muted-foreground">{step.note}</p>
        </div>
      ))}
    </div>
  );
}

function SkuTrail({
  data,
  sku,
  onFocus,
}: {
  data: LiveTrail;
  sku: TrailSku;
  onFocus: (focus: Focus) => void;
}) {
  const orders = data.orders
    .filter((order) => order.item === sku.item)
    .sort((a, b) => b.value - a.value);

  const components = sku.components
    .map((line) => ({ line, component: data.components.find((c) => c.item === line.child) }))
    .filter((entry): entry is { line: typeof entry.line; component: TrailComponent } =>
      Boolean(entry.component),
    )
    .sort(
      (a, b) =>
        Number(b.component.short_strict > 0) - Number(a.component.short_strict > 0) ||
        b.line.reqd - a.line.reqd,
    );

  const blockers = components.filter((e) => !e.component.is_resource && e.component.short_strict > 0);
  const worstLead = Math.max(0, ...blockers.map((e) => e.component.lead_avg ?? 0));

  return (
    <>
      <Head
        title={sku.name}
        sub={`${sku.item} · ${sku.type} · ${sku.variety} · quantities in ${sku.uom} (single bottles)`}
        badge={<CoverPill sku={sku} />}
        onClose={() => onFocus(null)}
      />
      <CardContent className="space-y-5 p-4">
        <Chain
          steps={[
            {
              label: 'Open demand',
              value: n0(sku.demand),
              note: `${sku.orders} order${sku.orders === 1 ? '' : 's'} · ${inr(sku.value)}`,
            },
            {
              label: 'Stock',
              value: n0(sku.onhand),
              note:
                Object.entries(sku.onhand_by_company)
                  .filter(([, qty]) => (qty ?? 0) > 0)
                  .map(([code, qty]) => `${code === 'JIVO_MART' ? 'Mart' : 'Oil'} ${n0(qty)}`)
                  .join(' · ') || 'nothing on the shelf',
            },
            {
              label: 'In production',
              value: n0(sku.wip),
              note: sku.wo_count
                ? `${sku.wo_count} open work order${sku.wo_count === 1 ? '' : 's'}`
                : 'no work order open',
            },
            {
              label: 'Must produce',
              value: n0(sku.to_produce),
              note: sku.to_produce > 0 ? 'triggers the BOM below' : 'nothing to make',
            },
            {
              label: 'Then buy',
              value: n0(blockers.length),
              note: blockers.length
                ? `longest lead ${n1(worstLead)} d`
                : 'materials all covered',
            },
          ]}
        />

        <section>
          <h3 className="text-[13px] font-semibold">Orders waiting on this SKU</h3>
          <div className="mt-2 max-h-56 overflow-auto rounded-md border">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2.5 py-1.5 text-left font-semibold">Party</th>
                  <th className="px-2.5 py-1.5 text-left font-semibold">Order</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Open</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Value</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Age</th>
                  <th className="px-2.5 py-1.5 text-left font-semibold">Book</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={`${order.doc}-${order.line}-${index}`} className="border-b last:border-0">
                    <td className="px-2.5 py-1.5">{order.party}</td>
                    <td className="px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      #{order.doc}
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{n0(order.open)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{inr(order.value)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{n0(order.age)} d</td>
                    <td className="px-2.5 py-1.5">
                      <TrailPill tone={order.interco ? 'warn' : 'neutral'}>
                        {order.interco
                          ? 'Intercompany'
                          : order.company === 'JIVO_MART'
                            ? 'Mart'
                            : 'Oil'}
                      </TrailPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="text-[13px] font-semibold">
            What producing {n0(sku.to_produce)} {sku.uom} consumes
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Exploded from the live SAP bill of materials. Conversion resources are the filling
            cost line, not a purchase.
          </p>

          {components.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
              {sku.to_produce > 0
                ? 'This SKU has no bill of materials in SAP, so nothing could be exploded for it — its components are missing from the buy list.'
                : 'Nothing to produce, so nothing is consumed.'}
            </p>
          ) : (
            <div className="mt-2 max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2.5 py-1.5 text-left font-semibold">Component</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold">Per unit</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold">Needed</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold">On hand</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold">Live PO</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold">Short</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold">Lead</th>
                    <th className="px-2.5 py-1.5 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map(({ line, component }) => (
                    <tr
                      key={component.item}
                      onClick={() => onFocus({ kind: 'component', item: component.item })}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-2.5 py-1.5">
                        <span className="block font-medium">{component.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {component.item}
                          {component.is_resource
                            ? ' · conversion resource'
                            : ` · ${component.group}`}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        {line.per_unit.toFixed(4)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        {n1(line.reqd)}{' '}
                        <span className="text-[11px] text-muted-foreground">{component.uom}</span>
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        {component.is_resource ? '—' : n0(component.onhand)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        {component.is_resource || component.po_live <= 0
                          ? '—'
                          : n0(component.po_live)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        {component.is_resource || component.short_strict <= 0 ? (
                          '—'
                        ) : (
                          <b className="text-destructive">{n1(component.short_strict)}</b>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        {component.is_resource ? '—' : days(component.lead_avg)}
                      </td>
                      <td className="px-2.5 py-1.5">
                        {component.is_resource ? (
                          <TrailPill>capacity</TrailPill>
                        ) : component.short_strict > 0 ? (
                          <TrailPill tone="critical" glyph="▲">buy</TrailPill>
                        ) : component.po_stale > 0 ? (
                          <TrailPill tone="warn" glyph="●">PO stale</TrailPill>
                        ) : (
                          <TrailPill tone="good" glyph="✓">covered</TrailPill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CardContent>
    </>
  );
}

function ComponentTrail({
  data,
  component,
  onFocus,
}: {
  data: LiveTrail;
  component: TrailComponent;
  onFocus: (focus: Focus) => void;
}) {
  const action = data.actions.find((a) => a.item === component.item);
  const make = data.makevsbuy.find((m) => m.item === component.item);
  const parents = component.parents
    .map((parent) => ({ parent, sku: data.skus.find((s) => s.item === parent.parent) }))
    .filter((entry): entry is { parent: typeof entry.parent; sku: TrailSku } => Boolean(entry.sku));

  return (
    <>
      <Head
        title={component.name}
        sub={`${component.item} · ${component.group}${
          component.is_resource ? '' : ` · ${component.family}`
        } · unit ${component.uom}`}
        badge={
          component.is_resource ? (
            <TrailPill>conversion resource</TrailPill>
          ) : component.short_strict > 0 ? (
            <TrailPill tone="critical" glyph="▲">must buy</TrailPill>
          ) : (
            <TrailPill tone="good" glyph="✓">covered</TrailPill>
          )
        }
        onClose={() => onFocus(null)}
      />
      <CardContent className="space-y-5 p-4">
        <Chain
          steps={[
            {
              label: 'Required',
              value: `${n1(component.reqd)} ${component.uom}`,
              note: `for ${component.used_in} SKU${component.used_in === 1 ? '' : 's'} in the gap`,
            },
            {
              label: 'On hand',
              value: component.is_resource ? '—' : n0(component.onhand),
              note: component.min_level > 0 ? `min level ${n0(component.min_level)}` : 'no min level set',
            },
            {
              label: 'Live PO',
              value: component.is_resource ? '—' : n0(component.po_live),
              note: component.po_eta ? `earliest ETA ${onDate(component.po_eta)}` : 'nothing inbound',
            },
            {
              label: 'Dead PO',
              value: component.is_resource ? '—' : n0(component.po_stale),
              note: component.stale_pos
                ? `${component.stale_pos} PO past 30 d — not counted as supply`
                : 'none',
            },
            {
              label: 'Shortfall',
              value: component.is_resource ? '—' : n1(component.short_strict),
              note:
                component.lead_avg == null
                  ? 'no receipt history'
                  : `lead ${n1(component.lead_avg)} d (worst ${n1(component.lead_max)} d)`,
            },
          ]}
        />

        {action && (
          <div className="flex gap-2.5 rounded-lg border border-l-4 border-l-destructive p-3">
            <div>
              <p className="text-[13px] font-semibold">
                Raise a PO for {n1(action.short)} {action.uom} — about {inr(action.value)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last vendor {action.vendor ?? 'not on record'}.{' '}
                {action.lead_avg == null
                  ? 'No receipt history, so no order-by date can be measured.'
                  : `Average lead time ${n1(action.lead_avg)} days, worst observed ${n1(
                      action.lead_max,
                    )}.`}{' '}
                {action.order_by &&
                  (action.urgency === 'CRITICAL'
                    ? `It had to be ordered by ${onDate(action.order_by)} — expedite rather than schedule.`
                    : `Order by ${onDate(action.order_by)} to be on time.`)}
              </p>
            </div>
          </div>
        )}

        {make && (
          <section className="rounded-lg border p-3">
            <h3 className="text-[13px] font-semibold">Make instead of buy</h3>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <dt className="text-[11px] text-muted-foreground">Buy (last price)</dt>
                <dd className="text-sm font-semibold tabular-nums">₹{make.buy_price.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Make from {make.sub_name}</dt>
                <dd className="text-sm font-semibold tabular-nums">₹{make.make_cost.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Difference per unit</dt>
                <dd
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    make.saving_per_unit > 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-destructive',
                  )}
                >
                  {make.saving_per_unit > 0 ? 'saves ' : 'costs '}₹
                  {Math.abs(make.saving_per_unit).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Input stock</dt>
                <dd className="text-sm font-semibold tabular-nums">{n0(make.sub_onhand)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Route: {make.inputs.map((i) => `${n1(i.per_unit)} × ${i.name}`).join(' + ')}.
              Verdict on price alone: <b>{make.verdict}</b>. {data.notes}
            </p>
          </section>
        )}

        <section>
          <h3 className="text-[13px] font-semibold">Which SKUs pull this component</h3>
          <div className="mt-2 max-h-72 overflow-auto rounded-md border">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2.5 py-1.5 text-left font-semibold">SKU</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Must produce</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Per unit</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Pulls</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Earliest due</th>
                </tr>
              </thead>
              <tbody>
                {parents.map(({ parent, sku }) => (
                  <tr
                    key={sku.item}
                    onClick={() => onFocus({ kind: 'sku', item: sku.item })}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-2.5 py-1.5">
                      <span className="block font-medium">{sku.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{sku.item}</span>
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{n0(sku.to_produce)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">
                      {parent.per_unit.toFixed(4)}
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{n1(parent.reqd)}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">
                      {onDate(parent.earliest_due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </CardContent>
    </>
  );
}
