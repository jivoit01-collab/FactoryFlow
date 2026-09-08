import {
  Boxes,
  Database,
  Factory,
  IndianRupee,
  Scale,
  TriangleAlert,
  TruckIcon,
} from 'lucide-react';

import { ACCENTS, KpiStat } from '@/shared/components/dashboard';
import { Badge } from '@/shared/components/ui';

import type { PmDemandMeta, PmDemandSummary } from '../types';
import { formatInrCompact, formatPct } from '../utils';

interface PmDemandHeadlineProps {
  summary?: PmDemandSummary;
  meta?: PmDemandMeta;
  isLoading?: boolean;
}

const qtyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/**
 * The six figures that answer the board at a glance.
 *
 * Six and not eight: scrap folds into the variance tile's sub-line and stock
 * into the shortage tile's, because both are only ever read *against* the
 * number above them. Eight tiles across a 1536px screen left each one under
 * 180px wide -- narrower than the figures they had to hold.
 *
 * Accents carry meaning rather than decoration. The variance and shortage
 * tiles turn amber and rose only when there is something to act on, so a
 * healthy month reads as a calm board rather than a wall of colour.
 */
export function PmDemandHeadline({ summary, meta, isLoading }: PmDemandHeadlineProps) {
  // Skeletons only on the first load. A refetch keeps the old figures on
  // screen, because blanking a board somebody is reading to show six grey
  // boxes is worse than a number that is a few seconds stale.
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const s = summary;
  const approved = meta?.consumption_basis === 'approved';
  const shortItems = (s?.pm_items_critical_cover ?? 0) + (s?.pm_items_low_cover ?? 0);
  const overConsuming = (s?.pm_variance_value ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiStat
          icon={Factory}
          label="Finished goods produced"
          value={s ? qtyFormatter.format(s.fg_produced_qty) : '--'}
          sub={
            meta
              ? `pcs · ${
                  meta.source === 'app'
                    ? 'run records'
                    : meta.fg_warehouses.join(', ') || 'no warehouse'
                }`
              : undefined
          }
          accent={ACCENTS.slate}
          delayMs={0}
        />
        <KpiStat
          icon={TruckIcon}
          label="Finished goods dispatched"
          value={s ? qtyFormatter.format(s.fg_dispatched_qty) : '--'}
          // Over 100% is not an error: the period shipped stock made earlier.
          sub={
            s?.dispatch_ratio_pct != null
              ? `pcs · ${s.dispatch_ratio_pct.toFixed(0)}% of what was made`
              : 'pcs'
          }
          accent={ACCENTS.teal}
          delayMs={60}
        />
        <KpiStat
          icon={IndianRupee}
          label={approved ? 'Packing material approved' : 'Packing material consumed'}
          value={s ? formatInrCompact(s.pm_consumed_value) : '--'}
          sub={s ? `${s.pm_items} items` : undefined}
          accent={ACCENTS.indigo}
          delayMs={120}
        />
        <KpiStat
          icon={Boxes}
          label="Shipped inside finished goods"
          value={s ? formatInrCompact(s.pm_dispatched_value) : '--'}
          sub={s ? `${formatInrCompact(s.pm_retained_value)} still in FG stock` : undefined}
          accent={ACCENTS.cyan}
          delayMs={180}
        />
        <KpiStat
          icon={Scale}
          label="Against recipe"
          value={s ? formatInrCompact(s.pm_variance_value) : '--'}
          sub={
            s
              ? `${formatPct(s.pm_variance_pct)} vs BOM · ${formatInrCompact(
                  s.pm_wastage_value,
                )} scrapped`
              : undefined
          }
          accent={overConsuming ? ACCENTS.amber : ACCENTS.emerald}
          delayMs={240}
        />
        <KpiStat
          icon={TriangleAlert}
          label="Running short"
          value={s ? `${shortItems} items` : '--'}
          sub={
            s
              ? `${s.pm_items_critical_cover} inside ${
                  meta?.cover_critical_days ?? 7
                } days · ${formatInrCompact(s.pm_stock_value)} on hand`
              : undefined
          }
          accent={
            (s?.pm_items_critical_cover ?? 0) > 0
              ? ACCENTS.rose
              : shortItems > 0
                ? ACCENTS.amber
                : ACCENTS.emerald
          }
          delayMs={300}
        />
      </div>

      {summary && meta && <ScopeNote summary={summary} meta={meta} />}
      {meta && <SourceNotes meta={meta} />}
    </div>
  );
}

/**
 * Where the numbers came from, and what that source cannot tell you.
 *
 * Only rendered for app data. On SAP the single note says nothing a reader
 * does not already assume, and a banner that is always up gets ignored --
 * which would waste the one place app mode's real limits are stated.
 */
function SourceNotes({ meta }: { meta: PmDemandMeta }) {
  if (meta.source !== 'app' || meta.source_notes.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-amber-300/70 bg-amber-50/50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/5">
      <div className="mb-1.5 flex items-center gap-2">
        <Database className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          Showing FactoryFlow&rsquo;s own records, not SAP
        </span>
      </div>
      <ul className="ml-5 list-disc space-y-0.5 text-xs text-amber-900/80 dark:text-amber-200/70">
        {meta.source_notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * What the figures above actually counted.
 *
 * Every one of these is a place this board could be silently wrong -- the
 * warehouse it read consumption from, whether group-company trucks counted,
 * how much of the finished goods had a recipe to explode. Stating them costs
 * one line and makes the numbers quotable.
 */
function ScopeNote({ summary, meta }: { summary: PmDemandSummary; meta: PmDemandMeta }) {
  const coverage = meta.production_bom_coverage;
  const coverageShort = coverage.qty_covered_pct < 99.5;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
      <Badge variant="outline" className="font-mono text-[10px]">
        {meta.pm_item_group_name || `Item group ${meta.pm_item_group}`}
      </Badge>

      {/* Where the consumption figure comes from. On app data it is not a
          warehouse movement at all, so naming BH-PC would be wrong. */}
      {meta.source === 'sap' ? (
        <span>
          Consumption read as goods issue from{' '}
          <span className="font-medium text-foreground">
            {meta.consumption_warehouses.join(', ') || 'no warehouse configured'}
          </span>
        </span>
      ) : (
        <span>
          Read from <span className="font-medium text-foreground">approved BOM requests</span>, not
          a warehouse movement
        </span>
      )}

      <Sep />

      {/* Intercompany and returns are SAP-only facts: the gate records a truck
          leaving, not who was invoiced. */}
      {meta.source === 'sap' && (
        <>
          <span>
            Group-company sales{' '}
            <span className="font-medium text-foreground">
              {meta.include_intercompany ? 'counted' : 'excluded'}
            </span>{' '}
            ({qtyFormatter.format(summary.fg_dispatched_intercompany_qty)} of{' '}
            {qtyFormatter.format(summary.fg_dispatched_all_qty)} pcs)
          </span>

          {summary.fg_returns_qty > 0 && (
            <>
              <Sep />
              <span>Net of {qtyFormatter.format(summary.fg_returns_qty)} pcs returned</span>
            </>
          )}

          <Sep />
        </>
      )}

      <span className={coverageShort ? 'font-medium text-amber-600 dark:text-amber-500' : ''}>
        {coverage.qty_covered_pct.toFixed(1)}% of production had a BOM to explode
        {coverageShort && coverage.fg_items_without_bom.length > 0 && (
          <> ({coverage.fg_items_without_bom.length} items without one)</>
        )}
      </span>

      <Sep />

      <span>
        Cover over{' '}
        <span className="font-medium text-foreground">{meta.period_working_days} working days</span>
        , stock from{' '}
        <span className="font-medium text-foreground">
          {meta.stock_warehouses.join(', ') || 'no warehouse configured'}
        </span>
      </span>

      {meta.ranked_by === 'quantity' && (
        <>
          <Sep />
          <span className="font-medium text-amber-600 dark:text-amber-500">
            Ranked by quantity — no prices on the item master
          </span>
        </>
      )}

      {summary.fg_produced_qty > 0 && (
        <>
          <Sep />
          <span>
            {/* Packaging cost carried by one finished piece -- the figure a
                costing conversation actually starts from. */}
            &#8377;{(summary.pm_consumed_value / summary.fg_produced_qty).toFixed(2)} of packaging
            per finished piece
          </span>
        </>
      )}
    </div>
  );
}

function Sep() {
  return <span className="text-muted-foreground/40">·</span>;
}
