import { Droplets, Info } from 'lucide-react';

import { REASON_HINTS, type ReturnsPalette } from '../constants';
import type { ReturnsReasonRow } from '../types';
import { exactQty, percent } from '../utils/format';
import { ReturnsPanel } from './ReturnsPanel';

interface ReasonBreakdownProps {
  rows: ReturnsReasonRow[];
  palette: ReturnsPalette;
}

/**
 * Why it came back — including the one the database does not store.
 *
 * `GoodsReturnItem.condition` is a four-way choice with no LEAKED member, so a
 * leaking carton is filed as DAMAGED and the word "leaked" survives only in the
 * free text the clerk typed. This panel reads that text. It is therefore an
 * ESTIMATE, and the panel says so in its own subtitle rather than in a comment
 * nobody on the returns desk will read.
 *
 * One hue for every bar, not seven. These are magnitudes being compared against
 * each other, and the bucket names are already on the axis — seven hues would be
 * decoration that a colour-blind reader has to decode to learn nothing new.
 * Ranking is the encoding; length is the measure.
 */
export function ReasonBreakdown({ rows, palette }: ReasonBreakdownProps) {
  // Zero buckets are dropped here rather than server-side: the API sends all nine
  // in a fixed order so this panel can decide, and a window where nothing leaked
  // should not show an empty "Leakage" rail implying the category is missing.
  const present = rows.filter((row) => row.quantity > 0 || row.lines > 0);
  const ranked = [...present].sort((a, b) => b.quantity - a.quantity);
  const peak = ranked[0]?.quantity ?? 0;
  const unspecified = rows.find((row) => row.reason === 'UNSPECIFIED');

  return (
    <ReturnsPanel
      title="Why it came back"
      subtitle="Read from the reason the clerk typed — an estimate, not a stored field"
      icon={Droplets}
      accent="sky"
      aside={
        <span
          className="flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground"
          title="Leakage has no tick-box on the returning-items screen. It is counted here by matching words like 'leak', 'spill' and 'seepage' in the free-text reason, so a line nobody wrote a reason on cannot be counted at all."
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
          How this is counted
        </span>
      }
    >
      {ranked.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No returning lines in this window.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {ranked.map((row) => {
            const width = peak > 0 ? Math.max(1.5, (row.quantity * 100) / peak) : 0;
            const faded = row.reason === 'UNSPECIFIED' || row.reason === 'OTHER';
            return (
              <li
                key={row.reason}
                className="group/row rounded-md px-1 py-0.5 transition-colors duration-150 hover:bg-background/70"
                title={REASON_HINTS[row.reason]}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-semibold">{exactQty(row.quantity)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {percent(row.share)}
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted/70">
                  <div
                    className="h-full rounded-full transition-all duration-200 group-hover/row:brightness-110"
                    style={{
                      width: `${width}%`,
                      backgroundColor: palette.reason,
                      // The two buckets that mean "we don't know" are drawn back so
                      // they cannot out-shout a bucket that says something.
                      opacity: faded ? 0.4 : 1,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {unspecified && unspecified.lines > 0 && (
        <p className="mt-4 rounded-md border border-dashed border-border/70 bg-background/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">{unspecified.lines}</strong> line
          {unspecified.lines === 1 ? ' has' : 's have'} no reason written on them at all
          {peak > 0 && <> ({percent(unspecified.share)} of everything that came back)</>}. Those
          can never be attributed, however this panel is read.
        </p>
      )}
    </ReturnsPanel>
  );
}
