import { ADMIN_COST_COLOURS } from '../constants';
import type { AdminCostSlice } from '../types';
import { money, pctRough } from '../utils';

/** Geometry. The radius and stroke are in the SVG's own 128-unit box. */
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The gap between two segments, in the same units.
 *
 * A surface-coloured gap rather than a stroke: adjacent arcs of similar
 * lightness read as one arc without it, and a border would change each
 * segment's apparent size. Three units is about two pixels at the size this
 * renders.
 */
const GAP = 3;

export interface AdminDonutProps {
  slices: AdminCostSlice[];
  total: number;
  /** The window, printed in the hole under the total. */
  period: string;
  /**
   * A caveat printed under the legend.
   *
   * The electricity line counts the mains as well as the sub-meters that
   * measure the same supply, so it knowingly runs about 3x the metered bill.
   * That is a deliberate, recorded decision rather than a fault — but a reader
   * comparing this donut with an electricity bill has to be told.
   */
  note?: string;
}

/**
 * The month's spend, as four cost lines.
 *
 * WHY A DONUT AND NOT A BAR
 * The question is "what share of the bill is each of these", the parts are
 * mutually exclusive, they sum to a meaningful whole, and there are four of
 * them. That is the one shape a donut answers better than a bar — and the hole
 * earns its place by carrying the total, which a pie cannot.
 *
 * WHY A NIL SLICE IS NOT DRAWN BUT IS STILL LISTED
 * A cost line with no rate configured contributes no arc — a zero-width arc is
 * invisible and would quietly reduce the donut to the lines that happen to be
 * configured. It keeps its legend row instead, greyed, with the reason in place
 * of a share. So the reader sees four cost lines and which two of them nobody
 * has sourced, rather than a confident two-slice donut that looks complete.
 *
 * COLOUR IS NEVER THE ONLY ENCODING HERE
 * Every slice carries its name and its own figure in the legend. That is what
 * makes the validated palette's tightest pair legal: two hues a tritan reader
 * separates weakly are still told apart by the words beside them.
 */
export function AdminDonut({ slices, total, period, note }: AdminDonutProps) {
  const drawn = slices.filter((slice) => slice.amount > 0);

  // Offsets accumulate around the ring in the same fixed order as the legend,
  // so a slice keeps its position as well as its hue when a neighbour changes.
  let offset = 0;
  const arcs = drawn.map((slice) => {
    const length = total > 0 ? (slice.amount / total) * CIRCUMFERENCE : 0;
    const arc = {
      key: slice.key,
      colour: ADMIN_COST_COLOURS[slice.key] ?? 'var(--d2)',
      // The gap is taken off the arc, never added between them, so the ring
      // still adds up to the whole and no share is overstated.
      dash: `${Math.max(length - GAP, 0)} ${CIRCUMFERENCE - Math.max(length - GAP, 0)}`,
      offset: -offset,
      label: slice.label,
    };
    offset += length;
    return arc;
  });

  const description = drawn.length
    ? drawn.map((slice) => `${slice.label} ${money(slice.amount)}`).join(', ')
    : 'no cost line has a configured source';

  return (
    <div className="adm-donut-wrap">
      <div className="adm-donut">
        <svg viewBox="0 0 128 128" role="img" aria-label={`Factory cost ${period}: ${description}.`}>
          {/* The track carries the whole, so a donut of one small slice still
              reads as a small share of something rather than as a full ring. */}
          <circle cx="64" cy="64" r={RADIUS} className="adm-track" strokeWidth="17" />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="64"
              cy="64"
              r={RADIUS}
              stroke={arc.colour}
              strokeWidth="17"
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
            />
          ))}
        </svg>
        <div className="adm-hole">
          <b>{money(total)}</b>
          <em>{period}</em>
        </div>
      </div>

      <div className="adm-legend">
        {slices.map((slice) => {
          const nil = slice.amount <= 0;
          return (
            <div
              key={slice.key}
              className={nil ? 'adm-lrow adm-zero' : 'adm-lrow'}
              style={{ '--lc': ADMIN_COST_COLOURS[slice.key] } as React.CSSProperties}
              // The reason a line is nil, or the reason it differs from the
              // same line elsewhere, belongs where the line is rather than in a
              // footnote — this is the tooltip for anyone who walks up to it.
              title={[slice.warning, slice.basis].filter(Boolean).join(' ') || undefined}
            >
              <i className="adm-sw" />
              <em>{slice.label}</em>
              <strong>{money(slice.amount)}</strong>
              <span>
                {nil
                  ? slice.warning
                    ? 'no rate'
                    : 'nil'
                  : pctRough(slice.share_pct)}
              </span>
              {/* The count behind the money, under it rather than beside it:
                  a rupee figure is not checkable by eye, and "1,045 gated in"
                  is the thing a reader can argue with. Spans the row so the
                  four money columns stay aligned. */}
              {slice.detail && <small className="adm-ldet">{slice.detail}</small>}
            </div>
          );
        })}

        {note && (
          <div className="ops-mkey adm-foot">
            <span className="ops-k-mute">{note}</span>
          </div>
        )}
      </div>
    </div>
  );
}
