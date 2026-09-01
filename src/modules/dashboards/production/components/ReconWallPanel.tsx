import type { LucideIcon } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components';
import { useWallPalette, type WallHueKey } from '../../dispatch/constants/wall.palette';
import { useAutoScroll } from '../../dispatch/hooks';
import { compact, count } from '../../dispatch/utils/format';
import { AUTO_SCROLL_FROM, reconTone } from '../constants/production-wall.constants';
import type { ReconSlice } from '../hooks';
import { formatLitres } from '../utils/litres';

export interface ReconWallPanelProps {
  title: string;
  icon: LucideIcon;
  hue: WallHueKey;
  slice: ReconSlice;
  /** What the app side is called on this panel — "Produced", "Wasted". */
  appLabel: string;
  /** What one unit is — cases for FG, units for scrap. */
  unitNoun: string;
  /** Draw the litres line under each SKU. Only FG carries a volume worth showing. */
  showLitres?: boolean;
  /** What the panel says when the app recorded nothing at all. */
  emptyText: string;
  className?: string;
}

/**
 * One reconciliation, as a wall list: what the app recorded, what SAP holds and
 * how far apart they are, worst gap first.
 *
 * Ranked by the size of the disagreement rather than by output, because a wall
 * exists to surface the row somebody has to act on. A day where everything
 * matches has nothing worth ranking, and reads as a wall of green chips.
 *
 * A SAP outage empties this panel and says so. It must never fall back to
 * showing the app side alone under a heading that promises a comparison — a
 * lone "produced" column with no SAP beside it reads as "SAP agrees".
 */
export function ReconWallPanel({
  title,
  icon,
  hue,
  slice,
  appLabel,
  unitNoun,
  showLitres = false,
  emptyText,
  className,
}: ReconWallPanelProps) {
  const palette = useWallPalette();
  const listRef = useRef<HTMLUListElement>(null);
  useAutoScroll(listRef, slice.rows.length >= AUTO_SCROLL_FROM);

  const verdict = reconTone(slice.status);
  const hex = palette.hue(hue);

  // Worst gap first; ties broken by the bigger quantity, so a busy SKU beats an
  // idle one when both agree.
  const rows = slice.rows
    .map((row, index) => ({ row, litres: slice.litres.perRow[index] ?? null }))
    .sort((a, b) => {
      const gap = Math.abs(b.row.difference) - Math.abs(a.row.difference);
      return gap !== 0 ? gap : b.row.app_qty - a.row.app_qty;
    });

  return (
    <BoardPanel
      title={title}
      icon={icon}
      hex={hex}
      className={className}
      flush
      aside={
        slice.isError ? (
          <PanelBadge tone="bad">SAP down</PanelBadge>
        ) : (
          <>
            {/* Live output is not part of the comparison — a run that has not
                closed has nothing for SAP to have received yet — so it is called
                out here rather than folded into the produced total. */}
            {slice.inProgress > 0 && (
              <PanelBadge tone="good">+{compact(slice.inProgress)} live</PanelBadge>
            )}
            <PanelBadge>{count(rows.length)} SKUs</PanelBadge>
            <PanelBadge tone={verdict.tone}>{verdict.label}</PanelBadge>
          </>
        )
      }
    >
      {slice.isError ? (
        <PanelEmpty>
          SAP could not be reached, so there is nothing to reconcile against. The app side is on the
          tiles above.
        </PanelEmpty>
      ) : rows.length === 0 ? (
        <PanelEmpty>{slice.isLoading ? 'Reconciling against SAP…' : emptyText}</PanelEmpty>
      ) : (
        <>
          {/* The panel's own totals, so a creeping list is never the only place
              the headline figures exist. */}
          <div className="grid shrink-0 grid-cols-3 gap-px border-y border-black/[0.06] bg-black/[0.04] text-center dark:border-white/5 dark:bg-white/[0.04]">
            <Total label={appLabel} value={count(slice.produced)} unit={unitNoun} />
            <Total label="SAP" value={count(slice.sap)} unit={unitNoun} />
            <Total
              label="Difference"
              value={`${slice.difference > 0 ? '+' : ''}${count(slice.difference)}`}
              unit={`${slice.differencePct.toFixed(1)}%`}
              tone={
                slice.status === 'MATCHED'
                  ? 'good'
                  : slice.status === 'PENDING_SYNC'
                    ? 'warn'
                    : 'bad'
              }
            />
          </div>

          <ul
            ref={listRef}
            className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/5"
          >
            {rows.map(({ row, litres }, index) => {
              const tone = reconTone(row.status);
              return (
                <li
                  key={`${row.sku}-${row.item_code}-${index}`}
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className="truncate text-sm font-semibold text-foreground"
                        title={row.sku}
                      >
                        {row.sku}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                        {compact(row.app_qty)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px] tabular-nums text-muted-foreground/80">
                      <span className="truncate">
                        SAP {compact(row.sap_qty)}
                        {showLitres && (
                          <>
                            {' · '}
                            {formatLitres(litres == null ? null : litres * (row.app_qty || 0))}
                          </>
                        )}
                        {(row.in_progress ?? 0) > 0 && (
                          <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            +{compact(row.in_progress ?? 0)} live
                          </span>
                        )}
                      </span>
                    </span>
                  </span>

                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      tone.tone === 'good'
                        ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300'
                        : tone.tone === 'warn'
                          ? 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                          : 'border-rose-600/30 bg-rose-500/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300',
                    )}
                  >
                    {tone.tone === 'good'
                      ? 'match'
                      : `${row.difference > 0 ? '+' : ''}${compact(row.difference)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </BoardPanel>
  );
}

function Total({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className="px-2 py-1.5">
      <div
        className={cn(
          'text-base font-bold leading-none tabular-nums',
          tone === 'good'
            ? 'text-emerald-700 dark:text-emerald-300'
            : tone === 'warn'
              ? 'text-amber-700 dark:text-amber-300'
              : tone === 'bad'
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-foreground',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label} · {unit}
      </div>
    </div>
  );
}
