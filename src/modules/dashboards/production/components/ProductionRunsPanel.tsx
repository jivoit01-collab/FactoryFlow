import { Factory } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { useAutoScroll } from '../../dispatch/hooks';
import { count } from '../../dispatch/utils/format';
import { AUTO_SCROLL_FROM } from '../constants/production-wall.constants';
import type { ProductionRunRow } from '../hooks';

/**
 * What is on the lines, biggest run first.
 *
 * The bar behind each row is drawn against the biggest run rather than the
 * day's total, because from across a room the useful question is "which line is
 * carrying the day", and shares of a total all look alike past five rows.
 *
 * A running line's figure is its live segment output, so it climbs through the
 * shift; a finished one shows its closing figure. The chip is the difference
 * between the two, and it is the first thing the eye should find.
 */
export function ProductionRunsPanel({
  runs,
  isLoading,
  isToday,
  unitNoun,
  className,
}: {
  runs: ProductionRunRow[];
  isLoading: boolean;
  isToday: boolean;
  unitNoun: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const palette = useWallPalette();
  const listRef = useRef<HTMLUListElement>(null);
  useAutoScroll(listRef, runs.length >= AUTO_SCROLL_FROM);

  const rows = [...runs].sort((a, b) => b.cases - a.cases);
  const max = Math.max(...rows.map((row) => row.cases), 1);
  const running = rows.filter((row) => row.tone.isLive).length;

  return (
    <BoardPanel
      title={isToday ? 'Lines today' : 'Lines that day'}
      icon={Factory}
      hex={palette.hue('runs')}
      className={className}
      flush
      aside={
        <>
          <PanelBadge>{count(rows.length)} runs</PanelBadge>
          {running > 0 && <PanelBadge tone="good">{count(running)} running</PanelBadge>}
        </>
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty>
          {isLoading ? 'Reading the run register…' : 'No production run was opened on this day.'}
        </PanelEmpty>
      ) : (
        <ul
          ref={listRef}
          className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/5"
        >
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => navigate(`/production/execution/runs/${row.id}`)}
                className="relative flex w-full items-center gap-3 overflow-hidden px-4 py-2.5 text-left transition-colors hover:bg-black/[0.035] focus:outline-none focus-visible:bg-black/[0.05] dark:hover:bg-white/[0.05] dark:focus-visible:bg-white/[0.07]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500"
                  style={{
                    width: `${(row.cases / max) * 100}%`,
                    backgroundColor: palette.hue('runs'),
                    opacity: 0.12,
                  }}
                />

                <span className="relative z-10 min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-foreground">{row.line}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                      {count(row.cases)}{' '}
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {unitNoun}s
                      </span>
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-muted-foreground/80" title={row.product}>
                      {row.product}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      run #{row.runNumber}
                    </span>
                  </span>
                </span>

                <span
                  className={cn(
                    'relative z-10 flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    row.tone.cls,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', row.tone.dot)} />
                  {row.tone.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </BoardPanel>
  );
}
