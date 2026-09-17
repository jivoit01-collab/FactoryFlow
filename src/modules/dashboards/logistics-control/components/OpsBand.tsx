import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import type { WorkforceStrip } from '../types';
import { OpsPeople } from './OpsPeople';

/**
 * The bands this vocabulary knows how to paint.
 *
 * The first three are the Logistics board's; the last four are the Plant
 * board's. They live in one list because the hue is the band's identity across
 * the whole product — two boards inventing their own teal would be two teals.
 */
export type OpsDomain =
  | 'warehouse'
  | 'dispatch'
  | 'transport'
  | 'purchase'
  | 'store'
  | 'production'
  | 'shifting';

const DOMAIN_CLASS: Record<OpsDomain, string> = {
  warehouse: 'ops-b-warehouse',
  dispatch: 'ops-b-dispatch',
  transport: 'ops-b-transport',
  purchase: 'ops-b-purchase',
  store: 'ops-b-store',
  production: 'ops-b-production',
  shifting: 'ops-b-shifting',
};

export interface OpsBandProps {
  domain: OpsDomain;
  /** The vertical label on the rail. */
  title: string;
  /** The quieter half of the rail label — a warehouse code, a company pair. */
  scope?: string;
  /**
   * Relative widths of the tiles. Defaults to four equal columns.
   *
   * Equal by default because the bands are read DOWN as well as across: the
   * rail and the people strip are fixed widths, so identical tile columns make
   * the second tile of every band start on the same vertical line. Weighted
   * templates gave each band its own rhythm and the board lost that grid.
   *
   * Pass one only where a band genuinely needs it — and note the units must be
   * `minmax(0, …)` rather than bare `fr` if the tile holds anything that will
   * not wrap, or its content widens the column and the row stops being even.
   */
  columns?: string;
  children: ReactNode;
  people?: WorkforceStrip;
  /** Replaces the tiles when the reader may not see this band. */
  unavailable?: string;
}

/**
 * One domain of the board: a coloured rail, its tiles, and who is on shift.
 *
 * The rail carries the band's hue at full strength and is the only place the
 * domain is named, so the tiles inside are free to stay white and let their
 * figures do the work. Every tint inside the band derives from the same hue —
 * composition is always the domain colour at different weights, never a second
 * palette — which is what lets a reader bind a bar to its section from across a
 * room.
 */
/**
 * Four equal tiles.
 *
 * `minmax(0, 1fr)` rather than `1fr`: a bare `fr` is a MINIMUM of `auto`, so a
 * tile holding something that cannot wrap — a matrix of figures, a long vendor
 * name — pushes its own column wider and takes the width off its neighbours.
 * The zero floor makes the columns equal whatever is inside them.
 */
const EQUAL_COLUMNS = 'repeat(4, minmax(0, 1fr))';

export function OpsBand({
  domain,
  title,
  scope,
  columns = EQUAL_COLUMNS,
  children,
  people,
  unavailable,
}: OpsBandProps) {
  return (
    <section className={cn('ops-band', DOMAIN_CLASS[domain])}>
      <div className="ops-rail">
        <p>
          {title} {scope && <em>{scope}</em>}
        </p>
      </div>

      {unavailable ? (
        <div className="ops-groups" style={{ gridTemplateColumns: '1fr' }}>
          <div className="ops-grp" style={{ gridTemplateRows: 'auto' }}>
            <p className="ops-note">{unavailable}</p>
          </div>
        </div>
      ) : (
        <div className="ops-groups" style={{ gridTemplateColumns: columns }}>
          {children}
        </div>
      )}

      {people ? (
        <OpsPeople strip={people} />
      ) : (
        <div className="ops-people">
          <p className="ops-note">Team figures need factory expense access.</p>
        </div>
      )}
    </section>
  );
}
