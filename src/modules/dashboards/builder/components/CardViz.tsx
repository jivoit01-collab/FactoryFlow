import { OpsMeter, OpsPair } from '../../logistics-control/components';
import type { CardViz as CardVizShape } from '../types';

/**
 * Every shape a card can be, drawn.
 *
 * THIS SWITCH IS THE WHOLE CONTRACT
 * The point of the builder is that adding the twentieth card is a backend
 * change and nothing else. That holds exactly as long as this file knows
 * every shape — so the set is closed, it mirrors `board_builder/viz.py`, and
 * the server refuses a card returning anything outside it before it reaches a
 * screen. Adding a shape is a deliberate two-file change, made once, after
 * which every future card can use it.
 *
 * WHY SHARES ARE COMPUTED HERE AND VALUES ARRIVE RAW
 * A card returns real quantities — hours, minutes, counts — and this file
 * turns them into bar widths. The alternative, a card sending percentages,
 * was rejected: a percentage is a share OF something, and a card computing
 * its own would be free to pick a different denominator from its neighbour.
 * One scale per visualisation, decided in one place, is what stops two bars
 * on a wall being comparable-looking and not comparable.
 *
 * WHY IT REUSES `OpsMeter` AND `OpsPair` BUT NOT `OpsMatrix`
 * The first two are general — a composition bar and two bars on one scale.
 * `OpsMatrix` is the freight funnel with its stage names and day bands baked
 * in, so a generic matrix draws its own markup here using the same CSS. The
 * hues and tints come from the shared stylesheet either way, which is the
 * part that actually has to match.
 */

/** A value as a share of the largest in its set, 0-100. */
function shareOf(value: number, largest: number): number {
  return largest > 0 ? (value / largest) * 100 : 0;
}

/** One decimal where the fraction carries meaning, none where it does not. */
function compact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 100) return Math.round(value).toLocaleString('en-IN');
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export interface CardVizProps {
  viz: CardVizShape;
}

export function CardViz({ viz }: CardVizProps) {
  switch (viz.kind) {
    case 'none':
      return null;

    case 'meter': {
      const total = viz.segments.reduce((sum, segment) => sum + segment.value, 0);
      return (
        <OpsMeter
          segments={viz.segments.map((segment) => ({
            fill: segment.fill,
            pct: total > 0 ? (segment.value / total) * 100 : 0,
            label: segment.label,
            figure: compact(segment.value),
          }))}
        />
      );
    }

    case 'pair': {
      const largest = Math.max(...viz.rows.map((row) => row.value), 0);
      return (
        <OpsPair
          rows={viz.rows.map((row) => ({
            label: row.label,
            figure: compact(row.value),
            pct: shareOf(row.value, largest),
            fill: row.fill,
          }))}
          note={viz.note ? { fill: 'mute', label: viz.note } : undefined}
        />
      );
    }

    case 'bars': {
      /*
       * Not `OpsBars`, and the reason is one line of its behaviour: it draws
       * the LAST column as today. That is right for a seven-day window and
       * wrong for every other window a card might send — a weekday median has
       * a "today" in the middle, and labelling Sunday as today on a wall is
       * the kind of quiet error nobody reports. The payload carries `current`
       * per column instead, and this honours it. Same classes, same CSS, same
       * look.
       */
      const largest = Math.max(...viz.days.map((day) => day.value), 0);
      return (
        <div>
          <div className="ops-bars">
            {viz.days.map((day, index) => (
              <div key={`${day.label}-${index}`} className={day.current ? 'ops-now' : undefined}>
                {day.value > 0 && <em className="ops-bval">{compact(day.value)}</em>}
                <i
                  style={{
                    // The 2% floor keeps a small-but-real column visible, and
                    // must not apply to a column of nothing: a stub with no
                    // figure over it reads as a tiny amount rather than none.
                    height:
                      day.value > 0
                        ? `${Math.max(2, Math.min(100, shareOf(day.value, largest)))}%`
                        : '0%',
                    animationDelay: `${0.02 + index * 0.06}s`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="ops-blab">
            {viz.days.map((day, index) => (
              <span
                key={`${day.label}-label-${index}`}
                className={day.current ? 'ops-now' : undefined}
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case 'split':
      return (
        <div className="cbx-split">
          {viz.parts.map((part) => (
            <div key={part.label}>
              <b>{part.value}</b>
              <em>{part.label}</em>
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className="cbx-table-wrap">
          <table className="cbx-table">
            <thead>
              <tr>
                {viz.columns.map((column, index) => (
                  <th key={column} style={{ textAlign: viz.aligns[index] ?? 'left' }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viz.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    /* `title` because the cell is clipped to one line by CSS
                       and a line name out of SAP is routinely longer than the
                       column it has to fit. */
                    <td
                      key={cellIndex}
                      title={cell}
                      style={{ textAlign: viz.aligns[cellIndex] ?? 'left' }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'matrix':
      return (
        <div className="cbx-table-wrap">
          <table className="cbx-table cbx-matrix">
            <thead>
              <tr>
                <th />
                {viz.columns.map((column) => (
                  <th key={column} style={{ textAlign: 'right' }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viz.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell, index) => (
                    /* A null cell is a rule, not a zero. The boards' one hard
                       rule, applied one cell at a time. */
                    <td key={index} style={{ textAlign: 'right' }}>
                      {cell === null ? <span className="cbx-nil">—</span> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {viz.caption && <p className="cbx-caption">{viz.caption}</p>}
        </div>
      );

    default: {
      /*
       * Unreachable while the union and the server agree. Written as an
       * exhaustiveness check rather than left off, so ADDING a shape to the
       * union without teaching this switch about it fails the typecheck
       * instead of rendering a blank tile on a wall.
       */
      const exhaustive: never = viz;
      void exhaustive;
      return null;
    }
  }
}
