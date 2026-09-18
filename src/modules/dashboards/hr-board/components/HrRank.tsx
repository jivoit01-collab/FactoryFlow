import { cn } from '@/shared/utils';

import type { HrCapped, HrCount } from '../types';

export interface HrRankProps {
  rows: HrCount[];
  /** Everything below the cut, summed. Rendered as a final greyed row. */
  rest?: { count: number; groups: number };
  /**
   * What the bars are a share OF.
   *
   * The largest row by default, which is what makes the shape readable at
   * wall distance — against a grand total, a list of 40 departments would be
   * forty slivers. Pass a total only where the tile genuinely asks "what share
   * of everyone", not "which is biggest".
   */
  basis?: number;
  className?: string;
}

/**
 * A ranked list of names against their counts.
 *
 * WHY THIS AND NOT A BAR CHART
 * The board's other tiles answer "how much"; this one answers "which ones, in
 * order". A vertical bar chart of eight departments at wall distance is eight
 * labels rotated or truncated into illegibility — the exact anti-pattern where
 * a chart is chosen for the data's shape rather than for the question. A list
 * gives every name its full size and carries the magnitude in a tint BEHIND the
 * text, so the ranking is still visible in peripheral vision without a single
 * label being shrunk to fit.
 *
 * The tint is a share of the LARGEST row, not of the total, so the top row
 * always fills and the rest are read against it.
 *
 * Identity is never colour here: every row is named in full, and the one tint
 * carries magnitude alone. Nothing on this list needs a legend.
 */
export function HrRank({ rows, rest, basis, className }: HrRankProps) {
  const top = basis ?? Math.max(...rows.map((row) => row.count), 0);

  return (
    <ul className={cn('hr-rank', className)}>
      {rows.map((row) => (
        <li
          key={row.label}
          style={{
            // Guarded against the zero denominator an empty day produces: a
            // `NaN%` stop is dropped by the browser and the row silently paints
            // as if it were the largest.
            ['--hr-share' as string]: `${top > 0 ? Math.round((row.count / top) * 100) : 0}%`,
          }}
        >
          <em title={row.label}>{row.label}</em>
          <b>{row.count.toLocaleString('en-IN')}</b>
        </li>
      ))}

      {/* Present rather than dropped, so the rows still add up to the headline
          above them. Greyed because the colour system reserves grey for the
          part that isn't there, and this is precisely the part not shown. */}
      {rest && rest.count > 0 && (
        <li className="hr-rest">
          <em>
            {rest.groups} more
          </em>
          <b>{rest.count.toLocaleString('en-IN')}</b>
        </li>
      )}
    </ul>
  );
}

/** `HrRank` straight from the API's capped shape. */
export function HrCappedRank({ data, basis }: { data: HrCapped; basis?: number }) {
  return (
    <HrRank
      rows={data.rows}
      rest={{ count: data.other, groups: data.other_count }}
      basis={basis}
    />
  );
}
