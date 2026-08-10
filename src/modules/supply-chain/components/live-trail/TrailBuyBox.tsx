/** Buy or make — the two answers to a shortage, side by side.
 *
 * The buy list is the action; the make table is the question nobody asks. SAP
 * already knows that some purchased items carry their own bill of materials,
 * which means there is an in-house route and a price to compare against. It has
 * simply never been looked at.
 */
import { cn } from '@/shared/utils';

import type { LiveTrail } from '../../types';
import { inr, n0, n1, onDate } from './trail-format';
import { TrailPill } from './TrailPill';

export function TrailBuyBox({
  data,
  onOpenComponent,
}: {
  data: LiveTrail;
  onOpenComponent: (item: string) => void;
}) {
  return (
    <div className="space-y-4">
      {data.actions.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing to buy. Every exploded component is covered by stock plus credible open
          purchase orders.
        </p>
      ) : (
        <ul className="divide-y">
          {data.actions.slice(0, 6).map((action) => (
            <li key={action.item}>
              <button
                type="button"
                onClick={() => onOpenComponent(action.item)}
                className="w-full rounded-md py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{action.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {action.item} · {action.group}
                    </p>
                  </div>
                  {action.urgency === 'CRITICAL' ? (
                    <TrailPill tone="critical" glyph="▲">
                      CRITICAL
                    </TrailPill>
                  ) : (
                    <TrailPill tone="warn" glyph="●">
                      PLAN
                    </TrailPill>
                  )}
                </div>

                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
                  <Fact label="Short">
                    {n1(action.short)} {action.uom}
                  </Fact>
                  <Fact label="Est. spend">{inr(action.value)}</Fact>
                  <Fact label="Lead time">
                    {action.lead_avg == null ? 'no history' : `${n1(action.lead_avg)} d`}
                  </Fact>
                  <Fact label="Needed by">{onDate(action.need_by)}</Fact>
                </dl>

                <p className="mt-1.5 text-xs text-muted-foreground">
                  Last vendor: {action.vendor ?? 'not on record'}
                  {action.can_make && ' · in-house route exists'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data.actions.length > 6 && (
        <p className="text-xs text-muted-foreground">
          Showing the 6 largest of {data.actions.length} buys. The full list is in the
          Procurement tab.
        </p>
      )}

      <div className="border-t pt-4">
        <h3 className="text-[13px] font-semibold">If not buy — can we make it?</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Purchased items that carry their own bill of materials in SAP.
        </p>

        {data.makevsbuy.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No purchased item on this trail has a sub-BOM, so there is no in-house route to
            compare.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-[12.5px]">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2 text-left font-semibold">Item</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Buy ₹</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Make ₹</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Δ / unit</th>
                  <th className="py-1.5 pl-2 text-left font-semibold">Call</th>
                </tr>
              </thead>
              <tbody>
                {data.makevsbuy.map((row) => (
                  <tr
                    key={row.item}
                    onClick={() => onOpenComponent(row.item)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2 pr-2">
                      <span className="block font-medium">{row.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        from {row.sub_name} × {n1(row.sub_per_unit)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.buy_price.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.make_cost.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        'px-2 py-2 text-right tabular-nums',
                        row.saving_per_unit > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-destructive',
                      )}
                    >
                      {row.saving_per_unit > 0 ? '−' : '+'}
                      {Math.abs(row.saving_per_unit).toFixed(2)}
                    </td>
                    <td className="py-2 pl-2">
                      {row.verdict === 'MAKE' ? (
                        <TrailPill tone="good" glyph="✓">
                          MAKE
                        </TrailPill>
                      ) : (
                        <TrailPill glyph="·">BUY</TrailPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">{data.notes}</p>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

/** Kept next to the buy box because it answers the same question from the other
 *  end: the buy list assumes the gap is real, and this is the demand that never
 *  made it into the gap at all. */
export function UnresolvedDemandPanel({ data }: { data: LiveTrail }) {
  if (data.unresolved_demand.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <h3 className="text-[13px] font-semibold">
        {n0(data.summary.unplannable_skus)} items could not be matched to anything the factory
        makes
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {n0(data.summary.unplannable_lines)} order lines worth{' '}
        {inr(data.summary.unplannable_value)}. Oil and Mart number their items independently,
        so a code alone is not proof — these are shown in full and left out of the production
        gap rather than counted as covered.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-[12.5px]">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-1.5 pr-2 text-left font-semibold">Item</th>
              <th className="px-2 py-1.5 text-right font-semibold">Lines</th>
              <th className="px-2 py-1.5 text-right font-semibold">Units</th>
              <th className="px-2 py-1.5 text-right font-semibold">Value</th>
              <th className="py-1.5 pl-2 text-left font-semibold">Why</th>
            </tr>
          </thead>
          <tbody>
            {data.unresolved_demand.slice(0, 12).map((row) => (
              <tr key={`${row.company}-${row.item}`} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  <span className="block font-medium">{row.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {row.item} · {row.label}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{n0(row.lines)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{n0(row.units)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{inr(row.value)}</td>
                <td className="py-2 pl-2 text-xs text-muted-foreground">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.unresolved_demand.length > 12 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing 12 of {data.unresolved_demand.length}.
        </p>
      )}
    </div>
  );
}
