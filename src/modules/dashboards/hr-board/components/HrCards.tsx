import { cn } from '@/shared/utils';

import { HR_CARD_LIMIT } from '../constants';
import type { HrCapped, HrCount } from '../types';

export interface HrCardsProps {
  /** Ranked rows, largest first — the order the API already sends them in. */
  rows: HrCount[];
  /** Everything the API itself cut, summed. Folded into the tail line. */
  rest?: { count: number; groups: number };
  /**
   * What a card's bar is a share OF.
   *
   * The largest row by default, which is what makes the shape readable at wall
   * distance — against a grand total, forty departments would be forty empty
   * tracks. Pass a total only where the tile genuinely asks "what share of
   * everyone", not "which is biggest".
   */
  basis?: number;
  /** Cards across. One makes a full-width summary card rather than a column. */
  columns?: number;
  /** Cards before the fold. Rows past it join the tail rather than vanish. */
  limit?: number;
  className?: string;
}

/**
 * A ranked group of names as CARDS, not as rows of a table.
 *
 * WHY CARDS AND NOT A LIST
 * A name against a number, repeated eight times down a tile, is a table — and a
 * table is the one shape a wall board cannot use. It has no scan order at four
 * metres (every line weighs the same), it puts the number last on the line
 * where the eye arrives at it only after reading a word it did not need, and it
 * reads as the raw query behind the board rather than as the board.
 *
 * A card gives each group its own surface, promotes the FIGURE to the size the
 * tile's own headline uses, and demotes the name to a caption above it. The eye
 * lands on numbers first and reaches for a name only once one of them is worth
 * asking about — which is the order somebody walking past actually reads in.
 *
 * WHERE THE MAGNITUDE LIVES
 * In a bar along the card's foot, filled as a share of the largest card, in the
 * band's own mid hue. That is the one place on the card no text sits, so the
 * ranking stays visible in peripheral vision without shrinking a single label.
 * One card alone gets no bar: a track filled to 100% because it is the only
 * thing there states nothing, and a mark that carries no information is noise.
 *
 * Identity is never colour here — every card is named in full and the one hue
 * carries magnitude alone, so nothing on this grid needs a legend.
 */
export function HrCards({ rows, rest, basis, columns = 2, limit, className }: HrCardsProps) {
  const cap = limit ?? HR_CARD_LIMIT;

  const shown = rows.slice(0, cap);
  const cut = rows.slice(cap);

  // Rows past the fold join whatever the API already folded, rather than being
  // dropped: the cards plus the tail still have to add up to the figure above
  // them, and a breakdown that sums to less than its own headline is read as a
  // broken breakdown rather than as a shortened one.
  const restCount = (rest?.count ?? 0) + cut.reduce((sum, row) => sum + row.count, 0);
  const restGroups = (rest?.groups ?? 0) + cut.length;

  const top = basis ?? Math.max(...rows.map((row) => row.count), 0);

  return (
    <div className={cn('hr-cards', className)}>
      <ul className="hr-cards__grid" style={{ ['--hr-cols' as string]: String(columns) }}>
        {shown.map((row) => (
          <li
            key={row.label}
            style={{
              // Guarded against the zero denominator an empty day produces: a
              // `NaN%` stop is dropped by the browser, and a dropped stop
              // paints the bar as if this card were the largest there is.
              ['--hr-share' as string]: `${top > 0 ? Math.round((row.count / top) * 100) : 0}%`,
            }}
          >
            <em title={row.label}>{row.label}</em>
            <b>{row.count.toLocaleString('en-IN')}</b>
            {shown.length > 1 && <i aria-hidden="true" />}
          </li>
        ))}
      </ul>

      {/* Greyed and off the grid, because the colour system reserves grey for
          the part that isn't there — and this is precisely the part the tile is
          not showing. A line rather than a card: it names no group, so giving
          it a card's surface would offer the eye a group to read. */}
      {restGroups > 0 && restCount > 0 && (
        <p className="hr-cards__rest">
          <em>{restGroups} more</em>
          <b>{restCount.toLocaleString('en-IN')}</b>
        </p>
      )}
    </div>
  );
}

/** `HrCards` straight from the API's capped shape. */
export function HrCappedCards({
  data,
  basis,
  columns,
  limit,
}: {
  data: HrCapped;
  basis?: number;
  columns?: number;
  limit?: number;
}) {
  return (
    <HrCards
      rows={data.rows}
      rest={{ count: data.other, groups: data.other_count }}
      basis={basis}
      columns={columns}
      limit={limit}
    />
  );
}
