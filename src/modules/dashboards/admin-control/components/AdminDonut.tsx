import { useState } from 'react';

import { ADMIN_COST_COLOURS } from '../constants';
import type { AdminCostSlice } from '../types';
import { money, num, pctRough, whole } from '../utils';

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
   * One line under the legend, for what belongs to the whole donut rather than
   * to any single line of it.
   *
   * Today it carries the month's average per day — the only thing on the tile
   * that gives the per-line "today" figures a scale. It lives under the legend
   * rather than in a corner badge because a badge over a tall visualisation
   * does not fit: see the height budget on `.adm-corner` in
   * `styles/admin-board.css`, which is the measurement that settled it.
   */
  foot?: string;
  /**
   * That the tile opens, and what is behind it.
   *
   * In words rather than only in a cursor: this board hangs on a wall where
   * nobody is hovering anything, so `data-drill`'s pointer and hover lift are
   * invisible until someone already suspects the tile is clickable.
   */
  openHint?: string;
}

/**
 * What this line cost today, as the legend prints it — or nothing.
 *
 * Three cases, and the middle one is why this is a function rather than a
 * template string:
 *
 *  - Money today: the figure, which is the whole point.
 *  - Nil today on a line that HAS a month behind it: the server's own reason,
 *    because "nothing today" is a claim about the factory and the truth is
 *    usually a claim about the register. Electricity at ₹0 means nobody has
 *    entered today's meter reading — the plant did not stop drawing power —
 *    and a tile that printed "nothing today" there would be stating something
 *    false in order to fill a line.
 *  - Nil today on a line that is nil all month: nothing. Its share column
 *    already says "no rate" or "nil", and a second nil under it adds nothing.
 */
function todayLabel(slice: AdminCostSlice): string | null {
  const today = num(slice.today);
  if (today === null) return null;
  if (today > 0) return `${money(today)}${todayCount(slice)} today`;
  if (slice.amount <= 0) return null;
  return slice.today_detail ?? 'nothing today';
}

/**
 * The count beside today's money — " · 55 in", " · 13,204 units" — or nothing.
 *
 * The unit word comes from the payload rather than from the slice's key: what
 * a line counts is the line's own business, and a unit guessed here would be a
 * second place that meaning is decided. Empty on a line that counts nothing,
 * which is why this returns a fragment to concatenate rather than a value the
 * caller has to test.
 */
function todayCount(slice: AdminCostSlice): string {
  const count = num(slice.today_detail_value);
  if (count === null || count <= 0 || !slice.today_detail_unit) return '';
  return ` · ${whole(count)} ${slice.today_detail_unit}`;
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
export function AdminDonut({ slices, total, period, foot, openHint }: AdminDonutProps) {
  /*
   * Which line the pointer is over — an arc or its legend row, either way.
   *
   * EMPHASIS ONLY. Nothing appears on hover that is not already on the tile:
   * every slice is direct-labelled in the legend with its own figure and share,
   * and the hole keeps the total and the window whatever the pointer is doing.
   * That is deliberate on two counts. A figure only reachable by hovering is
   * unreachable on the wall screen this board also runs on, where there is no
   * pointer at all; and a hole that swapped the month's total for whichever
   * slice the mouse grazed would make the tile's headline flicker.
   *
   * So this pairs an arc with its row and gets out of the way. Hover is the
   * one thing it may safely do, because it is the one thing that carries no
   * information.
   */
  const [hovered, setHovered] = useState<string | null>(null);

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
      <div className="adm-donut" data-hover={hovered ? '1' : undefined}>
        <svg viewBox="0 0 128 128" role="img" aria-label={`Factory cost ${period}: ${description}.`}>
          {/* The track carries the whole, so a donut of one small slice still
              reads as a small share of something rather than as a full ring. */}
          <circle cx="64" cy="64" r={RADIUS} className="adm-track" strokeWidth="17" />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              className="adm-arc"
              data-on={hovered === arc.key ? '1' : undefined}
              cx="64"
              cy="64"
              r={RADIUS}
              stroke={arc.colour}
              /* The hovered arc thickens ABOUT ITS OWN CENTRE LINE, which is
                 why the width is the only thing that moves. `strokeDasharray`
                 is a length along the r=54 path and never recomputed, so the
                 arc's angular extent — the share it is claiming — is identical
                 hovered or not. An effect that grew the radius, or nudged the
                 slice outward, would change what the picture asserts. */
              strokeWidth="17"
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
              onMouseEnter={() => setHovered(arc.key)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="adm-hole">
          <b>{money(total)}</b>
          <em>{period}</em>
        </div>
      </div>

      <div className="adm-legend" data-hover={hovered ? '1' : undefined}>
        {slices.map((slice) => {
          const nil = slice.amount <= 0;
          const today = todayLabel(slice);
          // Whether `today` is a figure or the reason there isn't one, which
          // decides where the line's unit count goes.
          const spentToday = (num(slice.today) ?? 0) > 0;
          return (
            <div
              key={slice.key}
              className={nil ? 'adm-lrow adm-zero' : 'adm-lrow'}
              data-on={hovered === slice.key ? '1' : undefined}
              /* A NIL LINE DOES NOT RESPOND. It has no arc, so pairing it with
                 one would point at nothing while dimming the three that are
                 really there — the same rule that keeps it off the ring in the
                 first place. Its row still reads normally; it simply is not a
                 handle. */
              onMouseEnter={nil ? undefined : () => setHovered(slice.key)}
              onMouseLeave={nil ? undefined : () => setHovered(null)}
              style={{ '--lc': ADMIN_COST_COLOURS[slice.key] } as React.CSSProperties}
              // The reason a line is nil, or the reason it differs from the
              // same line elsewhere, belongs where the line is rather than in a
              // footnote — this is the tooltip for anyone who walks up to it.
              // Today's unit count rides along where the row is printing
              // today's MONEY: "13,204 units today" is what makes that money
              // checkable by eye. Where today is nil the row is already
              // printing that same sentence, so it is not repeated here.
              title={
                [spentToday ? slice.today_detail : null, slice.warning, slice.basis]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
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
              {/* The count behind the money, and today's money, under the
                  row rather than beside it: a rupee figure is not checkable by
                  eye, and "629 across 4 of 5 departments" is the thing a reader
                  can argue with. Spans the row so the four money columns above
                  stay aligned, with today's figure right-aligned under the
                  month's — which is the comparison it is there to invite.

                  TODAY IS PRINTED ONLY WHERE IT MEANS SOMETHING. A nil line
                  already says "no rate" or "nil" in its share column, and "₹0
                  today" underneath would spend a line repeating it. A line with
                  a month behind it and nothing today is the opposite — worth
                  saying out loud, because on electricity it usually means
                  today's meter reading has not been entered rather than that
                  the plant drew no power. */}
              {(slice.detail || today) && (
                <small className="adm-ldet">
                  {slice.detail && <u>{slice.detail}</u>}
                  {today && <b>{today}</b>}
                </small>
              )}
            </div>
          );
        })}

        {foot && (
          <div className="ops-mkey adm-foot">
            <span className="ops-k-mute">{foot}</span>
          </div>
        )}

        {openHint && <p className="adm-open-hint">{openHint}</p>}
      </div>
    </div>
  );
}
