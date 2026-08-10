/** Where every open order stands, biggest gap first.
 *
 * One stacked bar per SKU, each segment a part of that SKU's own demand: what
 * ships from the shelf, what a work order already covers, and what is left to
 * make. Bars share a single scale (the largest demand on the chart), so a long
 * bar means a big order and not merely a big shortfall — comparing SKUs is the
 * whole point of putting them in one chart.
 *
 * The gap is direct-labelled on every row, so the ranking survives greyscale,
 * colour-vision deficiency and a screenshot.
 */
import { cn } from '@/shared/utils';

import type { TrailSku } from '../../types';
import { n0,TRAIL_SERIES } from './trail-format';
import { TrailLegend } from './TrailPill';

const MAX_ROWS = 18;

export function TrailCover({
  skus,
  selected,
  onSelect,
}: {
  skus: TrailSku[];
  selected?: string;
  onSelect: (item: string) => void;
}) {
  const gap = skus.filter((s) => s.to_produce > 0);
  const rows = gap.slice(0, MAX_ROWS);
  const scale = Math.max(...rows.map((s) => s.demand), 1);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing to produce — every SKU on the order book is covered by stock and work in
        progress.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <TrailLegend />

      <div className="space-y-2">
        {rows.map((sku) => {
          const width = (value: number) => `${(value / scale) * 100}%`;
          const segments = [
            { key: 'stock', value: sku.from_stock, color: TRAIL_SERIES[0].color },
            { key: 'wip', value: sku.from_wip, color: TRAIL_SERIES[1].color },
            { key: 'produce', value: sku.to_produce, color: TRAIL_SERIES[2].color },
          ].filter((segment) => segment.value > 0);

          return (
            <button
              key={sku.item}
              type="button"
              onClick={() => onSelect(sku.item)}
              className={cn(
                'grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-3 rounded-md',
                'px-1.5 py-1 text-left transition-colors hover:bg-muted/60 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]',
                selected === sku.item && 'bg-muted ring-1 ring-inset ring-border',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{sku.name}</span>
                <span className="block truncate text-[10.5px] text-muted-foreground">
                  {sku.item} · {sku.variety} · {sku.orders} order{sku.orders === 1 ? '' : 's'}
                </span>
              </span>

              {/* 2px surface gaps between segments keep adjacent fills readable
                  without a border, which would add a fourth colour. */}
              <span className="flex h-3.5 gap-[2px] overflow-hidden rounded-[4px] bg-muted">
                {segments.map((segment, index) => (
                  <i
                    key={segment.key}
                    aria-hidden
                    title={`${sku.name} — ${
                      TRAIL_SERIES.find((s) => s.key === segment.key)?.label
                    }: ${n0(segment.value)} ${sku.uom}`}
                    className={cn(
                      'block h-full',
                      index === 0 && 'rounded-l-[4px]',
                      index === segments.length - 1 && 'rounded-r-[4px]',
                    )}
                    style={{ width: width(segment.value), background: segment.color }}
                  />
                ))}
              </span>

              <span className="hidden min-w-[6rem] text-right text-[11.5px] tabular-nums text-muted-foreground sm:block">
                {n0(sku.to_produce)} short
              </span>
            </button>
          );
        })}
      </div>

      {gap.length > rows.length && (
        <p className="text-xs text-muted-foreground">
          Showing the {rows.length} largest of {gap.length} SKUs with a gap. The rest are in
          the SKU table below.
        </p>
      )}
    </div>
  );
}
