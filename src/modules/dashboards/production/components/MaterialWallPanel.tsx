import { Layers } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { useAutoScroll } from '../../dispatch/hooks';
import { compact, count } from '../../dispatch/utils/format';
import { AUTO_SCROLL_FROM, reconTone } from '../constants/production-wall.constants';
import type { MaterialSlice } from '../hooks';

/**
 * Material (BOM), three quantities deep: what the BOM says the day should have
 * used, what the app issued, and what SAP issued.
 *
 * The should-use figure is the one that makes this panel worth a slot on the
 * wall. App-vs-SAP only catches a posting that never happened; should-vs-issued
 * catches the drum that walked out of the store.
 */
export function MaterialWallPanel({
  slice,
  className,
}: {
  slice: MaterialSlice;
  className?: string;
}) {
  const palette = useWallPalette();
  const listRef = useRef<HTMLUListElement>(null);
  useAutoScroll(listRef, slice.rows.length >= AUTO_SCROLL_FROM);

  const verdict = reconTone(slice.status);
  const hex = palette.hue('material');

  const rows = [...slice.rows].sort(
    (a, b) => Math.abs(b.difference) - Math.abs(a.difference) || b.app_issued - a.app_issued,
  );

  return (
    <BoardPanel
      title="Material · BOM"
      icon={Layers}
      hex={hex}
      className={className}
      flush
      aside={
        slice.isError ? (
          <PanelBadge tone="bad">SAP down</PanelBadge>
        ) : (
          <>
            <PanelBadge>{count(rows.length)} items</PanelBadge>
            <PanelBadge tone={verdict.tone}>{verdict.label}</PanelBadge>
          </>
        )
      }
    >
      {slice.isError ? (
        <PanelEmpty>
          SAP could not be reached for the issued side, so nothing here can be compared.
        </PanelEmpty>
      ) : rows.length === 0 ? (
        <PanelEmpty>
          {slice.isLoading ? 'Reading the BOM against SAP…' : 'No BOM material moved on this day.'}
        </PanelEmpty>
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-3 gap-px border-y border-black/[0.06] bg-black/[0.04] text-center dark:border-white/5 dark:bg-white/[0.04]">
            <Total label="Should use" value={compact(slice.should)} />
            <Total label="App issued" value={compact(slice.app)} />
            <Total
              label="SAP issued"
              value={compact(slice.sap)}
              tone={slice.status === 'MATCHED' ? 'good' : 'bad'}
            />
          </div>

          <ul
            ref={listRef}
            className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/5"
          >
            {rows.map((row, index) => {
              const tone = reconTone(row.status);
              // Against the BOM, not against SAP: this is the number that says
              // whether the floor used what the recipe called for.
              const overUse = row.should_use > 0 ? row.app_issued - row.should_use : null;
              return (
                <li
                  key={`${row.item_code}-${index}`}
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
                        {compact(row.app_issued)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-baseline gap-2 text-[11px] tabular-nums text-muted-foreground/80">
                      <span className="truncate">
                        should {compact(row.should_use)} · SAP {compact(row.sap_issued)}
                      </span>
                      {overUse != null && Math.abs(overUse) > 0 && (
                        <span
                          className={cn(
                            'shrink-0 font-semibold',
                            overUse > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400',
                          )}
                        >
                          {overUse > 0 ? '+' : ''}
                          {compact(overUse)} vs BOM
                        </span>
                      )}
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
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <div className="px-2 py-1.5">
      <div
        className={cn(
          'text-base font-bold leading-none tabular-nums',
          tone === 'good'
            ? 'text-emerald-700 dark:text-emerald-300'
            : tone === 'bad'
              ? 'text-rose-700 dark:text-rose-300'
              : 'text-foreground',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
